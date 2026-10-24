// The rules for a password. The server is the only place they are enforced; the form lists them for the user.
const MIN_LENGTH = 9;
const MAX_LENGTH = 200;

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57;
}

/** Returns the first rule the password breaks, or null when it is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < MIN_LENGTH) return "Password must be more than 8 characters";
  if (password.length > MAX_LENGTH) return "Password must be 200 characters or fewer";
  if (!/[0-9]/.test(password)) return "Password needs at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password needs at least one special character";

  const digits = password.match(/[0-9]/g) ?? [];
  if (new Set(digits).size !== digits.length) return "No number can be used more than once";

  // Two digits next to each other that follow one another, such as 12, 65 or 90.
  for (let i = 1; i < password.length; i++) {
    const prev = password.charCodeAt(i - 1);
    const next = password.charCodeAt(i);
    if (isDigit(prev) && isDigit(next) && Math.abs(prev - next) === 1) {
      return "Numbers cannot run in sequence, such as 123 or 987";
    }
  }
  return null;
}
