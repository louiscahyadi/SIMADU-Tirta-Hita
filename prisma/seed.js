const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const complaint = await prisma.complaint.create({
    data: {
      customerName: "John Doe",
      address: "Jl. Mawar No. 1",
      complaintText: "Air tidak mengalir",
      category: "Distribusi",
      phone: "08123456789",
      mapsLink: null,
      connectionNumber: null,
    },
  });

  const readBack = await prisma.complaint.findUnique({ where: { id: complaint.id } });
  console.log("Inserted complaint:", complaint);
  console.log("Read back complaint:", readBack);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
