import { describe, expect, it } from "vitest";
import { passwordProblem } from "./password";

describe("passwordProblem", () => {
  it("accepts a password that follows every rule", () => {
    expect(passwordProblem("Tr3e!br1dges")).toBeNull(); // 12 chars
  });

  it("rejects passwords shorter than 12 characters", () => {
    expect(passwordProblem("a1!bcdefg")).toMatch(/at least 12/);
    expect(passwordProblem("Exa1!mple1")).toMatch(/at least 12/);
    expect(passwordProblem("Tr3e!br1dges")).toBeNull(); // 12 chars — passes
  });

  it("needs at least one number", () => {
    expect(passwordProblem("Hello!worldx")).toMatch(/number/);
  });

  it("needs at least one special character", () => {
    expect(passwordProblem("Helloworld5x")).toMatch(/special/);
  });

  it("does not allow a number to be used twice", () => {
    expect(passwordProblem("Hi!4tea4youx")).toMatch(/more than once/);
  });

  it("does not allow numbers in sequence, going up or down", () => {
    expect(passwordProblem("Hi!4cat65x90yz")).toMatch(/sequence/); // 6→5, 9→0 are sequences
    expect(passwordProblem("Hi!9cat87xy32z")).toMatch(/sequence/); // 9→8, 3→2 are sequences
    expect(passwordProblem("Hi!1cat7x9z3")).toBeNull();
  });

  it("rejects a password over 200 characters", () => {
    expect(passwordProblem(`a1!${"b".repeat(198)}`)).toMatch(/200/);
  });
});
