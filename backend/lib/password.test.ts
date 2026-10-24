import { describe, expect, it } from "vitest";
import { passwordProblem } from "./password";

describe("passwordProblem", () => {
  it("accepts a password that follows every rule", () => {
    expect(passwordProblem("Tr3e!bridge")).toBeNull();
  });

  it("needs more than 8 characters", () => {
    expect(passwordProblem("a1!bcdef")).toMatch(/more than 8/);
    expect(passwordProblem("a1!bcdefg")).toBeNull();
  });

  it("needs at least one number", () => {
    expect(passwordProblem("Hello!world")).toMatch(/number/);
  });

  it("needs at least one special character", () => {
    expect(passwordProblem("Helloworld5")).toMatch(/special/);
  });

  it("does not allow a number to be used twice", () => {
    expect(passwordProblem("Hi!4tea4you")).toMatch(/more than once/);
  });

  it("does not allow numbers in sequence, going up or down", () => {
    expect(passwordProblem("Hi!4cat65x")).toMatch(/sequence/);
    expect(passwordProblem("Hi!9cat87x")).toMatch(/sequence/);
    expect(passwordProblem("Hi!1cat7x9")).toBeNull();
  });

  it("rejects a password over 200 characters", () => {
    expect(passwordProblem(`a1!${"b".repeat(198)}`)).toMatch(/200/);
  });
});
