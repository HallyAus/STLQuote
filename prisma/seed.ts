import { PrismaClient, QuoteStatus, JobStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Helpers
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

const DEMO_PREFIX = "demo+";

const DEMO_USERS = [
  { name: "Sarah Chen", email: `${DEMO_PREFIX}sarah@example.com`, daysAgo: 42 },
  { name: "Marcus Williams", email: `${DEMO_PREFIX}marcus@example.com`, daysAgo: 35 },
  { name: "Emily Tanaka", email: `${DEMO_PREFIX}emily@example.com`, daysAgo: 28 },
  { name: "James O'Brien", email: `${DEMO_PREFIX}james@example.com`, daysAgo: 21 },
  { name: "Priya Patel", email: `${DEMO_PREFIX}priya@example.com`, daysAgo: 14 },
  { name: "Tom Fischer", email: `${DEMO_PREFIX}tom@example.com`, daysAgo: 9 },
  { name: "Aiko Suzuki", email: `${DEMO_PREFIX}aiko@example.com`, daysAgo: 5 },
  { name: "Liam Murphy", email: `${DEMO_PREFIX}liam@example.com`, daysAgo: 2 },
];

const QUOTE_DESCRIPTIONS = [
  "Custom phone case — TPU flex",
  "Raspberry Pi enclosure — PETG",
  "Cable management clips (x20)",
  "Replacement gear — Nylon",
  "Desk organiser — PLA+",
  "Plant pot with drainage — PLA",
  "LED light diffuser — translucent PETG",
  "Drone propeller guard — ABS",
  "Tool holder wall mount",
  "Custom cookie cutter set (x5)",
  "Lithophane photo frame",
  "Miniature terrain set",
  "EV charger cable hook",
  "Ute toolbox divider",
  "Replacement washing machine knob",
  "Custom stencil — flexible TPU",
  "Architectural scale model",
  "DIN rail mount — ABS",
  "GoPro mount adapter",
  "Battery holder — PETG",
];

const LOG_MESSAGES: { type: string; level: string; message: string }[] = [
  { type: "auth", level: "info", message: "User logged in successfully" },
  { type: "auth", level: "info", message: "New user registered" },
  { type: "auth", level: "warn", message: "Failed login attempt (invalid password)" },
  { type: "email", level: "info", message: "Quote email sent to client" },
  { type: "email", level: "info", message: "Invoice email sent to client" },
  { type: "email", level: "error", message: "Email delivery failed — SMTP timeout" },
  { type: "billing", level: "info", message: "Subscription activated — Pro Monthly" },
  { type: "billing", level: "info", message: "Payment received — $29.00 AUD" },
  { type: "billing", level: "warn", message: "Payment method expiring soon" },
  { type: "xero_sync", level: "info", message: "Invoice synced to Xero" },
  { type: "xero_sync", level: "error", message: "Xero sync failed — token expired" },
  { type: "auth", level: "info", message: "Password reset requested" },
  { type: "email", level: "info", message: "Newsletter sent — 12 recipients" },
  { type: "billing", level: "info", message: "Trial started — 14 day Scale trial" },
  { type: "auth", level: "info", message: "User disabled by admin" },
  { type: "email", level: "info", message: "Welcome email sent" },
  { type: "billing", level: "info", message: "Subscription cancelled" },
  { type: "auth", level: "info", message: "Admin promoted user to ADMIN" },
  { type: "xero_sync", level: "info", message: "Contact synced to Xero" },
  { type: "error", level: "error", message: "Unhandled API error — 500 Internal Server Error" },
];

const STATUSES: QuoteStatus[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];
const JOB_STATUSES: JobStatus[] = ["QUEUED", "PRINTING", "POST_PROCESSING", "QUALITY_CHECK", "PACKING", "SHIPPED", "COMPLETE"];

async function main() {
  console.log("🌱 Seeding demo data...\n");

  // Check idempotency
  const existingDemo = await prisma.user.count({
    where: { email: { startsWith: DEMO_PREFIX } },
  });
  if (existingDemo > 0) {
    console.log(`⚠️  Found ${existingDemo} demo users already. Skipping seed.`);
    console.log("   To re-seed, delete demo users first (emails starting with 'demo+').");
    return;
  }

  // Find the admin user to link quotes/jobs
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
  });
  if (!adminUser) {
    console.log("❌ No admin user found. Create an admin account first.");
    return;
  }
  console.log(`📎 Linking seed data to admin: ${adminUser.email}\n`);

  // Pre-computed bcrypt hash for "DemoPass123!" (avoids bcryptjs dependency in Docker standalone)
  const passwordHash = "$2a$12$LJ3m4ys3Lk0TSwHCpNkr6.FDHi/a3F6RN0tV9g5MwMo7rLOdmRK2i";

  // 1. Create demo users
  console.log("👤 Creating demo users...");
  const createdUsers = [];
  for (const u of DEMO_USERS) {
    const createdAt = daysAgo(u.daysAgo);
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash,
        emailVerified: createdAt,
        role: "USER",
        subscriptionTier: pick(["free", "free", "pro"]),
        subscriptionStatus: pick(["trialing", "active", "active"]),
        createdAt,
        updatedAt: createdAt,
      },
    });
    createdUsers.push(user);
    console.log(`   ✓ ${u.name} (${u.daysAgo} days ago)`);
  }

  // 2. Create clients for admin user
  console.log("\n🏢 Creating demo clients...");
  const clientNames = [
    { name: "Acme Manufacturing", company: "Acme Mfg Pty Ltd", email: "orders@acme.example.com" },
    { name: "Jane Maker", company: null, email: "jane@example.com" },
    { name: "TradeTech Solutions", company: "TradeTech Solutions", email: "hello@tradetech.example.com" },
    { name: "Mike's Workshop", company: "Mike's Workshop", email: "mike@workshop.example.com" },
    { name: "Coastal Designs", company: "Coastal Designs Co", email: "info@coastal.example.com" },
  ];

  const clients = [];
  for (const c of clientNames) {
    const createdAt = daysAgo(Math.floor(Math.random() * 30) + 5);
    const client = await prisma.client.create({
      data: {
        userId: adminUser.id,
        name: c.name,
        email: c.email,
        company: c.company,
        createdAt,
        updatedAt: createdAt,
      },
    });
    clients.push(client);
    console.log(`   ✓ ${c.name}`);
  }

  // 3. Create quotes spread across 30 days
  console.log("\n📄 Creating demo quotes...");
  const quotes = [];
  const statusWeights = { DRAFT: 5, SENT: 6, ACCEPTED: 12, REJECTED: 4, EXPIRED: 3 };
  const weightedStatuses: string[] = [];
  for (const [status, weight] of Object.entries(statusWeights)) {
    for (let i = 0; i < weight; i++) weightedStatuses.push(status);
  }

  for (let i = 0; i < 30; i++) {
    const day = Math.floor(Math.random() * 30);
    const createdAt = daysAgo(day);
    const status = pick(weightedStatuses) as QuoteStatus;
    const desc = pick(QUOTE_DESCRIPTIONS);
    const quoteNumber = `PF-2026-${String(i + 100).padStart(3, "0")}`;
    const lineTotal = rand(15, 450);
    const markupPct = pick([30, 40, 50, 60, 75]);
    const subtotal = lineTotal;
    const taxPct = 10;
    const tax = Math.round(subtotal * (1 + markupPct / 100) * (taxPct / 100) * 100) / 100;
    const total = Math.round(subtotal * (1 + markupPct / 100) * (1 + taxPct / 100) * 100) / 100;

    const sentAt = ["SENT", "ACCEPTED", "REJECTED", "EXPIRED"].includes(status)
      ? new Date(createdAt.getTime() + 1000 * 60 * 60 * Math.floor(Math.random() * 24))
      : null;

    const quote = await prisma.quote.create({
      data: {
        userId: adminUser.id,
        clientId: pick(clients).id,
        quoteNumber,
        status,
        subtotal,
        markupPct,
        taxPct,
        tax,
        total,
        notes: `Demo quote — ${desc}`,
        sentAt,
        createdAt,
        updatedAt: sentAt ?? createdAt,
        lineItems: {
          create: {
            description: desc,
            printWeightG: rand(10, 300),
            printTimeMinutes: rand(30, 720),
            materialCost: rand(1, 50),
            machineCost: rand(0.5, 15),
            labourCost: rand(5, 80),
            overheadCost: rand(1, 10),
            lineTotal,
            quantity: pick([1, 1, 1, 2, 3, 5]),
          },
        },
      },
    });
    quotes.push(quote);
  }
  console.log(`   ✓ Created ${quotes.length} quotes`);

  // 4. Create jobs from accepted quotes
  console.log("\n🔧 Creating demo jobs...");
  const acceptedQuotes = quotes.filter((q) =>
    // Re-fetch status since we used the quote object directly
    true
  );
  // Get actual accepted quotes from DB
  const acceptedFromDb = await prisma.quote.findMany({
    where: { userId: adminUser.id, status: "ACCEPTED", quoteNumber: { startsWith: "PF-2026-1" } },
    take: 12,
  });

  let jobCount = 0;
  for (const q of acceptedFromDb) {
    const createdAt = new Date(q.updatedAt.getTime() + 1000 * 60 * 60 * Math.floor(Math.random() * 12));
    const status = pick(JOB_STATUSES);
    const isComplete = status === "COMPLETE" || status === "SHIPPED";
    const startedAt = ["PRINTING", "POST_PROCESSING", "QUALITY_CHECK", "PACKING", "SHIPPED", "COMPLETE"].includes(status)
      ? new Date(createdAt.getTime() + 1000 * 60 * 30)
      : null;
    const completedAt = isComplete
      ? new Date(createdAt.getTime() + 1000 * 60 * 60 * rand(2, 48))
      : null;

    await prisma.job.create({
      data: {
        userId: adminUser.id,
        quoteId: q.id,
        status,
        price: q.total,
        notes: `Job from ${q.quoteNumber}`,
        startedAt,
        completedAt,
        createdAt,
        updatedAt: completedAt ?? startedAt ?? createdAt,
      },
    });
    jobCount++;
  }
  console.log(`   ✓ Created ${jobCount} jobs`);

  // 5. Create system log entries
  console.log("\n📝 Creating system log entries...");
  for (let i = 0; i < 25; i++) {
    const log = pick(LOG_MESSAGES);
    const createdAt = daysAgo(Math.floor(Math.random() * 30));
    await prisma.systemLog.create({
      data: {
        userId: pick([adminUser.id, ...createdUsers.map((u) => u.id)]),
        type: log.type,
        level: log.level,
        message: log.message,
        detail: log.level === "error" ? "Stack trace would appear here in production" : null,
        createdAt,
      },
    });
  }
  console.log(`   ✓ Created 25 system log entries`);

  // 6. Summary
  const totalUsers = await prisma.user.count();
  const totalQuotes = await prisma.quote.count();
  const totalJobs = await prisma.job.count();
  const totalLogs = await prisma.systemLog.count();

  console.log("\n✅ Seed complete!");
  console.log(`   Users: ${totalUsers} | Quotes: ${totalQuotes} | Jobs: ${totalJobs} | Logs: ${totalLogs}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
