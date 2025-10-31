import { z } from "zod";

// Read raw env first to support conditional defaults
const RAW = {
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  HUMAS_USERNAME: process.env.HUMAS_USERNAME,
  HUMAS_PASSWORD: process.env.HUMAS_PASSWORD,
  HUMAS_PASSWORD_HASH: process.env.HUMAS_PASSWORD_HASH,
  DISTRIBUSI_USERNAME: process.env.DISTRIBUSI_USERNAME,
  DISTRIBUSI_PASSWORD: process.env.DISTRIBUSI_PASSWORD,
  DISTRIBUSI_PASSWORD_HASH: process.env.DISTRIBUSI_PASSWORD_HASH,
  // Optional: Redis for rate limiting (recommended for production)
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
};

const isProd = RAW.NODE_ENV === "production";
// During `next build`, NODE_ENV is set to production even for local dev builds.
// Allow safe dev defaults when building to avoid failing at import-time schema parsing.
const isBuild =
  process.env.npm_lifecycle_event === "build" || process.env.SKIP_ENV_VALIDATION === "1";

// Apply safe dev defaults only in non-production
const devDefault = {
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: "dev_secret_change_in_production_min32chars",
  HUMAS_USERNAME: "humas",
  HUMAS_PASSWORD: "humas123",
  // HUMAS_PASSWORD_HASH: undefined, // No hash for dev
  DISTRIBUSI_USERNAME: "distribusi",
  DISTRIBUSI_PASSWORD: "distribusi123",
  // DISTRIBUSI_PASSWORD_HASH: undefined, // No hash for dev
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
  HUMAS_PASSWORD_HASH: RAW.HUMAS_PASSWORD_HASH, // No fallback, use what's in .env only
  DISTRIBUSI_USERNAME:
    RAW.DISTRIBUSI_USERNAME || (!isProd || isBuild ? devDefault.DISTRIBUSI_USERNAME : undefined),
  DISTRIBUSI_PASSWORD:
    RAW.DISTRIBUSI_PASSWORD || (!isProd || isBuild ? devDefault.DISTRIBUSI_PASSWORD : undefined),
  DISTRIBUSI_PASSWORD_HASH: RAW.DISTRIBUSI_PASSWORD_HASH, // No fallback, use what's in .env only
};

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters for security"),
  DATABASE_URL: z.string().min(1),
  HUMAS_USERNAME: z.string().min(1),
  HUMAS_PASSWORD: z.string().min(6).optional(),
  HUMAS_PASSWORD_HASH: z.string().min(20).optional(),
  DISTRIBUSI_USERNAME: z.string().min(1),
  DISTRIBUSI_PASSWORD: z.string().min(6).optional(),
  DISTRIBUSI_PASSWORD_HASH: z.string().min(20).optional(),
  // Optional Redis config
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export const env: AppEnv = EnvSchema.parse(withDefaults);
