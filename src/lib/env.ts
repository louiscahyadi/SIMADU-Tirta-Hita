import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET should be long and random"),
  DATABASE_URL: z.string().min(1),
  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD: z.string().default("admin123"),
  HUMAS_USERNAME: z.string().default("humas"),
  HUMAS_PASSWORD: z.string().default("humas123"),
  DISTRIBUSI_USERNAME: z.string().default("distribusi"),
  DISTRIBUSI_PASSWORD: z.string().default("distribusi123"),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export const env: AppEnv = EnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  HUMAS_USERNAME: process.env.HUMAS_USERNAME,
  HUMAS_PASSWORD: process.env.HUMAS_PASSWORD,
  DISTRIBUSI_USERNAME: process.env.DISTRIBUSI_USERNAME,
  DISTRIBUSI_PASSWORD: process.env.DISTRIBUSI_PASSWORD,
});
