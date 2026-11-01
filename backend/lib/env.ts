/** Validates that all required environment variables are set and valid at startup.
 * Called once by the Next.js dev server and Vercel deployments. */

const REQUIRED = [
  "MONGODB_URI",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "PUSHER_APP_ID",
  "PUSHER_KEY",
  "PUSHER_SECRET",
  "PUSHER_CLUSTER",
];

export function validateEnv(): void {
  const errors: string[] = [];

  for (const key of REQUIRED) {
    if (!process.env[key] || process.env[key]!.trim() === "") {
      errors.push(`${key} is not set`);
    }
  }

  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET!.length < 32) {
    errors.push("AUTH_SECRET must be at least 32 characters long");
  }

  // Validate MONGODB_URI format (basic check)
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI!.startsWith("mongodb+srv://") && !process.env.MONGODB_URI!.startsWith("mongodb://")) {
    errors.push("MONGODB_URI must start with mongodb:// or mongodb+srv://");
  }

  // Validate NEXTAUTH_URL format
  if (process.env.NEXTAUTH_URL && !/^https?:\/\/.+/.test(process.env.NEXTAUTH_URL!)) {
    errors.push("NEXTAUTH_URL must be a valid URL (http:// or https://)");
  }

  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET!.length < 32) {
    errors.push("NEXTAUTH_SECRET must be at least 32 characters long");
  }

  // Validate PUSHER_CLUSTER format
  if (process.env.PUSHER_CLUSTER && !/^[a-z0-9][a-z0-9\-]*$/.test(process.env.PUSHER_CLUSTER!)) {
    errors.push("PUSHER_CLUSTER contains invalid characters");
  }

  if (errors.length > 0) {
    const msg = "Environment validation failed:\n  - " + errors.join("\n  - ");
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    }
    // In development, log warnings but allow startup (for local dev convenience).
    console.warn(msg);
  } else {
    console.log("Environment validation passed.");
  }
}
