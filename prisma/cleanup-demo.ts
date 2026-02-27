import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function cleanup() {
  const demoUsers = await p.user.findMany({
    where: { email: { startsWith: "demo+" } },
    select: { id: true, email: true },
  });

  const ids = demoUsers.map((u) => u.id);
  console.log(`Found ${ids.length} demo users`);

  if (ids.length > 0) {
    await p.systemLog.deleteMany({ where: { userId: { in: ids } } });
    await p.user.deleteMany({ where: { id: { in: ids } } });
    console.log("Deleted demo users and their system logs");
  }

  // Delete demo quotes (PF-2026-1xx) and related records
  const demoQuotes = await p.quote.findMany({
    where: { quoteNumber: { startsWith: "PF-2026-1" } },
    select: { id: true },
  });
  const qIds = demoQuotes.map((q) => q.id);

  if (qIds.length > 0) {
    await p.job.deleteMany({ where: { quoteId: { in: qIds } } });
    await p.lineItem.deleteMany({ where: { quoteId: { in: qIds } } });
    await p.quote.deleteMany({ where: { id: { in: qIds } } });
    console.log(`Deleted ${qIds.length} demo quotes + line items + jobs`);
  }

  // Delete demo clients
  const deleted = await p.client.deleteMany({
    where: { email: { endsWith: "@example.com" } },
  });
  console.log(`Deleted ${deleted.count} demo clients`);

  console.log("Cleanup complete");
}

cleanup()
  .catch((e) => {
    console.error("Cleanup failed:", e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
