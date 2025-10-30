/**
 * Script untuk generate hashed passwords untuk credentials
 * Jalankan dengan: npx ts-node scripts/generate-hashed-passwords.ts
 */

import * as readline from "readline";

import { hashPassword, generateSecret } from "../src/lib/password";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("=".repeat(60));
  console.log("🔐 Password Hasher untuk SIMADU Tirta Hita");
  console.log("=".repeat(60));
  console.log();

  // Generate NextAuth Secret
  console.log("1. Generating NEXTAUTH_SECRET...");
  const secret = generateSecret(32);
  console.log(`   ✅ NEXTAUTH_SECRET=${secret}`);
  console.log();

  // Hash HUMAS Password
  console.log("2. Hashing HUMAS credentials...");
  const humasUsername = (await question("   Enter HUMAS_USERNAME (default: humas): ")) || "humas";
  const humasPassword =
    (await question("   Enter HUMAS_PASSWORD (default: humas123): ")) || "humas123";
  const humasHashed = await hashPassword(humasPassword);
  console.log(`   ✅ HUMAS_USERNAME=${humasUsername}`);
  console.log(`   ✅ HUMAS_PASSWORD_HASH=${humasHashed}`);
  console.log();

  // Hash DISTRIBUSI Password
  console.log("3. Hashing DISTRIBUSI credentials...");
  const distribusiUsername =
    (await question("   Enter DISTRIBUSI_USERNAME (default: distribusi): ")) || "distribusi";
  const distribusiPassword =
    (await question("   Enter DISTRIBUSI_PASSWORD (default: distribusi123): ")) || "distribusi123";
  const distribusiHashed = await hashPassword(distribusiPassword);
  console.log(`   ✅ DISTRIBUSI_USERNAME=${distribusiUsername}`);
  console.log(`   ✅ DISTRIBUSI_PASSWORD_HASH=${distribusiHashed}`);
  console.log();

  // Print .env template
  console.log("=".repeat(60));
  console.log("📝 Copy these to your .env file:");
  console.log("=".repeat(60));
  console.log();
  console.log("# NextAuth");
  console.log(`NEXTAUTH_SECRET="${secret}"`);
  console.log();
  console.log("# HUMAS Credentials");
  console.log(`HUMAS_USERNAME="${humasUsername}"`);
  console.log(`HUMAS_PASSWORD_HASH="${humasHashed}"`);
  console.log();
  console.log("# DISTRIBUSI Credentials");
  console.log(`DISTRIBUSI_USERNAME="${distribusiUsername}"`);
  console.log(`DISTRIBUSI_PASSWORD_HASH="${distribusiHashed}"`);
  console.log();
  console.log("=".repeat(60));
  console.log("⚠️  IMPORTANT:");
  console.log("   - Remove old HUMAS_PASSWORD and DISTRIBUSI_PASSWORD from .env");
  console.log("   - Use _PASSWORD_HASH versions instead");
  console.log("   - Never commit .env to git!");
  console.log("=".repeat(60));

  rl.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
