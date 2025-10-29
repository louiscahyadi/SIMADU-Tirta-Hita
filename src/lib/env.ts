import { z } from "zod";

// Read raw env first to support conditional defaults
const RAW = {
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  HUMAS_USERNAME: process.env.HUMAS_USERNAME,
  HUMAS_PASSWORD: process.env.HUMAS_PASSWORD,
  DISTRIBUSI_USERNAME: process.env.DISTRIBUSI_USERNAME,
  DISTRIBUSI_PASSWORD: process.env.DISTRIBUSI_PASSWORD,
};

const isProd = RAW.NODE_ENV === "production";
// During `next build`, NODE_ENV is set to production even for local dev builds.
// Allow safe dev defaults when building to avoid failing at import-time schema parsing.
const isBuild =
  process.env.npm_lifecycle_event === "build" || process.env.SKIP_ENV_VALIDATION === "1";

// Apply safe dev defaults only in non-production
const devDefault = {
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: "dev_secret_please_override_1234567890",
  HUMAS_USERNAME: "humas",
  HUMAS_PASSWORD: "humas123",
  DISTRIBUSI_USERNAME: "distribusi",
  DISTRIBUSI_PASSWORD: "distribusi123",
} as const;

const withDefaults = {
  ...RAW,
  // Use dev defaults if not production OR during build phase
  NEXTAUTH_URL: RAW.NEXTAUTH_URL || (!isProd || isBuild ? devDefault.NEXTAUTH_URL : undefined),
  NEXTAUTH_SECRET:
    RAW.NEXTAUTH_SECRET || (!isProd || isBuild ? devDefault.NEXTAUTH_SECRET : undefined),
  HUMAS_USERNAME:
    RAW.HUMAS_USERNAME || (!isProd || isBuild ? devDefault.HUMAS_USERNAME : undefined),
  HUMAS_PASSWORD:
    RAW.HUMAS_PASSWORD || (!isProd || isBuild ? devDefault.HUMAS_PASSWORD : undefined),
  DISTRIBUSI_USERNAME:
    RAW.DISTRIBUSI_USERNAME || (!isProd || isBuild ? devDefault.DISTRIBUSI_USERNAME : undefined),
  DISTRIBUSI_PASSWORD:
    RAW.DISTRIBUSI_PASSWORD || (!isProd || isBuild ? devDefault.DISTRIBUSI_PASSWORD : undefined),
};

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET should be long and random"),
  DATABASE_URL: z.string().min(1),
  HUMAS_USERNAME: z.string().min(1),
  HUMAS_PASSWORD: z.string().min(6),
  DISTRIBUSI_USERNAME: z.string().min(1),
  DISTRIBUSI_PASSWORD: z.string().min(6),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export const env: AppEnv = EnvSchema.parse(withDefaults);
