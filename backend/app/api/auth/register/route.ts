import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";
import { usersCollection } from "@/lib/users";
import { ObjectId } from "mongodb";
import type { UserDoc } from "@/lib/types";

export async function POST(req: NextRequest) {
  if (process.env.ALLOW_SIGNUP !== "true") {
    return NextResponse.json({ error: "Sign-up is disabled" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json({ error: "Password must be 8 to 200 characters" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const user: UserDoc = { _id: new ObjectId(), email, passwordHash, createdAt: new Date() };
    await (await usersCollection()).insertOne(user);
    await createSession(user._id.toHexString());
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    throw err;
  }
}
