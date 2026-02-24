import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { id: "temp-user" },
    update: {},
    create: {
      id: "temp-user",
      email: "temp@printforge.local",
      name: "Printforge",
    },
  });
  console.log("Temp user ensured.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("Seed error:", e);
    prisma.$disconnect();
    process.exit(1);
  });
