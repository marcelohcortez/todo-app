import { ObjectId } from "mongodb";

// A minimal in-memory stand-in for the parts of the MongoDB driver this app's lib functions use:
// equality (including on ObjectId and null), $or, $in, $ne, $lt/$lte/$gt/$gte, $regex, plus
// find/findOne/insertOne/updateOne/updateMany/deleteOne/deleteMany/findOneAndUpdate/findOneAndDelete/
// countDocuments/createIndex. Not a real query engine — just enough to exercise this app's own filters.

type Doc = Record<string, unknown>;

function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof ObjectId && b instanceof ObjectId) return a.equals(b);
  if (a instanceof ObjectId) return a.toHexString() === b;
  if (b instanceof ObjectId) return b.toHexString() === a;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return a === b;
}

function matchesValue(docValue: unknown, condition: unknown): boolean {
  if (condition !== null && typeof condition === "object" && !(condition instanceof ObjectId) && !(condition instanceof Date)) {
    const c = condition as Record<string, unknown>;
    if ("$in" in c) return (c.$in as unknown[]).some((v) => sameValue(docValue, v));
    if ("$ne" in c) return !sameValue(docValue, c.$ne);
    if ("$lt" in c && docValue instanceof Date) return docValue.getTime() < (c.$lt as Date).getTime();
    if ("$lte" in c && docValue instanceof Date) return docValue.getTime() <= (c.$lte as Date).getTime();
    if ("$gt" in c && docValue instanceof Date) return docValue.getTime() > (c.$gt as Date).getTime();
    if ("$gte" in c && docValue instanceof Date) return docValue.getTime() >= (c.$gte as Date).getTime();
    if ("$regex" in c) {
      const flags = typeof c.$options === "string" ? c.$options : undefined;
      return new RegExp(c.$regex as string, flags).test(String(docValue ?? ""));
    }
  }
  return sameValue(docValue, condition);
}

function matches(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$or") return (condition as Doc[]).some((sub) => matches(doc, sub));
    if (key === "$and") return (condition as Doc[]).every((sub) => matches(doc, sub));
    return matchesValue(doc[key], condition);
  });
}

function applySet(doc: Doc, update: Doc): Doc {
  const next = { ...doc };
  if (update.$set) Object.assign(next, update.$set as Doc);
  return next;
}

// A shallow copy is enough here: nothing in these tests mutates a nested field in place.
function shallowishClone<T extends Doc>(doc: T): T {
  const next = { ...doc } as Doc;
  return next as T;
}

class FakeCollection<T extends Doc = Doc> {
  constructor(private store: T[]) {}

  async createIndex() {
    return "ok";
  }

  find(filter: Doc = {}) {
    const results = this.store.filter((d) => matches(d, filter)).map(shallowishClone);
    const api = {
      sort(spec: Record<string, 1 | -1>) {
        const [field, dir] = Object.entries(spec)[0] ?? [];
        if (field) {
          results.sort((a, b) => {
            const av = a[field];
            const bv = b[field];
            const an = av instanceof Date ? av.getTime() : av;
            const bn = bv instanceof Date ? bv.getTime() : bv;
            if ((an as number) < (bn as number)) return dir === 1 ? -1 : 1;
            if ((an as number) > (bn as number)) return dir === 1 ? 1 : -1;
            return 0;
          });
        }
        return api;
      },
      skip(n: number) {
        results.splice(0, n);
        return api;
      },
      limit(n: number) {
        results.length = Math.min(results.length, n);
        return api;
      },
      async toArray() {
        return results;
      },
    };
    return api;
  }

  async findOne(filter: Doc = {}) {
    const doc = this.store.find((d) => matches(d, filter));
    return doc ? shallowishClone(doc) : null;
  }

  async countDocuments(filter: Doc = {}) {
    return this.store.filter((d) => matches(d, filter)).length;
  }

  async insertOne(doc: T) {
    this.store.push(doc);
    return { insertedId: doc._id };
  }

  async updateOne(filter: Doc, update: Doc, options: { upsert?: boolean } = {}) {
    const idx = this.store.findIndex((d) => matches(d, filter));
    if (idx === -1) {
      if (options.upsert) {
        const base: Doc = { ...(filter as Doc), ...((update.$setOnInsert as Doc) ?? {}) };
        if (update.$set) Object.assign(base, update.$set as Doc);
        this.store.push(base as T);
        return { matchedCount: 0, upsertedCount: 1 };
      }
      return { matchedCount: 0, upsertedCount: 0 };
    }
    this.store[idx] = applySet(this.store[idx], update) as T;
    return { matchedCount: 1, upsertedCount: 0 };
  }

  async updateMany(filter: Doc, update: Doc) {
    let count = 0;
    this.store.forEach((d, idx) => {
      if (matches(d, filter)) {
        this.store[idx] = applySet(d, update) as T;
        count++;
      }
    });
    return { matchedCount: count };
  }

  async deleteOne(filter: Doc) {
    const idx = this.store.findIndex((d) => matches(d, filter));
    if (idx === -1) return { deletedCount: 0 };
    this.store.splice(idx, 1);
    return { deletedCount: 1 };
  }

  async deleteMany(filter: Doc) {
    const before = this.store.length;
    const kept = this.store.filter((d) => !matches(d, filter));
    const deletedCount = before - kept.length;
    this.store.length = 0;
    this.store.push(...kept);
    return { deletedCount };
  }

  async findOneAndUpdate(filter: Doc, update: Doc, options: { returnDocument?: "after" | "before" } = {}) {
    const idx = this.store.findIndex((d) => matches(d, filter));
    if (idx === -1) return null;
    const before = this.store[idx];
    const after = applySet(before, update) as T;
    this.store[idx] = after;
    return shallowishClone(options.returnDocument === "before" ? before : after);
  }

  async findOneAndDelete(filter: Doc) {
    const idx = this.store.findIndex((d) => matches(d, filter));
    if (idx === -1) return null;
    const [doc] = this.store.splice(idx, 1);
    return shallowishClone(doc);
  }
}

/** A fresh fake database: each named collection is its own in-memory array, persisted for the test's lifetime. */
export function createFakeDb() {
  const collections = new Map<string, Doc[]>();
  function storeFor(name: string): Doc[] {
    let store = collections.get(name);
    if (!store) {
      store = [];
      collections.set(name, store);
    }
    return store;
  }
  return {
    collection<T extends Doc = Doc>(name: string) {
      return new FakeCollection<T>(storeFor(name) as T[]);
    },
    // Lets a test seed a collection directly, bypassing the lib functions under test.
    seed(name: string, docs: Doc[]) {
      storeFor(name).push(...docs);
    },
  };
}

export type FakeDb = ReturnType<typeof createFakeDb>;
