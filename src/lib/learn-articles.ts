// ---------------------------------------------------------------------------
// Printforge Learning Centre — Article data
// Follows the same pattern as blog-posts.ts: hardcoded TS, HTML content
// ---------------------------------------------------------------------------

export type ArticleDifficulty = "beginner" | "intermediate" | "advanced";

export type ArticleCategory =
  | "getting-started"
  | "calculator"
  | "quoting"
  | "clients"
  | "jobs"
  | "inventory"
  | "invoicing"
  | "integrations"
  | "advanced"
  | "business-guides";

export interface LearnCategory {
  slug: ArticleCategory;
  label: string;
  description: string;
  icon: string;
  colour: string;
}

export interface LearnArticle {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: ArticleCategory;
  difficulty: ArticleDifficulty;
  tags: string[];
  readingTime: number;
  publishedAt: string;
  updatedAt?: string;
  relatedSlugs: string[];
  tier?: "starter" | "pro" | "scale";
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const LEARN_CATEGORIES: LearnCategory[] = [
  { slug: "getting-started", label: "Getting Started", description: "Account setup, onboarding, and your first quote", icon: "Rocket", colour: "blue" },
  { slug: "calculator", label: "Cost Calculator", description: "STL/G-code upload, presets, and cost breakdowns", icon: "Calculator", colour: "emerald" },
  { slug: "quoting", label: "Quotes & Templates", description: "Creating, sending, and managing professional quotes", icon: "FileText", colour: "violet" },
  { slug: "clients", label: "Clients & Requests", description: "Client database, tags, and customer upload links", icon: "Users", colour: "amber" },
  { slug: "jobs", label: "Jobs & Production", description: "Kanban board, calendar scheduling, and job photos", icon: "Briefcase", colour: "orange" },
  { slug: "inventory", label: "Materials & Equipment", description: "Printers, materials, suppliers, and consumable tracking", icon: "Palette", colour: "pink" },
  { slug: "invoicing", label: "Invoicing & Payments", description: "Create invoices, export PDFs, and sync with Xero", icon: "Receipt", colour: "green" },
  { slug: "integrations", label: "Integrations", description: "Shopify, Xero, Webhooks, and cloud storage", icon: "Plug", colour: "cyan" },
  { slug: "advanced", label: "Advanced Features", description: "Design Studio, AI assistant, and Part Drawings", icon: "Sparkles", colour: "purple" },
  { slug: "business-guides", label: "Business Guides", description: "Pricing strategies, growth tips, and running a print shop", icon: "TrendingUp", colour: "rose" },
];

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export const LEARN_ARTICLES: LearnArticle[] = [

  // =========================================================================
  // GETTING STARTED
  // =========================================================================
  {
    slug: "welcome-to-printforge",
    title: "Welcome to Printforge",
    excerpt: "A quick tour of the platform — what Printforge does, who it's for, and how to get the most out of it.",
    category: "getting-started",
    difficulty: "beginner",
    tags: ["overview", "introduction", "getting started"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["creating-your-account", "your-first-quote-in-5-minutes", "understanding-plans-and-tiers"],
    content: `
<p>Printforge is an all-in-one business management platform built specifically for 3D printing businesses. Whether you're running a one-printer side hustle or a full production print farm, Printforge handles the business side so you can focus on printing.</p>

<h2>What You Can Do</h2>
<p>At its core, Printforge is a cost calculator and quoting tool. Upload an STL or G-code file, and it instantly calculates your true production cost — material, machine time, labour, and overhead. From there, create professional quotes, track jobs through production, manage your client database, and send invoices.</p>

<h2>Key Features at a Glance</h2>
<ul>
  <li><strong>Cost Calculator</strong> — Instant cost breakdowns with STL and G-code auto-fill</li>
  <li><strong>Quote Management</strong> — Auto-numbered quotes (PF-YYYY-NNN), templates, and PDF export</li>
  <li><strong>Job Tracking</strong> — Kanban board with 7 status columns and print farm calendar</li>
  <li><strong>Client Database</strong> — Contact management with tags and interaction timeline</li>
  <li><strong>Invoicing</strong> — Full lifecycle from draft to paid, with GST and PDF export</li>
  <li><strong>Integrations</strong> — Shopify, Xero accounting, Google Drive, OneDrive, and webhooks</li>
  <li><strong>AI Tools</strong> — AI quote assistant and Design Studio with vision analysis</li>
</ul>

<h2>Built for 3D Printing</h2>
<p>Unlike generic invoicing tools, every feature in Printforge understands 3D printing. The calculator knows about filament density, print time, and support material. The materials library tracks stock by spool weight. The job board maps to your actual production workflow — from queue to post-processing to shipping.</p>

<h2>Getting Started</h2>
<p>Your account comes with a 14-day free trial of the Scale plan — full access to every feature. We recommend starting with these three steps:</p>
<ol>
  <li>Add your printers and materials to the library</li>
  <li>Run a cost calculation on a recent job</li>
  <li>Create your first quote and explore the PDF export</li>
</ol>
<p>The onboarding checklist in your sidebar will guide you through setup. Let's get started.</p>
`,
  },
  {
    slug: "creating-your-account",
    title: "Creating Your Account & First Login",
    excerpt: "How to sign up, verify your email, and navigate the dashboard for the first time.",
    category: "getting-started",
    difficulty: "beginner",
    tags: ["account", "registration", "setup", "email verification"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["welcome-to-printforge", "your-first-quote-in-5-minutes", "understanding-plans-and-tiers"],
    content: `
<p>Setting up your Printforge account takes less than a minute. Here's how to get started.</p>

<h2>Sign Up</h2>
<p>Visit the registration page and enter your name, email address, and a password (minimum 8 characters, with at least one uppercase letter, one lowercase letter, and one number). You can optionally add your business name — this will appear on your quotes and invoices later.</p>
<p>Alternatively, you can sign up using your Microsoft account for one-click registration.</p>

<h2>Email Verification</h2>
<p>After registering, you'll receive a verification email. Click the link to verify your address. This ensures your quotes and invoices can be sent from a confirmed account. If you don't see the email, check your spam folder.</p>

<h2>Your 14-Day Scale Trial</h2>
<p>Every new account starts with a 14-day trial of the Scale plan — our most comprehensive tier. This gives you full access to every feature including integrations, AI tools, Design Studio, and cloud storage. No credit card required.</p>
<p>After the trial, your account moves to the Hobby (free) plan. You can upgrade to Starter, Pro, or Scale at any time from your billing settings.</p>

<h2>First Login &amp; Dashboard</h2>
<p>When you first log in, you'll see your dashboard with quick action buttons and the onboarding checklist in the sidebar. The checklist walks you through five data-driven steps:</p>
<ol>
  <li>Add your first printer</li>
  <li>Add your first material</li>
  <li>Run a cost calculation</li>
  <li>Create your first quote</li>
  <li>Set up your business details in settings</li>
</ol>
<p>Each step auto-completes as you work through the platform. The checklist stays visible in your sidebar for 14 days to help you get settled.</p>

<h2>Navigation</h2>
<p>The sidebar on the left is your main navigation. Items are grouped into sections: Sales &amp; Clients, Production, Engineering, and Supply Chain. At the bottom you'll find Settings, Integrations, and the Roadmap.</p>
`,
  },
  {
    slug: "your-first-quote-in-5-minutes",
    title: "Your First Quote in 5 Minutes",
    excerpt: "A step-by-step walkthrough: calculate costs, create a quote, add line items, and export a professional PDF.",
    category: "getting-started",
    difficulty: "beginner",
    tags: ["quick start", "first quote", "walkthrough", "tutorial"],
    readingTime: 5,
    publishedAt: "2026-03-01",
    relatedSlugs: ["how-the-cost-calculator-works", "creating-a-quote", "exporting-quotes-as-pdf"],
    content: `
<p>Let's go from zero to a professional PDF quote in under five minutes. This walkthrough assumes you've already created your account.</p>

<h2>Step 1: Add a Printer (30 seconds)</h2>
<p>Go to <strong>Printers</strong> in the sidebar and click <strong>Add Printer</strong>. Enter your printer name (e.g., "Bambu Lab X1C"), build volume, and the purchase price. Printforge will calculate an hourly rate based on the printer's expected lifetime. You can adjust this rate later.</p>

<h2>Step 2: Add a Material (30 seconds)</h2>
<p>Go to <strong>Materials</strong> and click <strong>Add Material</strong>. Choose the material type (PLA, PETG, ABS, etc.), enter the spool weight and cost, and the density. Printforge calculates the cost per gram automatically.</p>

<h2>Step 3: Calculate Costs (1 minute)</h2>
<p>Navigate to the <strong>Calculator</strong> page. You have two options:</p>
<ul>
  <li><strong>Upload an STL file</strong> — Printforge reads the file dimensions and estimates material usage based on the volume</li>
  <li><strong>Upload a G-code file</strong> — Printforge reads slicer metadata (filament used, print time, material type) for precise calculations</li>
</ul>
<p>Select your printer and material from the dropdowns, adjust labour time and overhead if needed, and the cost breakdown updates instantly on the right. No loading spinners — it's all calculated in your browser in real time.</p>

<h2>Step 4: Create a Quote (1 minute)</h2>
<p>Click the <strong>Create Quote</strong> button at the bottom of the calculator. This creates a new quote pre-filled with a line item based on your calculation. Add a client (or create a new one on the fly), set your markup percentage, add any notes or terms, and you're done.</p>

<h2>Step 5: Export as PDF (30 seconds)</h2>
<p>From the quote detail page, click <strong>Export PDF</strong>. Printforge generates a professional A4 PDF with your business name, logo (if configured), the line item breakdown, GST calculation, and your payment terms. Save it or email it directly to your client.</p>

<h2>What's Next?</h2>
<p>Now that you've created your first quote, explore these features next:</p>
<ul>
  <li><strong>Quote templates</strong> — Save quote configurations for repeat jobs</li>
  <li><strong>Calculator presets</strong> — Save printer + material combos for quick access</li>
  <li><strong>Job tracking</strong> — When a quote is accepted, create a job to track production</li>
</ul>
`,
  },
  {
    slug: "understanding-plans-and-tiers",
    title: "Understanding Plans & Pricing Tiers",
    excerpt: "What's included in each plan — Hobby, Starter, Pro, and Scale — and how to choose the right one for your business.",
    category: "getting-started",
    difficulty: "beginner",
    tags: ["pricing", "plans", "tiers", "subscription", "billing"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["welcome-to-printforge", "creating-your-account"],
    content: `
<p>Printforge has four plans designed to grow with your business. Every account starts with a 14-day Scale trial — no credit card required.</p>

<h2>Hobby — Free Forever</h2>
<p>The Hobby plan gives you the core tools with generous limits:</p>
<ul>
  <li>Cost calculator with presets</li>
  <li>Up to 10 active quotes with PDF export</li>
  <li>Up to 3 printers and 5 materials</li>
  <li>Up to 10 clients</li>
  <li>Job tracking (kanban and calendar)</li>
  <li>Customer upload links and quote templates</li>
</ul>
<p>Perfect for hobby printers who handle a handful of orders each month.</p>

<h2>Starter — $12/month ($9/month annually)</h2>
<p>Everything in Hobby with no quantity limits, plus professional tools:</p>
<ul>
  <li>Unlimited quotes, printers, materials, and clients</li>
  <li>Send quotes via email directly from Printforge</li>
  <li>Client portal with shareable quote links</li>
  <li>Your business logo on PDF quotes and invoices</li>
  <li>CSV export for quotes, clients, and jobs</li>
  <li>Job photos and dashboard analytics</li>
  <li>Bulk actions across quotes and invoices</li>
</ul>

<h2>Pro — $24/month ($18/month annually)</h2>
<p>Everything in Starter plus operational tools for established businesses:</p>
<ul>
  <li>Full invoicing system (create, send, track, PDF with GST/ABN)</li>
  <li>Supplier management and consumable tracking</li>
  <li>AI Quote Assistant — describe a job, get structured line items</li>
  <li>Part Drawings — generate technical drawings from STL files</li>
  <li>Webhooks for external automation</li>
</ul>

<h2>Scale — $49/month ($39/month annually)</h2>
<p>Everything in Pro plus enterprise integrations and advanced tools:</p>
<ul>
  <li>Shopify integration — import orders as jobs automatically</li>
  <li>Xero accounting sync — push invoices and contacts</li>
  <li>Design Studio with AI chat and vision analysis</li>
  <li>Cloud storage — Google Drive and OneDrive sync</li>
  <li>Master backup to OneDrive</li>
  <li>Asana integration for task management</li>
  <li>Priority support</li>
</ul>

<h2>Annual Billing</h2>
<p>Save up to 25% with annual billing. You can switch between monthly and annual at any time from your billing settings. Annual plans are charged upfront for the full year.</p>

<h2>After Your Trial</h2>
<p>When your 14-day Scale trial ends, your account automatically moves to the Hobby plan. No charges, no surprises. All your data is preserved — you just lose access to paid features until you subscribe. Upgrade any time from <strong>Settings → Billing</strong>.</p>
`,
  },

  // =========================================================================
  // COST CALCULATOR
  // =========================================================================
  {
    slug: "how-the-cost-calculator-works",
    title: "How the Cost Calculator Works",
    excerpt: "Understand the four cost components — material, machine time, labour, and overhead — and how Printforge calculates them.",
    category: "calculator",
    difficulty: "beginner",
    tags: ["calculator", "cost breakdown", "pricing", "formula"],
    readingTime: 5,
    publishedAt: "2026-03-01",
    relatedSlugs: ["uploading-stl-files", "uploading-gcode-files", "understanding-the-cost-breakdown"],
    content: `
<p>The Printforge calculator breaks every 3D printed part into four cost components. Understanding each one helps you price jobs accurately and profitably.</p>

<h2>Material Cost</h2>
<p>Material cost is based on the weight of filament used (in grams) multiplied by your material's cost per gram. When you add a material to your library, you enter the spool weight and price — Printforge calculates the per-gram rate automatically. If you upload an STL file, it estimates the volume and uses your material's density to determine weight. G-code uploads are even more precise — the slicer has already calculated the exact filament length and weight.</p>

<h2>Machine Cost</h2>
<p>Machine cost accounts for electricity, wear, and depreciation. Each printer in your fleet has an hourly rate, calculated from the purchase price, expected lifetime hours, power consumption, and maintenance costs. Multiply the hourly rate by the estimated print time to get the machine cost for a job.</p>

<h2>Labour Cost</h2>
<p>Labour covers your time: design work, slicing and setup, removing supports, sanding, painting, quality inspection, and packaging. Set your hourly labour rate in the calculator and enter the estimated time for each job. Even small tasks add up — a 10-minute post-processing step at $40/hour adds $6.67 to your cost.</p>

<h2>Overhead Cost</h2>
<p>Overhead is everything else: rent, insurance, software, internet, marketing, accounting fees. Enter a flat overhead amount per job, or calculate it as a percentage of your other costs. The goal is to spread your fixed monthly expenses across all the jobs you produce.</p>

<h2>The Final Calculation</h2>
<p>Total cost = Material + Machine + Labour + Overhead. The calculator shows each component with a colour-coded breakdown bar. Your selling price adds a markup on top — set it as a percentage in the quote. A 50% markup on a $20 cost gives you a $30 sale price and $10 profit.</p>

<h2>Real-Time Updates</h2>
<p>Every field in the calculator updates the cost breakdown instantly. There are no loading spinners — all calculations run in your browser in real time. Change the material, adjust the print time, or update your markup, and the numbers update immediately.</p>
`,
  },
  {
    slug: "uploading-stl-files",
    title: "Uploading STL Files for Instant Estimates",
    excerpt: "How to upload STL files and get automatic dimension analysis and volume-based cost estimates.",
    category: "calculator",
    difficulty: "beginner",
    tags: ["STL", "upload", "file upload", "dimensions", "volume"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["how-the-cost-calculator-works", "uploading-gcode-files", "saving-calculator-presets"],
    content: `
<p>Upload an STL file to the calculator and Printforge automatically reads the model dimensions, calculates volume, and estimates material usage.</p>

<h2>How It Works</h2>
<p>When you upload an STL file (binary or ASCII format), Printforge parses the triangle mesh to determine:</p>
<ul>
  <li><strong>Bounding box dimensions</strong> — width, depth, and height in millimetres</li>
  <li><strong>Mesh volume</strong> — the total volume of the solid model</li>
  <li><strong>Estimated weight</strong> — volume × material density × infill factor</li>
</ul>
<p>These values automatically populate the calculator fields, so you get an instant cost estimate without measuring anything manually.</p>

<h2>Uploading</h2>
<p>On the Calculator page, use the upload panel at the top of the page. Drag and drop your STL file, or click to browse. The file is processed entirely in your browser — nothing is uploaded to a server. Maximum file size is 50 MB.</p>

<h2>Accuracy Notes</h2>
<p>STL-based estimates are approximate because they don't account for supports, infill patterns, or slicer-specific settings. For precise calculations, use a G-code file instead (your slicer has already calculated the exact filament usage). STL estimates are great for quick quotes where you haven't sliced the model yet.</p>

<h2>Using Dimensions in Quotes</h2>
<p>When you click "Create Quote" from the calculator, the STL dimensions are automatically included in the quote line item description. This gives your clients a clear reference for what they're paying for.</p>
`,
  },
  {
    slug: "uploading-gcode-files",
    title: "Uploading G-code Files from Your Slicer",
    excerpt: "Upload G-code files for precise cost calculations using slicer metadata — supports Bambu Studio, OrcaSlicer, PrusaSlicer, and Cura.",
    category: "calculator",
    difficulty: "beginner",
    tags: ["G-code", "upload", "slicer", "Bambu Studio", "PrusaSlicer", "Cura"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["how-the-cost-calculator-works", "uploading-stl-files", "understanding-the-cost-breakdown"],
    content: `
<p>G-code files contain embedded metadata from your slicer — filament type, weight, print time, and more. Uploading a G-code file gives you the most accurate cost calculation possible.</p>

<h2>Supported Slicers</h2>
<p>Printforge reads comment-line metadata from these slicers:</p>
<ul>
  <li><strong>Bambu Studio / OrcaSlicer</strong> — filament type, weight, print time, layer height</li>
  <li><strong>PrusaSlicer</strong> — filament type, used weight, estimated time</li>
  <li><strong>Cura (UltiMaker)</strong> — material type, filament weight, time estimate</li>
</ul>

<h2>What Gets Auto-Filled</h2>
<p>When you upload a G-code file, the calculator automatically populates:</p>
<ul>
  <li><strong>Material weight</strong> — exact filament usage in grams</li>
  <li><strong>Print time</strong> — estimated duration from the slicer</li>
  <li><strong>Material type</strong> — PLA, PETG, ABS, etc. (auto-matches to your library)</li>
</ul>
<p>If the G-code's material type matches a material in your library, it's selected automatically. Otherwise, you can pick the correct one manually.</p>

<h2>Uploading</h2>
<p>On the Calculator page, use the upload panel and select your .gcode file. Like STL uploads, the file is parsed in your browser — no server upload needed. The parser reads only comment lines (starting with <code>;</code>) and ignores the actual movement commands.</p>

<h2>G-code vs STL</h2>
<p>G-code gives you precise numbers because the slicer has already computed exact filament usage and timing. STL estimates are based on volume and density, which are approximate. Use G-code for final quotes and STL for quick estimates.</p>
`,
  },
  {
    slug: "saving-calculator-presets",
    title: "Saving and Using Calculator Presets",
    excerpt: "Save your favourite printer + material + settings combos as presets for one-click cost calculations.",
    category: "calculator",
    difficulty: "intermediate",
    tags: ["presets", "calculator", "efficiency", "workflow"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["how-the-cost-calculator-works", "uploading-stl-files"],
    content: `
<p>If you frequently quote jobs with the same printer, material, and overhead settings, presets save you from reconfiguring every time.</p>

<h2>Creating a Preset</h2>
<p>Configure the calculator with your desired settings — select a printer, material, set your labour rate, overhead, and any other defaults. Then click <strong>Save as Preset</strong> in the presets bar above the calculator. Give it a descriptive name like "X1C + PLA Standard" or "A1 Mini + PETG Rush".</p>

<h2>Loading a Preset</h2>
<p>Click any saved preset in the presets bar to instantly load all its settings into the calculator. Then just upload your file or adjust the material weight, and the calculation updates immediately.</p>

<h2>Managing Presets</h2>
<p>Click the edit icon on any preset to rename or delete it. Presets are saved to your account and available on any device you log into.</p>

<h2>Tips</h2>
<ul>
  <li>Create presets for each printer + material combination you use regularly</li>
  <li>Include rush job presets with higher labour rates for urgent orders</li>
  <li>Name presets descriptively — you'll thank yourself when you have 10+</li>
</ul>
`,
  },
  {
    slug: "understanding-the-cost-breakdown",
    title: "Understanding the Cost Breakdown Panel",
    excerpt: "How to read the cost breakdown — the bar chart, per-component costs, and what drives your pricing.",
    category: "calculator",
    difficulty: "intermediate",
    tags: ["cost breakdown", "analysis", "pricing", "profit margin"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["how-the-cost-calculator-works", "saving-calculator-presets"],
    content: `
<p>The cost breakdown panel on the right side of the calculator gives you a complete picture of where your money goes. Understanding it helps you price competitively while protecting your margins.</p>

<h2>The Breakdown Bar</h2>
<p>The coloured bar at the top shows the proportion of each cost component. A healthy breakdown typically looks like: Material 20–35%, Machine 15–25%, Labour 20–35%, Overhead 10–20%. If one segment dominates, it's worth investigating whether you can optimise that component.</p>

<h2>Component Details</h2>
<p>Below the bar, each component shows its exact dollar amount and the inputs that drive it:</p>
<ul>
  <li><strong>Material</strong> — weight (g) × cost per gram. If your material cost seems high, check your density setting and infill percentage.</li>
  <li><strong>Machine</strong> — print time (hours) × printer hourly rate. Faster printers or parallel printing can reduce this.</li>
  <li><strong>Labour</strong> — time (hours) × hourly rate. Be honest about how long post-processing actually takes.</li>
  <li><strong>Overhead</strong> — flat amount or percentage. Review this monthly to ensure it reflects your actual expenses.</li>
</ul>

<h2>Total and Markup</h2>
<p>The total cost is the sum of all four components. Your selling price applies a markup percentage on top. The panel shows both the cost and the sale price so you can see your margin at a glance.</p>

<h2>Using the Breakdown for Pricing Decisions</h2>
<p>If a client says your price is too high, the breakdown tells you exactly where to look for savings. Maybe you can use a cheaper material, batch multiple parts to reduce per-part overhead, or optimise the print orientation to reduce time. The breakdown turns a vague "too expensive" into actionable numbers.</p>
`,
  },

  // =========================================================================
  // QUOTES & TEMPLATES
  // =========================================================================
  {
    slug: "creating-a-quote",
    title: "Creating a Quote with Line Items",
    excerpt: "How to create a professional quote — add line items, set markup, assign a client, and configure terms.",
    category: "quoting",
    difficulty: "beginner",
    tags: ["quotes", "line items", "markup", "create quote"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["your-first-quote-in-5-minutes", "sending-quotes-to-clients", "quote-templates"],
    content: `
<p>Quotes are the backbone of your client workflow. Printforge generates auto-numbered quotes (PF-YYYY-NNN) with professional formatting and flexible line items.</p>

<h2>Creating from the Calculator</h2>
<p>The fastest way to create a quote is from the calculator. After running a cost calculation, click <strong>Create Quote</strong>. This creates a new quote pre-filled with a line item containing the calculated cost, dimensions, and material details.</p>

<h2>Creating from Scratch</h2>
<p>Navigate to <strong>Quotes → New Quote</strong>. Select or create a client, set the expiry date (defaults to 30 days), and add line items manually. Each line item has a description, quantity, and unit price.</p>

<h2>Line Items</h2>
<p>Click <strong>Add Line Item</strong> to add rows. Each line item has:</p>
<ul>
  <li><strong>Description</strong> — what you're quoting (e.g., "Custom bracket — PLA, 45g, 3h print")</li>
  <li><strong>Quantity</strong> — number of units</li>
  <li><strong>Unit Price</strong> — price per unit (your cost + markup)</li>
</ul>
<p>The subtotal and total update as you add or modify items. You can edit or delete any line item after creation.</p>

<h2>Markup</h2>
<p>Set a markup percentage on the quote to apply across all line items. A 50% markup on a $20 cost gives a $30 sale price. Adjust this per quote based on the job complexity, client relationship, or urgency.</p>

<h2>Notes &amp; Terms</h2>
<p>Add notes visible to the client (project details, delivery expectations) and payment terms (e.g., "Payment due within 14 days of acceptance"). These appear on the PDF export.</p>

<h2>Quote Statuses</h2>
<p>Every quote has a status: <strong>Draft</strong> (editing), <strong>Sent</strong> (shared with client), <strong>Accepted</strong>, <strong>Rejected</strong>, or <strong>Expired</strong> (past the expiry date). Change the status from the quote detail page using the dropdown.</p>
`,
  },
  {
    slug: "sending-quotes-to-clients",
    title: "Sending Quotes to Clients via Email",
    excerpt: "Email quotes directly from Printforge with a professional template and PDF attachment.",
    category: "quoting",
    difficulty: "beginner",
    tags: ["email", "send quote", "client communication"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["creating-a-quote", "exporting-quotes-as-pdf", "managing-your-client-database"],
    tier: "starter",
    content: `
<p>With the Starter plan and above, you can email quotes directly to clients from Printforge — no need to download the PDF and attach it manually.</p>

<h2>Sending a Quote</h2>
<p>From the quote detail page, click <strong>Send via Email</strong>. Printforge sends a professional HTML email to the client's address with:</p>
<ul>
  <li>Your business name and quote number</li>
  <li>A summary of the quote total and expiry date</li>
  <li>The full quote PDF as an attachment</li>
</ul>

<h2>Quote Status</h2>
<p>When you send a quote, its status automatically changes from <strong>Draft</strong> to <strong>Sent</strong>. This helps you track which quotes are still in draft versus actively being reviewed by clients.</p>

<h2>Client Portal</h2>
<p>Starter and above plans also include a client portal — a shareable link where clients can view the quote online, accept it, or leave comments. The portal link is included in the email.</p>

<h2>Tips</h2>
<ul>
  <li>Double-check the client's email address before sending</li>
  <li>Add a personal note in the quote's notes field — it shows in the email</li>
  <li>Follow up on sent quotes that haven't been accepted within a few days</li>
</ul>
`,
  },
  {
    slug: "quote-templates",
    title: "Using Quote Templates for Repeat Jobs",
    excerpt: "Save quote configurations as templates and apply them to new quotes for faster quoting on repeat work.",
    category: "quoting",
    difficulty: "intermediate",
    tags: ["templates", "repeat jobs", "efficiency", "workflow"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["creating-a-quote", "saving-calculator-presets"],
    content: `
<p>If you regularly quote similar jobs — phone cases, lithophanes, brackets — templates save you from re-entering the same line items every time.</p>

<h2>Creating a Template</h2>
<p>There are two ways to create a template:</p>
<ul>
  <li><strong>From an existing quote</strong> — open any quote and click <strong>Save as Template</strong>. The line items, markup, notes, and terms are saved as a reusable template.</li>
  <li><strong>From the Templates page</strong> — go to <strong>Templates</strong> in the sidebar and click <strong>New Template</strong>. Build the template from scratch with your standard line items and settings.</li>
</ul>

<h2>Using a Template</h2>
<p>When creating a new quote, select a template from the dropdown at the top of the form. The template's line items, markup, notes, and terms are pre-filled into the new quote. You can then modify anything before saving.</p>

<h2>Managing Templates</h2>
<p>The Templates page shows all your saved templates with their line item count and last used date. Edit or delete templates as your product offerings change.</p>

<h2>Template Ideas</h2>
<ul>
  <li>"Standard PLA Print" — generic line items for typical PLA jobs</li>
  <li>"Rush Order (+50%)" — higher markup and expedited delivery terms</li>
  <li>"Multi-Part Assembly" — multiple line items for assembly projects</li>
  <li>"Design + Print Package" — design fee + printing + post-processing</li>
</ul>
`,
  },
  {
    slug: "exporting-quotes-as-pdf",
    title: "Exporting Quotes as Professional PDFs",
    excerpt: "Generate polished A4 PDF quotes with your logo, line items, GST, and payment terms.",
    category: "quoting",
    difficulty: "beginner",
    tags: ["PDF", "export", "professional", "logo", "GST"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["creating-a-quote", "sending-quotes-to-clients"],
    content: `
<p>Every quote in Printforge can be exported as a professionally formatted A4 PDF — ready to email, print, or share with clients.</p>

<h2>Generating a PDF</h2>
<p>From the quote detail page, click <strong>Export PDF</strong>. The PDF opens in a new tab where you can print it or save it using your browser's save/print function.</p>

<h2>What's in the PDF</h2>
<p>The PDF includes:</p>
<ul>
  <li><strong>Header</strong> — your business name, logo (if uploaded), ABN, and contact details</li>
  <li><strong>Quote details</strong> — quote number, date, expiry date, client details</li>
  <li><strong>Line items table</strong> — description, quantity, unit price, line total</li>
  <li><strong>Totals</strong> — subtotal, GST (if applicable), and grand total</li>
  <li><strong>Notes</strong> — any project notes or special instructions</li>
  <li><strong>Terms &amp; conditions</strong> — your payment terms and conditions</li>
  <li><strong>Footer</strong> — bank details for payment and your business info</li>
</ul>

<h2>Adding Your Logo</h2>
<p>Upload your business logo in <strong>Settings → Business Details</strong>. The logo appears in the top-left of every quote and invoice PDF. Supported formats: PNG, JPEG. The image is cropped to fit a 200×200px area.</p>

<h2>GST Handling</h2>
<p>If you've enabled GST in your settings (and entered your ABN), the PDF automatically shows the GST amount as a separate line in the totals section. The tax label reads "GST (10%)" for Australian businesses.</p>
`,
  },
  {
    slug: "tracking-quote-status",
    title: "Tracking Quote Status & Conversion",
    excerpt: "How to use quote statuses to manage your sales pipeline and track win rates.",
    category: "quoting",
    difficulty: "intermediate",
    tags: ["status", "pipeline", "conversion", "analytics"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["creating-a-quote", "job-tracking-kanban-board"],
    content: `
<p>Every quote moves through a lifecycle: Draft → Sent → Accepted/Rejected/Expired. Tracking these transitions helps you understand your conversion rate and identify bottlenecks.</p>

<h2>Status Workflow</h2>
<ul>
  <li><strong>Draft</strong> — you're still editing. The client hasn't seen it yet.</li>
  <li><strong>Sent</strong> — shared with the client (via email or portal link). Waiting for their response.</li>
  <li><strong>Accepted</strong> — the client said yes. Time to create a job.</li>
  <li><strong>Rejected</strong> — the client declined. Review why and adjust for next time.</li>
  <li><strong>Expired</strong> — the quote passed its expiry date without a response.</li>
</ul>

<h2>Changing Status</h2>
<p>On the quote detail page, use the status dropdown to change the current status. Sending an email automatically changes Draft to Sent. You can also manually set the status at any time.</p>

<h2>Filtering by Status</h2>
<p>The quotes list page has a status filter dropdown. Use it to see all your sent quotes that are awaiting response, or all accepted quotes that need jobs created.</p>

<h2>From Quote to Job</h2>
<p>When a quote is accepted, create a job from it. The job is linked to the original quote and inherits the client and line items. This keeps your pipeline clean — you can see exactly which quotes turned into production work.</p>

<h2>Dashboard Stats</h2>
<p>Your dashboard shows quote counts by status and the total value of accepted quotes. Over time, this gives you a clear picture of your conversion rate and revenue pipeline.</p>
`,
  },

  // =========================================================================
  // CLIENTS & REQUESTS
  // =========================================================================
  {
    slug: "managing-your-client-database",
    title: "Managing Your Client Database",
    excerpt: "How to add, organise, and search your client contacts in Printforge.",
    category: "clients",
    difficulty: "beginner",
    tags: ["clients", "contacts", "database", "CRM"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["client-tags-and-timeline", "customer-upload-links", "creating-a-quote"],
    content: `
<p>The Clients page is your contact database — every person or business you quote, invoice, or produce work for. Keeping it organised means faster quoting and better client relationships.</p>

<h2>Adding a Client</h2>
<p>Go to <strong>Clients</strong> and click <strong>Add Client</strong>. Enter the client's name, email, phone, company name, and address. Only the name is required — fill in the rest as you learn more about them.</p>
<p>You can also create clients on the fly when creating a quote or invoice — just click "New client" in the client selector.</p>

<h2>Client Detail Page</h2>
<p>Click any client to see their full profile. The detail page shows:</p>
<ul>
  <li>Contact information</li>
  <li>All quotes associated with this client</li>
  <li>All invoices associated with this client</li>
  <li>All jobs linked to this client</li>
  <li>Tags for categorisation</li>
  <li>Interaction timeline (notes, calls, emails, meetings)</li>
</ul>

<h2>Searching and Filtering</h2>
<p>Use the search bar on the Clients page to find contacts by name, email, or company. The search is instant and searches across all fields.</p>

<h2>Tips</h2>
<ul>
  <li>Always enter an email address — you'll need it for sending quotes and invoices</li>
  <li>Use tags to categorise clients (see the Tags guide)</li>
  <li>Keep client addresses up to date for shipping labels and invoices</li>
</ul>
`,
  },
  {
    slug: "client-tags-and-timeline",
    title: "Client Tags & Interaction Timeline",
    excerpt: "Organise clients with colour-coded tags and keep a timeline of every interaction.",
    category: "clients",
    difficulty: "intermediate",
    tags: ["tags", "timeline", "interactions", "CRM", "notes"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["managing-your-client-database", "customer-upload-links"],
    content: `
<p>Tags and timelines help you remember context about each client — who they are, what they need, and your history with them.</p>

<h2>Tags</h2>
<p>Tags are colour-coded labels you can assign to clients. They appear as chips on the client card and detail page. Common tag ideas:</p>
<ul>
  <li><strong>VIP</strong> — high-value repeat customers</li>
  <li><strong>Wholesale</strong> — bulk buyers who get different pricing</li>
  <li><strong>Etsy</strong> / <strong>Shopify</strong> — clients from specific sales channels</li>
  <li><strong>Local</strong> — clients who pick up in person</li>
  <li><strong>Slow payer</strong> — clients who need payment reminders</li>
</ul>
<p>To add a tag, edit the client and type in the tag input. Existing tags autocomplete as you type, and new tags are created automatically. Tags get assigned a colour automatically.</p>

<h2>Interaction Timeline</h2>
<p>The interaction timeline on each client's page records every touchpoint. Add entries for:</p>
<ul>
  <li><strong>Note</strong> — general notes about the client or project</li>
  <li><strong>Call</strong> — phone call summaries</li>
  <li><strong>Email</strong> — important email exchanges</li>
  <li><strong>Meeting</strong> — in-person or video meeting notes</li>
</ul>
<p>Each entry is timestamped and shows who added it. This gives you a complete history of your relationship with each client — invaluable when they come back months later with a new project.</p>
`,
  },
  {
    slug: "customer-upload-links",
    title: "Setting Up Customer Upload Links",
    excerpt: "Generate shareable links so customers can upload STL, G-code, and PDF files directly to your account.",
    category: "clients",
    difficulty: "beginner",
    tags: ["upload links", "customer files", "STL", "PDF", "sharing"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["managing-your-client-database", "uploading-stl-files"],
    content: `
<p>Upload links let your customers send you files without needing a Printforge account. Share a link, and they can drag-and-drop STL, G-code, or PDF files directly into your inbox.</p>

<h2>Creating an Upload Link</h2>
<p>From the quote request or client portal, you can generate shareable upload links. Each link has configurable settings:</p>
<ul>
  <li><strong>Allowed file types</strong> — STL, G-code, 3MF, STEP, OBJ, and/or PDF</li>
  <li><strong>Expiry</strong> — links can expire after a set number of days</li>
  <li><strong>Max uploads</strong> — limit the number of files per link</li>
</ul>

<h2>What Customers See</h2>
<p>When a customer opens the link, they see a simple upload page with your Printforge branding. They can drag and drop files or click to browse. No login required. They can also add a message describing what they need.</p>

<h2>Receiving Files</h2>
<p>Uploaded files appear in your quote requests. You'll see the customer's name, their message, and all attached files. From there, you can download the files, run them through the calculator, and create a quote.</p>

<h2>File Validation</h2>
<p>Printforge validates uploaded files using magic byte detection — it checks the actual file content, not just the extension. This prevents invalid or malicious files from being uploaded. Supported formats: STL (binary and ASCII), G-code, 3MF, STEP, OBJ, and PDF.</p>
`,
  },

  // =========================================================================
  // JOBS & PRODUCTION
  // =========================================================================
  {
    slug: "job-tracking-kanban-board",
    title: "Job Tracking with the Kanban Board",
    excerpt: "Manage your production queue with a visual kanban board — 7 status columns from queued to shipped.",
    category: "jobs",
    difficulty: "beginner",
    tags: ["kanban", "job tracking", "production", "status"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["print-farm-calendar", "adding-job-photos", "job-workflow"],
    content: `
<p>The Jobs page gives you a visual kanban board to track every job through your production pipeline. Drag cards between columns to update their status.</p>

<h2>The 7 Status Columns</h2>
<ol>
  <li><strong>Queued</strong> — accepted and waiting to be printed</li>
  <li><strong>Printing</strong> — currently on a printer</li>
  <li><strong>Post-Processing</strong> — support removal, sanding, painting</li>
  <li><strong>Quality Check</strong> — inspection before packing</li>
  <li><strong>Packing</strong> — packaging for shipping or pickup</li>
  <li><strong>Shipped</strong> — sent to the customer</li>
  <li><strong>Complete</strong> — delivered and confirmed</li>
</ol>

<h2>Creating Jobs</h2>
<p>Create jobs in two ways:</p>
<ul>
  <li><strong>From an accepted quote</strong> — the job inherits the client, line items, and printer assignment</li>
  <li><strong>Manually</strong> — click "New Job" on the Jobs page and fill in the details</li>
</ul>

<h2>Job Cards</h2>
<p>Each card on the board shows the job title, client name, assigned printer, and a "Move to next status" button. Click a card to open the job detail page with all the information.</p>

<h2>Filtering</h2>
<p>Filter the board to show All, Active (non-complete), or Complete jobs. Use this to focus on what needs attention right now versus reviewing finished work.</p>

<h2>Board vs List View</h2>
<p>Toggle between Board (kanban) and List (table) views. The list view shows all jobs in a sortable, searchable table — useful when you have dozens of active jobs.</p>

<h2>Auto-Timestamps</h2>
<p>Printforge automatically records when a job enters certain statuses. Moving to "Printing" sets the start time; moving to "Complete" sets the completion time. This gives you accurate production time data.</p>
`,
  },
  {
    slug: "print-farm-calendar",
    title: "Print Farm Calendar & Scheduling",
    excerpt: "Schedule jobs on specific printers using the weekly Gantt-style calendar with drag-to-reschedule.",
    category: "jobs",
    difficulty: "intermediate",
    tags: ["calendar", "scheduling", "Gantt", "print farm", "printers"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["job-tracking-kanban-board", "adding-printers"],
    content: `
<p>The print farm calendar gives you a weekly Gantt view of your printer schedule. Each row is a printer, each bar is a job — drag to reschedule, click to edit.</p>

<h2>Layout</h2>
<p>The calendar shows one week at a time with hourly columns. Each printer in your fleet gets its own row. Jobs assigned to a printer appear as coloured bars spanning their scheduled time. A "now" marker shows the current time.</p>

<h2>Scheduling a Job</h2>
<p>From the job detail page, assign a printer and set the scheduled start time. The job appears on the calendar. Alternatively, drag an unscheduled job from the sidebar onto a printer row to schedule it.</p>

<h2>Rescheduling</h2>
<p>Drag any job bar left or right to move it to a different time. Drag it to a different printer row to reassign it. The changes save automatically.</p>

<h2>Unscheduled Sidebar</h2>
<p>Jobs that haven't been assigned a time appear in the sidebar panel. This is your "to-do" list — drag them onto the calendar when you're ready to schedule them.</p>

<h2>Tips</h2>
<ul>
  <li>Colour-code your printers in the library for easier visual identification</li>
  <li>Use the calendar alongside the kanban board — the calendar shows when, the kanban shows what stage</li>
  <li>Check the calendar before committing to deadlines with clients</li>
</ul>
`,
  },
  {
    slug: "adding-job-photos",
    title: "Adding Job Photos for Quality Records",
    excerpt: "Upload progress and completion photos to jobs — a visual record for you and your clients.",
    category: "jobs",
    difficulty: "beginner",
    tags: ["photos", "gallery", "quality", "documentation"],
    readingTime: 2,
    publishedAt: "2026-03-01",
    relatedSlugs: ["job-tracking-kanban-board", "job-workflow"],
    tier: "starter",
    content: `
<p>Attach photos to any job to document progress, quality, and finished results. Great for your own records and for sharing with clients.</p>

<h2>Uploading Photos</h2>
<p>Open any job and scroll to the Photos section. Click <strong>Upload Photos</strong> or drag and drop images. Supported formats: JPEG, PNG, WebP. Multiple photos can be uploaded at once.</p>

<h2>Gallery View</h2>
<p>Photos appear in a grid gallery. Click any photo to open it in a fullscreen lightbox viewer. Navigate between photos using arrow keys or swipe on mobile.</p>

<h2>Use Cases</h2>
<ul>
  <li><strong>Before/after</strong> — show the raw print vs the finished post-processed part</li>
  <li><strong>Quality issues</strong> — document defects for learning and client communication</li>
  <li><strong>Client proof</strong> — send photos before shipping for approval</li>
  <li><strong>Portfolio building</strong> — collect your best work for marketing</li>
</ul>

<h2>Storage</h2>
<p>Photos are stored securely on the server and served via authenticated URLs — only you (and admins) can access them. They're included in master backups if you have cloud storage connected.</p>
`,
  },
  {
    slug: "job-workflow",
    title: "Complete Job Workflow: Quote to Shipped",
    excerpt: "The full lifecycle of a job — from accepting a quote to shipping the final product.",
    category: "jobs",
    difficulty: "intermediate",
    tags: ["workflow", "lifecycle", "process", "best practices"],
    readingTime: 5,
    publishedAt: "2026-03-01",
    relatedSlugs: ["job-tracking-kanban-board", "creating-a-quote", "creating-invoices"],
    content: `
<p>Here's the complete workflow for a typical job in Printforge, from the moment a client accepts a quote to the final delivery.</p>

<h2>1. Quote Accepted</h2>
<p>When a client accepts a quote (either through the portal or you mark it manually), change the status to <strong>Accepted</strong>. From the quote detail page, click <strong>Create Job</strong>. The job is pre-filled with the client, printer, and details from the quote.</p>

<h2>2. Queue the Job</h2>
<p>The new job starts in the <strong>Queued</strong> column on the kanban board. Assign a printer and schedule a start time using the calendar if you want precise scheduling.</p>

<h2>3. Start Printing</h2>
<p>When you start the print, move the job to <strong>Printing</strong>. Printforge records the start timestamp. If you're running multiple printers, the calendar view shows you which printers are busy and when they'll be free.</p>

<h2>4. Post-Processing</h2>
<p>After the print finishes, move to <strong>Post-Processing</strong>. This covers support removal, sanding, painting, assembly — whatever finishing work the part needs. Upload photos of the process.</p>

<h2>5. Quality Check</h2>
<p>Inspect the finished part. Compare dimensions, surface quality, and overall fit to the original requirements. If something's wrong, you can move the job back to an earlier stage. If it passes, move on.</p>

<h2>6. Pack &amp; Ship</h2>
<p>Move to <strong>Packing</strong> while preparing the shipment. Once sent, move to <strong>Shipped</strong>. If integrated with Shopify, the order fulfilment status is updated automatically.</p>

<h2>7. Complete</h2>
<p>When the client confirms delivery (or after a reasonable time), move to <strong>Complete</strong>. This records the completion timestamp. Now create an invoice from the job if you haven't already.</p>

<h2>8. Invoice</h2>
<p>From the job or original quote, click <strong>Create Invoice</strong>. The invoice inherits the client, line items, and amounts. Send it via email or export as PDF.</p>
`,
  },

  // =========================================================================
  // MATERIALS & EQUIPMENT
  // =========================================================================
  {
    slug: "adding-printers",
    title: "Adding Printers to Your Fleet",
    excerpt: "How to add and configure printers — build volume, hourly rates, and maintenance tracking.",
    category: "inventory",
    difficulty: "beginner",
    tags: ["printers", "setup", "fleet", "hourly rate"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["managing-materials", "how-the-cost-calculator-works"],
    content: `
<p>Your printer library tells Printforge about your fleet — the machines, their capabilities, and their operating costs. This feeds directly into your cost calculations.</p>

<h2>Adding a Printer</h2>
<p>Go to <strong>Printers</strong> and click <strong>Add Printer</strong>. Enter:</p>
<ul>
  <li><strong>Name</strong> — e.g., "Bambu Lab X1C #1" or "Prusa MK4 - Workshop"</li>
  <li><strong>Build volume</strong> — width, depth, and height in millimetres</li>
  <li><strong>Purchase price</strong> — what you paid for the printer</li>
  <li><strong>Expected lifetime hours</strong> — how many print hours before replacement (e.g., 5,000–10,000)</li>
  <li><strong>Power consumption</strong> — watts (typically 100–350W for FDM, more for resin)</li>
  <li><strong>Maintenance cost per month</strong> — nozzle replacements, build plate wear, etc.</li>
</ul>

<h2>Hourly Rate</h2>
<p>Printforge calculates an hourly operating rate from these inputs: depreciation (purchase price ÷ lifetime hours) + electricity + maintenance. This rate is used in the cost calculator's "Machine" component. You can override the calculated rate if needed.</p>

<h2>Printer Cards</h2>
<p>The Printers page displays each printer as a card showing its name, build volume, hourly rate, and status. Click any card to edit its details.</p>

<h2>Tips</h2>
<ul>
  <li>Add every printer, even identical ones — name them with numbers (e.g., "#1", "#2")</li>
  <li>Update lifetime hours periodically as you learn how long your printers actually last</li>
  <li>Use realistic power consumption — check your printer's specs or measure with a smart plug</li>
</ul>
`,
  },
  {
    slug: "managing-materials",
    title: "Managing Your Materials Library",
    excerpt: "Add filaments and resins, track stock levels, and keep cost-per-gram calculations accurate.",
    category: "inventory",
    difficulty: "beginner",
    tags: ["materials", "filament", "stock", "library", "cost per gram"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["adding-printers", "tracking-stock-levels", "how-the-cost-calculator-works"],
    content: `
<p>The Materials library stores every filament and resin you use. Each material has a cost-per-gram rate that feeds into your cost calculations, plus stock tracking so you know when to reorder.</p>

<h2>Adding a Material</h2>
<p>Go to <strong>Materials</strong> and click <strong>Add Material</strong>. Enter:</p>
<ul>
  <li><strong>Name</strong> — e.g., "eSUN PLA+ Black" or "Elegoo Standard Resin Grey"</li>
  <li><strong>Type</strong> — PLA, PETG, ABS, TPU, Resin, Nylon, etc.</li>
  <li><strong>Colour</strong> — hex value for visual identification</li>
  <li><strong>Spool weight</strong> — net weight in grams (typically 1000g)</li>
  <li><strong>Price per spool</strong> — what you pay</li>
  <li><strong>Density</strong> — g/cm³ (PLA: 1.24, PETG: 1.27, ABS: 1.04)</li>
  <li><strong>Current stock</strong> — number of spools on hand</li>
  <li><strong>Low stock threshold</strong> — get alerted when stock drops below this</li>
</ul>

<h2>Cost Per Gram</h2>
<p>Printforge automatically calculates the cost per gram from your spool price and weight. This is the rate used in the calculator. When spool prices change, update the price and the cost-per-gram updates everywhere.</p>

<h2>Material Type Filter</h2>
<p>The Materials page has a type filter dropdown. If you stock 30+ materials, filtering by type (PLA, PETG, etc.) keeps things manageable.</p>

<h2>Colour Swatches</h2>
<p>Each material shows a colour swatch based on the hex colour you entered. This helps visually identify materials in lists and the calculator dropdown.</p>
`,
  },
  {
    slug: "tracking-stock-levels",
    title: "Tracking Stock Levels & Low-Stock Alerts",
    excerpt: "Monitor material and consumable stock, get alerts when supplies run low, and never run out mid-print.",
    category: "inventory",
    difficulty: "intermediate",
    tags: ["stock", "alerts", "low stock", "reorder", "inventory"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["managing-materials", "suppliers-and-consumables"],
    content: `
<p>Running out of filament mid-print is every printer's nightmare. Stock tracking and low-stock alerts help you stay ahead of your material needs.</p>

<h2>Stock Levels</h2>
<p>Each material in your library has a current stock count (number of spools). Update it when you receive new stock or use up a spool. The Materials page shows a status badge for each material:</p>
<ul>
  <li><strong>In Stock</strong> (green) — above the low-stock threshold</li>
  <li><strong>Low Stock</strong> (amber) — at or below the threshold</li>
  <li><strong>Out of Stock</strong> (red) — zero spools remaining</li>
</ul>

<h2>Low-Stock Alerts</h2>
<p>When a material's stock drops to or below its low-stock threshold, it appears in the <strong>Low Stock Alerts</strong> widget on your dashboard. This gives you a daily reminder of what needs reordering.</p>

<h2>Adjusting Stock</h2>
<p>From the material detail page, use the stock adjustment buttons to add or subtract spools. Each adjustment is recorded for your records.</p>

<h2>Spool Scanning</h2>
<p>If you have lots of materials, use the Spool Scanning feature. Scan a QR code or manufacturer barcode to instantly identify the material, adjust stock, or assign it to a printer. You can even print QR labels for your spools.</p>
`,
  },
  {
    slug: "suppliers-and-consumables",
    title: "Managing Suppliers & Consumables",
    excerpt: "Track your material suppliers and monitor consumables like nozzles, build plates, and PTFE tubes.",
    category: "inventory",
    difficulty: "intermediate",
    tags: ["suppliers", "consumables", "nozzles", "build plates", "procurement"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["managing-materials", "tracking-stock-levels"],
    tier: "pro",
    content: `
<p>As your print farm grows, tracking where you buy materials and monitoring consumable wear becomes essential. Printforge's supplier and consumable modules keep everything organised.</p>

<h2>Suppliers</h2>
<p>The Suppliers page stores your material vendors with contact details, website, and the items they supply. For each supplier, you can track:</p>
<ul>
  <li>Supplied items with part numbers and SKUs</li>
  <li>Unit costs for price comparison</li>
  <li>Order history and lead times</li>
</ul>
<p>This helps you compare prices across suppliers and quickly reorder when stock runs low.</p>

<h2>Consumables</h2>
<p>Consumables are items that wear out over time: nozzles, build plates, PTFE tubes, FEP film (for resin printers), glue sticks, IPA, etc. The Consumables page tracks:</p>
<ul>
  <li>Current stock count</li>
  <li>Low-stock threshold with alerts</li>
  <li>Assigned printer (which printer uses this consumable)</li>
  <li>Replacement interval (e.g., "every 500 print hours")</li>
</ul>

<h2>Dashboard Alerts</h2>
<p>Low-stock consumables appear alongside material alerts on your dashboard. No more discovering you're out of nozzles right when a print fails.</p>

<h2>Integration with Cost Calculator</h2>
<p>Consumable costs feed into your printer's maintenance cost, which affects the machine hourly rate in the calculator. Keeping consumable data accurate means your cost calculations reflect true operating expenses.</p>
`,
  },

  // =========================================================================
  // INVOICING & PAYMENTS
  // =========================================================================
  {
    slug: "creating-invoices",
    title: "Creating Invoices from Quotes or Jobs",
    excerpt: "Generate professional invoices with the full lifecycle — from draft to paid — linked to your quotes and jobs.",
    category: "invoicing",
    difficulty: "beginner",
    tags: ["invoices", "billing", "create invoice", "payments"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["invoice-pdf-export", "multi-currency", "creating-a-quote"],
    tier: "pro",
    content: `
<p>Printforge's invoicing system handles the full lifecycle from draft to payment, with professional PDF generation and email delivery.</p>

<h2>Creating an Invoice</h2>
<p>There are three ways to create an invoice:</p>
<ul>
  <li><strong>From a quote</strong> — on the quote detail page, click "Create Invoice". Line items, client, and amounts carry over.</li>
  <li><strong>From a job</strong> — on the job detail page, click "Create Invoice". The linked quote's details populate the invoice.</li>
  <li><strong>From scratch</strong> — go to Invoices → New Invoice and build it manually.</li>
</ul>

<h2>Invoice Numbers</h2>
<p>Invoices are auto-numbered with the format <strong>INV-YYYY-NNN</strong> (e.g., INV-2026-001). Sequential, unique, and professional.</p>

<h2>Invoice Statuses</h2>
<ul>
  <li><strong>Draft</strong> — editing, not yet sent to client</li>
  <li><strong>Sent</strong> — emailed to the client, awaiting payment</li>
  <li><strong>Paid</strong> — payment received (shows PAID watermark on PDF)</li>
  <li><strong>Overdue</strong> — past the due date without payment</li>
  <li><strong>Void</strong> — cancelled invoice</li>
</ul>

<h2>Sending Invoices</h2>
<p>Click "Send" on the invoice detail page to email it to the client. The email includes a professional HTML template with the invoice details and a PDF attachment.</p>

<h2>Marking as Paid</h2>
<p>When you receive payment, change the status to <strong>Paid</strong>. The PDF regenerates with a green "PAID" watermark. This keeps your records clear for accounting.</p>
`,
  },
  {
    slug: "invoice-pdf-export",
    title: "Invoice PDF Export with GST, ABN & PAID Watermark",
    excerpt: "How invoice PDFs work — TAX INVOICE header, GST breakdown, ABN display, and automatic PAID watermark.",
    category: "invoicing",
    difficulty: "intermediate",
    tags: ["PDF", "GST", "ABN", "tax invoice", "watermark"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["creating-invoices", "exporting-quotes-as-pdf"],
    tier: "pro",
    content: `
<p>Printforge generates ATO-compliant TAX INVOICE PDFs with your business details, GST breakdown, and automatic PAID watermark.</p>

<h2>TAX INVOICE Header</h2>
<p>When GST is enabled in your settings, the PDF header reads "TAX INVOICE" instead of just "INVOICE". This is required by the ATO for GST-registered businesses.</p>

<h2>GST Breakdown</h2>
<p>The totals section shows:</p>
<ul>
  <li>Subtotal (ex-GST)</li>
  <li>GST (10%)</li>
  <li>Total (inc-GST)</li>
</ul>
<p>Your ABN is displayed prominently in the header alongside your business details.</p>

<h2>Bank Details</h2>
<p>Configure your bank details in Settings → Business Details. They appear in the PDF footer so clients know where to send payment. Include your BSB, account number, and account name.</p>

<h2>PAID Watermark</h2>
<p>When an invoice is marked as "Paid", the PDF automatically includes a green "PAID" watermark across the page. This provides a clear visual confirmation that the invoice has been settled — useful when clients request copies.</p>

<h2>Business Logo</h2>
<p>Like quotes, invoices show your business logo in the header if you've uploaded one in Settings.</p>
`,
  },
  {
    slug: "multi-currency",
    title: "Multi-Currency Support",
    excerpt: "Display prices in AUD, USD, EUR, or GBP — currency symbols and formatting for international clients.",
    category: "invoicing",
    difficulty: "beginner",
    tags: ["currency", "AUD", "USD", "EUR", "GBP", "international"],
    readingTime: 2,
    publishedAt: "2026-03-01",
    relatedSlugs: ["creating-invoices", "exporting-quotes-as-pdf"],
    content: `
<p>Printforge supports four currencies for display on quotes and invoices. All prices default to AUD but can be switched for international clients.</p>

<h2>Supported Currencies</h2>
<ul>
  <li><strong>AUD</strong> — Australian Dollar ($)</li>
  <li><strong>USD</strong> — US Dollar (US$)</li>
  <li><strong>EUR</strong> — Euro (€)</li>
  <li><strong>GBP</strong> — British Pound (£)</li>
</ul>

<h2>Setting Your Currency</h2>
<p>Your default currency is set in <strong>Settings → Business Details</strong>. This is the currency shown across the platform — calculator, quotes, invoices, and reports.</p>

<h2>Important Note</h2>
<p>Currency display is for formatting only — Printforge does not perform live exchange rate conversions. If you quote in USD, ensure your prices are already in USD. This avoids confusion with fluctuating exchange rates.</p>
`,
  },

  // =========================================================================
  // INTEGRATIONS
  // =========================================================================
  {
    slug: "connecting-shopify",
    title: "Connecting Your Shopify Store",
    excerpt: "Import Shopify orders as jobs, auto-create clients from customers, and keep your fulfilment in sync.",
    category: "integrations",
    difficulty: "beginner",
    tags: ["Shopify", "orders", "sync", "ecommerce"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["xero-accounting-sync", "webhooks-for-automation"],
    tier: "scale",
    content: `
<p>The Shopify integration pulls your unfulfilled orders into Printforge as jobs, automatically creates client records from Shopify customers, and keeps fulfilment status in sync.</p>

<h2>Connecting</h2>
<p>Go to <strong>Settings → Integrations</strong> and click <strong>Connect Shopify</strong>. Enter your Shopify store URL (e.g., my-store.myshopify.com). You'll be redirected to Shopify to authorise the connection. Once approved, your store is linked.</p>

<h2>Importing Orders</h2>
<p>Printforge syncs unfulfilled orders from your Shopify store. Each order becomes a job with:</p>
<ul>
  <li>Customer details auto-populated as a Printforge client</li>
  <li>Order items listed as job line items</li>
  <li>Shipping address and order notes included</li>
</ul>

<h2>Real-Time Sync</h2>
<p>With webhooks configured, new Shopify orders are synced automatically as they come in. Alternatively, you can trigger a manual sync from the Integrations page.</p>

<h2>Fulfilment</h2>
<p>When you move a job to "Shipped" or "Complete" in Printforge, the fulfilment status can be updated in Shopify. This keeps both platforms in sync and ensures your customers receive shipping notifications.</p>

<h2>Tips</h2>
<ul>
  <li>Only unfulfilled orders are imported — already-shipped orders are skipped</li>
  <li>Customer email addresses are matched to existing Printforge clients to avoid duplicates</li>
  <li>Use Shopify tags to identify which orders need 3D printing vs other products</li>
</ul>
`,
  },
  {
    slug: "xero-accounting-sync",
    title: "Setting Up Xero Accounting Sync",
    excerpt: "Push invoices and contacts from Printforge to your Xero account automatically.",
    category: "integrations",
    difficulty: "intermediate",
    tags: ["Xero", "accounting", "sync", "invoices", "contacts"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["creating-invoices", "connecting-shopify"],
    tier: "scale",
    content: `
<p>The Xero integration syncs your Printforge invoices and client contacts directly to your Xero account. No more manual data entry in two systems.</p>

<h2>Connecting</h2>
<p>Go to <strong>Settings → Integrations</strong> and click <strong>Connect Xero</strong>. You'll be redirected to Xero to authorise the connection using OAuth2. Select the Xero organisation you want to link.</p>

<h2>What Gets Synced</h2>
<ul>
  <li><strong>Invoices</strong> — when you send an invoice in Printforge, it's pushed to Xero with matching line items, amounts, and GST</li>
  <li><strong>Contacts</strong> — client details are synced as Xero contacts</li>
  <li><strong>Payments</strong> — when you mark an invoice as paid in Printforge, the payment is recorded in Xero</li>
</ul>

<h2>Account Mapping</h2>
<p>Printforge maps invoice line items to your Xero chart of accounts. By default, sales go to "Sales - Services" (200). You can configure this in the integration settings.</p>

<h2>Sync Direction</h2>
<p>The sync is one-way: Printforge → Xero. Changes made directly in Xero are not pulled back into Printforge. This keeps Printforge as the single source of truth for your quoting and invoicing workflow.</p>

<h2>Disconnecting</h2>
<p>You can disconnect Xero at any time from the Integrations page. This revokes the OAuth token and stops future syncing. Previously synced data remains in both systems.</p>
`,
  },
  {
    slug: "webhooks-for-automation",
    title: "Webhooks for External Automation",
    excerpt: "Send real-time HTTP notifications when jobs or quotes change status — connect to Zapier, Make, or custom APIs.",
    category: "integrations",
    difficulty: "advanced",
    tags: ["webhooks", "automation", "Zapier", "API", "real-time"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["connecting-shopify", "google-drive-onedrive"],
    tier: "pro",
    content: `
<p>Webhooks let you send real-time notifications to any URL when events happen in Printforge. Use them to trigger automations in Zapier, Make, n8n, or your own custom systems.</p>

<h2>Setting Up a Webhook</h2>
<p>Go to <strong>Settings → Integrations → Webhooks</strong>. Click <strong>Add Webhook</strong> and enter:</p>
<ul>
  <li><strong>URL</strong> — the endpoint to receive notifications (e.g., a Zapier catch hook URL)</li>
  <li><strong>Events</strong> — which events trigger this webhook (quote status changed, job status changed, etc.)</li>
</ul>

<h2>Payload</h2>
<p>When an event fires, Printforge sends a POST request to your URL with a JSON payload containing the event type, timestamp, and the full object that changed (quote, job, etc.).</p>

<h2>Use Case Examples</h2>
<ul>
  <li><strong>Slack notification</strong> — get a message in Slack when a quote is accepted</li>
  <li><strong>Email trigger</strong> — send a custom email when a job moves to "Shipped"</li>
  <li><strong>Spreadsheet logging</strong> — append a row to Google Sheets for every new invoice</li>
  <li><strong>Custom dashboard</strong> — update a TV dashboard in your workshop with live job stats</li>
</ul>

<h2>Retry Behaviour</h2>
<p>If your endpoint returns a non-2xx status, Printforge retries the delivery up to 3 times with exponential backoff. Failed deliveries are logged so you can investigate.</p>

<h2>Testing</h2>
<p>Use a tool like <a href="https://webhook.site" target="_blank" rel="noopener noreferrer">webhook.site</a> to generate a temporary URL for testing. Trigger an event in Printforge and check the payload in real time.</p>
`,
  },
  {
    slug: "google-drive-onedrive",
    title: "Google Drive & OneDrive Cloud Sync",
    excerpt: "Export quotes, invoices, and design files to Google Drive or OneDrive with automatic folder structure.",
    category: "integrations",
    difficulty: "beginner",
    tags: ["Google Drive", "OneDrive", "cloud storage", "sync", "export"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["master-backup-to-onedrive", "connecting-shopify"],
    tier: "scale",
    content: `
<p>Cloud storage integration lets you export files from Printforge to Google Drive or OneDrive. Design files, quote PDFs, and invoice PDFs can be pushed to the cloud with one click.</p>

<h2>Connecting</h2>
<p>Go to <strong>Settings → Integrations</strong> and click <strong>Connect Google Drive</strong> or <strong>Connect OneDrive</strong>. You'll be redirected to authorise Printforge via OAuth. Once connected, Printforge creates an organised folder structure in your cloud drive.</p>

<h2>Folder Structure</h2>
<p>Printforge creates a "Printforge CRM" folder with subfolders for:</p>
<ul>
  <li><strong>Quotes</strong> — exported quote PDFs</li>
  <li><strong>Invoices</strong> — exported invoice PDFs</li>
  <li><strong>Design Files</strong> — files from Design Studio projects</li>
</ul>

<h2>Exporting Files</h2>
<p>On any quote, invoice, or design project, click the <strong>Export to Cloud</strong> button. Choose Google Drive or OneDrive (whichever you've connected), and the file is uploaded to the appropriate folder.</p>

<h2>Importing Files</h2>
<p>The Cloud File Picker lets you import files from your cloud drive into Printforge. Useful for importing reference images, design files, or customer-provided documents.</p>

<h2>Security</h2>
<p>OAuth tokens are encrypted with AES-256-GCM before storage. Printforge only requests the minimum permissions needed — for Google Drive, it uses the <code>drive.file</code> scope (limited to files it creates). You can disconnect at any time.</p>
`,
  },
  {
    slug: "master-backup-to-onedrive",
    title: "Master Backup to OneDrive",
    excerpt: "Run a full platform backup to OneDrive — all data, quotes, invoices, design files, and job photos.",
    category: "integrations",
    difficulty: "intermediate",
    tags: ["backup", "OneDrive", "data export", "disaster recovery"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["google-drive-onedrive"],
    tier: "scale",
    content: `
<p>The Master Backup feature creates a comprehensive backup of your entire Printforge account to OneDrive. Data, documents, and media — everything in one timestamped folder.</p>

<h2>What's Backed Up</h2>
<p>The backup includes five categories:</p>
<ol>
  <li><strong>Data files</strong> — 17 JSON files covering users, quotes, invoices, clients, jobs, printers, materials, suppliers, consumables, settings, and more</li>
  <li><strong>Quote PDFs</strong> — generated PDFs for all your quotes</li>
  <li><strong>Invoice PDFs</strong> — generated PDFs for all your invoices</li>
  <li><strong>Design files</strong> — all files from Design Studio projects</li>
  <li><strong>Job photos</strong> — all uploaded photos from your jobs</li>
</ol>

<h2>Running a Backup</h2>
<p>Go to <strong>Settings → Integrations → OneDrive</strong> (you must have OneDrive connected first). Click <strong>Run Master Backup</strong>. A modal shows real-time progress with:</p>
<ul>
  <li>Current phase and item being backed up</li>
  <li>Progress bar and item counter</li>
  <li>Any warnings (e.g., skipped files) shown inline</li>
  <li>Final summary of items backed up per category</li>
</ul>

<h2>Backup Structure</h2>
<p>The backup creates a timestamped folder in your OneDrive:</p>
<pre>Printforge CRM/Backups/2026-03-01T10-30-00Z/
  ├── Data/        (17 JSON files)
  ├── Quotes/      (PDF files)
  ├── Invoices/    (PDF files)
  ├── Design Files/
  ├── Job Photos/
  └── manifest.json</pre>
<p>The <code>manifest.json</code> records what was backed up, counts per category, and any errors encountered.</p>

<h2>Rate Limiting</h2>
<p>Backups can be run once per hour. This prevents accidental overload on the OneDrive API and ensures large backups complete before starting another.</p>
`,
  },

  // =========================================================================
  // ADVANCED FEATURES
  // =========================================================================
  {
    slug: "design-studio-ai-chat",
    title: "Design Studio with AI Chat & Vision",
    excerpt: "Manage design projects with AI-powered brainstorming, reference image analysis, file versioning, and design briefs.",
    category: "advanced",
    difficulty: "intermediate",
    tags: ["Design Studio", "AI", "chat", "vision", "brainstorming"],
    readingTime: 5,
    publishedAt: "2026-03-01",
    relatedSlugs: ["ai-quote-assistant", "generating-part-drawings"],
    tier: "scale",
    content: `
<p>Design Studio is your AI-powered workspace for managing product design projects — from initial concept to production-ready files.</p>

<h2>Creating a Design Project</h2>
<p>Navigate to <strong>Design Studio</strong> in the sidebar and click <strong>New Design</strong>. Give it a name and description. Each project gets a unique design number (DS-YYYY-NNN) for tracking.</p>

<h2>AI Chat</h2>
<p>The chat panel is your AI design assistant. Ask it anything about your project:</p>
<ul>
  <li>"What's the best material for an outdoor mounting bracket?"</li>
  <li>"Suggest dimensions for a phone stand that fits an iPhone 15 Pro"</li>
  <li>"What wall thickness should I use for this enclosure?"</li>
</ul>
<p>The AI understands 3D printing concepts — tolerances, material properties, structural requirements — and gives practical advice.</p>

<h2>Reference Image Analysis</h2>
<p>Upload reference images (photos of existing products, sketches, competitor examples) and the AI analyses them. It identifies design elements, suggests improvements, and helps you brief the design. Upload an image to the chat to get analysis.</p>

<h2>Design Brief</h2>
<p>Generate a structured design brief from your chat conversation. The brief summarises the project goals, materials, dimensions, and requirements — a document you can share with designers or reference during modelling.</p>

<h2>Files &amp; Revisions</h2>
<p>Upload design files (STL, STEP, 3MF, OBJ) to the project. Each upload can be a new revision with notes about what changed. The revision timeline shows the complete design history.</p>

<h2>Convert to Quote</h2>
<p>When the design is ready for production, click <strong>Create Quote</strong> from the design project. A new quote is pre-filled with the project details and linked back to the design.</p>
`,
  },
  {
    slug: "ai-quote-assistant",
    title: "Using the AI Quote Assistant",
    excerpt: "Describe a job in plain English and let AI generate structured line items with material and printer suggestions.",
    category: "advanced",
    difficulty: "intermediate",
    tags: ["AI", "quote assistant", "automation", "line items"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["creating-a-quote", "design-studio-ai-chat"],
    tier: "pro",
    content: `
<p>The AI Quote Assistant turns a plain English description into a structured quote with line items, material suggestions, and estimated costs.</p>

<h2>How It Works</h2>
<p>On the quote creation page, click the <strong>AI Assistant</strong> button. Describe the job in natural language:</p>
<blockquote>"Customer needs 5 custom cable clips in PETG, about 3cm each, snap-fit design. Also wants a mounting plate in PLA, roughly 15cm x 10cm, 3mm thick."</blockquote>

<h2>What the AI Generates</h2>
<p>The assistant analyses your description and creates structured line items:</p>
<ul>
  <li><strong>Item descriptions</strong> — clear, professional descriptions for each part</li>
  <li><strong>Material suggestions</strong> — matched to materials in your library</li>
  <li><strong>Quantity</strong> — extracted from your description</li>
  <li><strong>Estimated dimensions and weight</strong> — based on the described parts</li>
</ul>

<h2>Review and Edit</h2>
<p>The AI's output is a suggestion — review the generated line items, adjust prices, quantities, or descriptions, and then add them to your quote. The AI helps you get 80% of the way there; you provide the final polish.</p>

<h2>Tips</h2>
<ul>
  <li>Be specific about quantities, materials, and dimensions for better results</li>
  <li>Mention any special requirements (heat resistance, flexibility, food safe)</li>
  <li>The AI knows your printer and material library, so it suggests from your actual inventory</li>
</ul>
`,
  },
  {
    slug: "generating-part-drawings",
    title: "Generating Part Drawings from STL Files",
    excerpt: "Create technical drawings with orthographic views and dimension annotations from your STL files.",
    category: "advanced",
    difficulty: "intermediate",
    tags: ["Part Drawings", "STL", "technical drawing", "orthographic", "dimensions"],
    readingTime: 4,
    publishedAt: "2026-03-01",
    relatedSlugs: ["uploading-stl-files", "exporting-quotes-as-pdf"],
    tier: "pro",
    content: `
<p>Part Drawings generates professional technical drawings from your STL files — four orthographic views with dimension annotations, exported as A3 landscape PDFs.</p>

<h2>Creating a Drawing</h2>
<p>Navigate to <strong>Part Drawings</strong> in the Engineering section of the sidebar. Click <strong>New Drawing</strong> and upload an STL file. Printforge renders the model in four views:</p>
<ul>
  <li><strong>Front view</strong> — looking at the model from the front</li>
  <li><strong>Side view</strong> — looking from the right side</li>
  <li><strong>Top view</strong> — looking down from above</li>
  <li><strong>Isometric view</strong> — 3D perspective view</li>
</ul>

<h2>Dimension Annotations</h2>
<p>Each orthographic view includes dimension lines showing the part's measurements in millimetres. Width, height, and depth are annotated on the appropriate views. These measurements come directly from the STL file's geometry.</p>

<h2>PDF Export</h2>
<p>Click <strong>Export PDF</strong> to generate an A3 landscape PDF with a professional title block. The title block includes the drawing title, date, material, and your business name. The PDF is suitable for printing, archiving, or sharing with clients and manufacturers.</p>

<h2>Use Cases</h2>
<ul>
  <li><strong>Client approval</strong> — share a drawing before printing so clients can verify dimensions</li>
  <li><strong>Quality control</strong> — measure printed parts against the drawing's specified dimensions</li>
  <li><strong>Documentation</strong> — maintain technical records of every part you produce</li>
  <li><strong>Manufacturing handoff</strong> — if scaling to injection moulding, drawings communicate specifications</li>
</ul>
`,
  },
  {
    slug: "dashboard-analytics-csv",
    title: "Dashboard Analytics & CSV Export",
    excerpt: "Use dashboard analytics for business insights and export data to CSV for reporting and analysis.",
    category: "advanced",
    difficulty: "beginner",
    tags: ["analytics", "dashboard", "CSV", "export", "reports"],
    readingTime: 3,
    publishedAt: "2026-03-01",
    relatedSlugs: ["how-the-cost-calculator-works", "tracking-quote-status"],
    tier: "starter",
    content: `
<p>The dashboard gives you a snapshot of your business health. Analytics and CSV export help you make data-driven decisions.</p>

<h2>Dashboard Stats</h2>
<p>The dashboard shows at-a-glance cards for:</p>
<ul>
  <li><strong>Quote counts by status</strong> — draft, sent, accepted, rejected, expired</li>
  <li><strong>Accepted revenue</strong> — total value of accepted quotes</li>
  <li><strong>Active jobs</strong> — jobs currently in production</li>
  <li><strong>Printer &amp; material counts</strong> — size of your fleet and library</li>
  <li><strong>Low stock alerts</strong> — materials and consumables below threshold</li>
</ul>

<h2>Analytics (Starter+)</h2>
<p>Starter plan and above unlock deeper analytics:</p>
<ul>
  <li><strong>Printer utilisation</strong> — bar chart showing how much each printer is used</li>
  <li><strong>Top materials</strong> — your most-used materials by volume</li>
  <li><strong>Average markup</strong> — your typical profit margin across quotes</li>
  <li><strong>Revenue trends</strong> — monthly revenue from accepted quotes</li>
</ul>

<h2>CSV Export (Starter+)</h2>
<p>Export your quotes, clients, or jobs as CSV files for analysis in Excel, Google Sheets, or your accounting software. On any list page, click the <strong>Export CSV</strong> button (available with bulk actions). The CSV includes all visible columns.</p>

<h2>Tips</h2>
<ul>
  <li>Check analytics weekly to spot trends — declining quote conversion might mean your pricing needs adjustment</li>
  <li>Export CSVs monthly for bookkeeping and tax preparation</li>
  <li>Use printer utilisation data to identify underused machines</li>
</ul>
`,
  },

  // =========================================================================
  // BUSINESS GUIDES
  // =========================================================================
  {
    slug: "pricing-your-3d-prints",
    title: "How to Price 3D Prints for Profit",
    excerpt: "A practical guide to pricing strategy — covering costs, competition, and finding the right margin for your business.",
    category: "business-guides",
    difficulty: "beginner",
    tags: ["pricing", "profit", "business", "strategy", "margins"],
    readingTime: 6,
    publishedAt: "2026-03-01",
    relatedSlugs: ["how-the-cost-calculator-works", "understanding-the-cost-breakdown"],
    content: `
<p>Getting pricing right is the single biggest factor in whether your 3D printing business thrives or struggles. This guide walks through a practical approach to pricing that covers your costs, stays competitive, and builds a profitable business.</p>

<h2>Know Your True Costs</h2>
<p>Most new print businesses only count material cost. In reality, material is typically just 20–35% of your total cost. The full picture includes:</p>
<ul>
  <li><strong>Material</strong> — filament/resin cost including waste and failed prints</li>
  <li><strong>Machine time</strong> — electricity, depreciation, and wear</li>
  <li><strong>Labour</strong> — design, setup, post-processing, QC, and packing</li>
  <li><strong>Overhead</strong> — rent, software, insurance, marketing</li>
</ul>
<p>Use Printforge's calculator to get exact numbers for each component. If you're consistently underpricing, the breakdown will show you exactly where the money goes.</p>

<h2>Markup vs Margin</h2>
<p>These are different numbers. A 50% markup on a $20 cost gives you a $30 price and $10 profit — which is a 33% margin. A 100% markup gives you 50% margin. Know which number you're using and be consistent.</p>

<h2>Competitive Research</h2>
<p>Check what competitors charge for similar work. Look at Etsy listings, local print shops, and online quoting services. If your calculated price is significantly higher, look for efficiency gains rather than cutting your margin.</p>

<h2>Segment Your Pricing</h2>
<ul>
  <li><strong>Hobby/personal prints</strong> — lower margin, higher volume</li>
  <li><strong>Commercial/business parts</strong> — higher margin, clients value reliability</li>
  <li><strong>Prototyping</strong> — premium pricing for fast turnaround</li>
  <li><strong>Bulk orders</strong> — discount per-unit, make up on volume</li>
</ul>

<h2>The Bottom Line</h2>
<p>Don't compete on price alone. Compete on reliability (prints arrive on time), quality (consistent results), and communication (clear quotes, professional invoices). Printforge helps you present professionally, which justifies higher prices. A customer who receives a polished PDF quote is more likely to accept than one who gets a number scribbled in a message.</p>
`,
  },
  {
    slug: "growing-your-print-business",
    title: "Growing Your 3D Print Business: From Side Hustle to Full-Time",
    excerpt: "Practical steps for scaling up — finding clients, managing workflow, and knowing when to invest in more capacity.",
    category: "business-guides",
    difficulty: "intermediate",
    tags: ["growth", "scaling", "business", "clients", "marketing"],
    readingTime: 6,
    publishedAt: "2026-03-01",
    relatedSlugs: ["pricing-your-3d-prints", "job-workflow"],
    content: `
<p>The path from "I printed something cool" to "I run a 3D printing business" doesn't happen overnight. Here's a practical roadmap for scaling up.</p>

<h2>Finding Your First Clients</h2>
<p>Start where demand already exists:</p>
<ul>
  <li><strong>Local businesses</strong> — tradies, mechanics, retailers who need custom parts or fixtures</li>
  <li><strong>Online marketplaces</strong> — list designs on Etsy, eBay, or your Shopify store</li>
  <li><strong>Facebook groups</strong> — 3D printing, maker, and niche hobby communities</li>
  <li><strong>Word of mouth</strong> — every good job generates referrals</li>
</ul>

<h2>Systematise Early</h2>
<p>The difference between a hobby and a business is systems. From day one:</p>
<ul>
  <li>Quote every job properly (even small ones) — it builds the habit and creates records</li>
  <li>Track every client in your database — you'll thank yourself when they return</li>
  <li>Use job tracking for every order — it prevents things falling through the cracks</li>
  <li>Invoice promptly — late invoicing leads to late payment</li>
</ul>

<h2>When to Add Capacity</h2>
<p>If you're consistently booked out more than 2 weeks ahead, it's time to consider a second (or third) printer. Look at your job data:</p>
<ul>
  <li>What's your average turnaround time?</li>
  <li>How many jobs are sitting in "Queued" waiting for a printer?</li>
  <li>What's your printer utilisation rate?</li>
</ul>
<p>Printforge's calendar and analytics give you these numbers. Don't buy based on gut feel — buy based on data.</p>

<h2>Going Full-Time</h2>
<p>Before making the leap, ensure you have:</p>
<ul>
  <li>At least 3 months of consistent revenue that covers your living expenses + business costs</li>
  <li>A pipeline of recurring clients (not just one-off projects)</li>
  <li>Systems in place so you're not spending all day on admin</li>
  <li>A financial buffer for slow months</li>
</ul>

<h2>Leverage Software</h2>
<p>As you scale, the admin workload scales too — unless you automate. Printforge handles quoting, invoicing, job tracking, and client management so you can focus on printing and growing. The time you save on admin is time you can spend finding new clients or improving your processes.</p>
`,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find a single article by slug */
export function getLearnArticle(slug: string): LearnArticle | undefined {
  return LEARN_ARTICLES.find((a) => a.slug === slug);
}

/** Get all articles in a category, sorted by difficulty (beginner first) */
export function getArticlesByCategory(category: ArticleCategory): LearnArticle[] {
  const order: Record<ArticleDifficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };
  return LEARN_ARTICLES
    .filter((a) => a.category === category)
    .sort((a, b) => order[a.difficulty] - order[b.difficulty]);
}

/** Search articles by query (matches title, excerpt, tags) */
export function searchArticles(query: string): LearnArticle[] {
  const q = query.toLowerCase().trim();
  if (!q) return LEARN_ARTICLES;
  return LEARN_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q))
  );
}

/** Get a category by slug */
export function getLearnCategory(slug: ArticleCategory): LearnCategory | undefined {
  return LEARN_CATEGORIES.find((c) => c.slug === slug);
}

/** Inject IDs into h2/h3 tags for TOC linking */
export function addHeadingIds(html: string): string {
  return html.replace(
    /<(h[23])([^>]*)>(.*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, text: string) => {
      const id = text
        .replace(/<[^>]+>/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return `<${tag}${attrs} id="${id}">${text}</${tag}>`;
    }
  );
}

/** Extract headings from HTML for table of contents */
export function extractHeadings(html: string): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  const regex = /<h([23])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/gi;
  const processed = addHeadingIds(html);
  let match;
  const idRegex = /<h([23])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/gi;
  while ((match = idRegex.exec(processed)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3].replace(/<[^>]+>/g, ""),
    });
  }
  return headings;
}
