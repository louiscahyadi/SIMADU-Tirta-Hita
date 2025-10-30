/**
 * Test setup file
 * Runs before all tests
 */

import { afterAll, beforeAll } from "vitest";

// Mock environment variables for testing
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: "mysql://test:test@localhost:3306/simadu_test",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: "test-secret-minimum-32-characters-long",
  HUMAS_USERNAME: "humas",
  HUMAS_PASSWORD_HASH: "$2a$10$LQ3aGmY8QXZ3X8sVXJZ9.ewKjWvQqGjY9Q7WXJ9nI5Z9XJ9nI5Z9X",
  DISTRIBUSI_USERNAME: "distribusi",
  DISTRIBUSI_PASSWORD_HASH: "$2a$10$LQ3aGmY8QXZ3X8sVXJZ9.ewKjWvQqGjY9Q7WXJ9nI5Z9XJ9nI5Z9X",
});

beforeAll(() => {
  console.log("🧪 Starting tests...");
});

afterAll(() => {
  console.log("✅ Tests completed!");
});
