const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("=== User Authentication Debug ===");

    // Check if there are any users
    const users = await prisma.user.findMany();
    console.log("Users in database:", users.length);
    users.forEach((user) => {
      console.log(`- ID: ${user.id}, Role: ${user.role}, Name: ${user.name}`);
    });

    // Check accounts (OAuth providers)
    const accounts = await prisma.account.findMany();
    console.log("OAuth accounts:", accounts.length);

    // Check sessions
    const sessions = await prisma.session.findMany();
    console.log("Active sessions:", sessions.length);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
