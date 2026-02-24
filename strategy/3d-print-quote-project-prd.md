# \# Project: 3D Print Quote

# 

# \## What We're Building

# 

# A web application that replicates and improves upon \[3DPrintDesk.com](https://3dprintdesk.com/) — an all-in-one SaaS platform for 3D printing businesses. The core value proposition: \*\*stop guessing your 3D print costs, manage your entire 3D printing business from one place.\*\*

# 

# The original site charges $19/mo and offers: cost calculation, client management, quote generation, and inventory tracking. We're building our own version tailored to the Printforge business model (printforge.com.au), with the flexibility to offer it as a standalone product later.

# 

# \## Target Users

# 

# 1\. \*\*Primary:\*\* Daniel (Printforge) — needs to accurately quote 3D print jobs for tradies, EV owners, families, and makers

# 2\. \*\*Secondary:\*\* Other small 3D printing business owners / makers who sell prints

# 3\. \*\*Tertiary:\*\* Hobbyists who want to know what their prints actually cost

# 

# \## Core Feature Set

# 

# \### 1. Cost Calculator (MVP — build first)

# 

# The heart of the app. Must calculate the true cost of a 3D print job by factoring in:

# 

# \*\*Material Costs:\*\*

# \- Filament type (PLA, PETG, ABS, TPU, ASA, Nylon, custom)

# \- Filament brand and colour

# \- Spool weight (typically 1kg)

# \- Spool price (AUD)

# \- Print weight in grams (from slicer)

# \- Support material weight (often different/wasted material)

# \- Waste/failure factor (percentage buffer, e.g., 5-15%)

# 

# \*\*Machine Costs:\*\*

# \- Printer purchase price

# \- Expected lifetime hours

# \- Depreciation per hour = purchase price / lifetime hours

# \- Print time (hours:minutes from slicer)

# \- Power consumption (watts)

# \- Electricity rate ($/kWh) — default to Australian rates

# \- Maintenance cost allowance (per hour or per print)

# \- Nozzle/hotend/belt replacement amortised cost

# 

# \*\*Labour Costs:\*\*

# \- Design time (hours, if custom design work)

# \- Hourly rate for design

# \- Setup/prep time (bed prep, slicer config, file handling)

# \- Post-processing time (support removal, sanding, painting, assembly)

# \- Hourly rate for labour

# \- Packing/shipping handling time

# 

# \*\*Overhead Costs:\*\*

# \- Rent/workspace allocation (optional)

# \- Software subscriptions (CAD, slicer pro, etc.)

# \- Insurance

# \- Other fixed monthly costs

# \- Spread across estimated monthly print jobs

# 

# \*\*Markup \& Pricing:\*\*

# \- Cost subtotal (sum of all above)

# \- Markup percentage (e.g., 30-100%)

# \- Final quote price = cost × (1 + markup%)

# \- Minimum charge threshold (e.g., never quote below $15)

# \- Quantity discounts (tiered pricing for batch jobs)

# \- Rush job multiplier

# 

# \*\*Calculator UX:\*\*

# \- Real-time calculation as inputs change

# \- Save calculator presets (e.g., "Standard PLA job", "Multi-colour PETG")

# \- Import slicer data (parse gcode for time + material estimates)

# \- Cost breakdown chart/visualisation

# \- Per-unit cost for batch quantities

# \- Currency: AUD default, support USD/EUR/GBP

# 

# \### 2. Printer Profiles

# 

# \- Add multiple printers (e.g., Bambu Lab X1C, P1S, A1 Mini)

# \- Per-printer: purchase price, power consumption, bed size, lifetime hours, maintenance schedule

# \- Per-printer hourly rate auto-calculated

# \- Select printer when creating a quote

# \- Track usage hours per printer

# 

# \### 3. Material Library

# 

# \- Catalogue of all filaments/resins owned

# \- Per material: type, brand, colour, spool weight, price, density

# \- Current stock level (spools on hand)

# \- Low stock alerts

# \- Link materials to quotes for automatic cost lookup

# \- Support for both FDM filament and resin (SLA/DLP)

# 

# \### 4. Quote Generator

# 

# \- Create professional quotes from calculator results

# \- Client details (name, email, phone, company)

# \- Quote number (auto-incrementing, e.g., PF-2026-001)

# \- Line items (multiple prints per quote)

# \- Notes/special instructions

# \- Terms and conditions

# \- Quote expiry date

# \- Export as PDF (branded with business logo/details)

# \- Email quote directly to client

# \- Quote statuses: Draft → Sent → Accepted → Rejected → Expired

# 

# \### 5. Client Management (CRM Lite)

# 

# \- Client database (name, email, phone, company, address, notes)

# \- Client history (all past quotes and jobs)

# \- Tag/categorise clients (tradie, EV owner, maker, commercial, etc.)

# \- Quick re-quote from previous jobs

# \- Contact notes / interaction log

# 

# \### 6. Job Tracking

# 

# \- Convert accepted quotes into jobs

# \- Job statuses: Queued → Printing → Post-processing → Quality Check → Packing → Shipped/Collected → Complete

# \- Assign to specific printer

# \- Track actual vs estimated time

# \- Track actual vs estimated material usage

# \- Job notes and photos

# \- Simple Kanban or list view

# 

# \### 7. Inventory Management

# 

# \- Material stock levels (auto-deduct from completed jobs)

# \- Hardware consumables (nozzles, build plates, etc.)

# \- Reorder alerts

# \- Purchase history / cost tracking

# \- Supplier info

# 

# \### 8. Dashboard

# 

# \- Revenue overview (this week/month/quarter)

# \- Jobs in progress

# \- Pending quotes

# \- Low stock alerts

# \- Printer utilisation

# \- Most profitable print types

# \- Average markup achieved

# 

# \### 9. Settings \& Configuration

# 

# \- Business details (name, logo, address, ABN for Australian businesses)

# \- Default currency and units (metric)

# \- Default electricity rate

# \- Default markup

# \- Default labour rates

# \- Quote template customisation

# \- Email settings (SMTP or integration)

# 

# \## Technical Architecture

# 

# \### Stack (Recommended)

# 

# \- \*\*Frontend:\*\* Next.js 14+ (App Router) with TypeScript

# \- \*\*Styling:\*\* Tailwind CSS + shadcn/ui components

# \- \*\*Database:\*\* PostgreSQL (via Supabase or self-hosted)

# \- \*\*Auth:\*\* Supabase Auth or NextAuth.js

# \- \*\*ORM:\*\* Prisma

# \- \*\*PDF Generation:\*\* @react-pdf/renderer or puppeteer

# \- \*\*Email:\*\* Resend or Nodemailer

# \- \*\*Hosting:\*\* Vercel (frontend) + Supabase (backend) OR Docker self-hosted

# \- \*\*File Storage:\*\* Supabase Storage or S3-compatible

# 

# \### Data Model (Core Entities)

# 

# ```

# User

# &nbsp; - id, email, name, business\_name, logo\_url, settings\_json

# 

# Printer

# &nbsp; - id, user\_id, name, model, purchase\_price, lifetime\_hours,

# &nbsp;   power\_watts, bed\_size, notes, current\_hours, created\_at

# 

# Material

# &nbsp; - id, user\_id, type (filament/resin), material\_type (PLA/PETG/etc),

# &nbsp;   brand, colour, spool\_weight\_g, price, density, stock\_qty,

# &nbsp;   low\_stock\_threshold, supplier, notes

# 

# Client

# &nbsp; - id, user\_id, name, email, phone, company, address,

# &nbsp;   tags\[], notes, created\_at

# 

# Quote

# &nbsp; - id, user\_id, client\_id, quote\_number, status,

# &nbsp;   subtotal, markup\_pct, total, currency, notes,

# &nbsp;   terms, expiry\_date, created\_at, sent\_at

# 

# QuoteLineItem

# &nbsp; - id, quote\_id, description, printer\_id, material\_id,

# &nbsp;   print\_weight\_g, print\_time\_minutes, material\_cost,

# &nbsp;   machine\_cost, labour\_cost, overhead\_cost, line\_total,

# &nbsp;   quantity, notes

# 

# Job

# &nbsp; - id, quote\_id, user\_id, status, printer\_id,

# &nbsp;   actual\_time\_minutes, actual\_weight\_g, notes,

# &nbsp;   started\_at, completed\_at

# 

# CalculatorPreset

# &nbsp; - id, user\_id, name, config\_json

# 

# Settings

# &nbsp; - id, user\_id, default\_currency, default\_electricity\_rate,

# &nbsp;   default\_markup\_pct, default\_labour\_rate, default\_overhead\_monthly,

# &nbsp;   business\_details\_json, quote\_terms\_text

# ```

# 

# \### Key Pages / Routes

# 

# ```

# /                       → Landing page (marketing, if public) or redirect to /dashboard

# /login                  → Auth

# /register               → Auth

# /dashboard              → Overview dashboard

# /calculator             → Cost calculator (standalone use)

# /calculator/presets      → Saved calculator presets

# /quotes                 → Quote list

# /quotes/new             → Create quote (uses calculator)

# /quotes/\[id]            → View/edit quote

# /quotes/\[id]/pdf        → PDF preview/download

# /clients                → Client list

# /clients/\[id]           → Client detail + history

# /jobs                   → Job tracker (kanban or list)

# /jobs/\[id]              → Job detail

# /inventory/materials    → Material library

# /inventory/printers     → Printer profiles

# /inventory/consumables  → Hardware consumables

# /settings               → Business settings, defaults, profile

# ```

# 

# \## Design Direction

# 

# \- Clean, modern, professional — not flashy

# \- Dark mode support (3D printer operators often work in dim workshops)

# \- Mobile responsive (check quotes on phone at market stalls / customer meetings)

# \- Dashboard-first navigation (sidebar with icons)

# \- Accent colour: match Printforge branding or use a maker/industrial palette

# \- Data-dense where appropriate (tables, stats) but never cluttered

# \- Fast — calculator must feel instant, no loading spinners for calculations

# 

# \## Build Priority

# 

# 1\. \*\*Phase 1 — Calculator MVP:\*\* Cost calculator with all input fields, real-time calculation, save presets. This alone is useful.

# 2\. \*\*Phase 2 — Materials \& Printers:\*\* Material library and printer profiles that feed into the calculator.

# 3\. \*\*Phase 3 — Quotes:\*\* Quote generation from calculator, PDF export, basic client info.

# 4\. \*\*Phase 4 — CRM \& Jobs:\*\* Client management, quote status tracking, job tracking.

# 5\. \*\*Phase 5 — Dashboard \& Inventory:\*\* Overview dashboard, stock management, analytics.

# 6\. \*\*Phase 6 — Polish:\*\* Email integration, Gcode parsing, public landing page, subscription/billing if going SaaS.

# 

# \## Important Notes

# 

# \- All prices in AUD by default, support multi-currency

# \- Use metric (grams, mm, etc.) — this is Australia

# \- The calculator is the hero feature — it must be excellent before building other modules

# \- Keep the data model extensible — we may add resin printing, CNC, laser cutting later

# \- This should eventually be deployable as a standalone SaaS product, not just a personal tool

# \- Consider multi-tenancy from the start (user\_id on every table)

# 

# \## Reference

# 

# \- \[3DPrintDesk.com](https://3dprintdesk.com/) — primary inspiration. $19/mo SaaS. Cost calculator + client management + quotes + inventory.

# \- \[3DPrintingCostCalculator.com](https://3dprintingcostcalculator.com/) — competitor with PRO tier. Quote manager, inventory, branded PDFs.

# \- \[3DPBOSS](https://3dpboss.com/) — Notion-based 3D printing business management. More complex, covers team management and procurement.

# \- \[Fabbaloo Calculator](https://www.fabbaloo.com/calc) — simple but well-designed single-page cost calculator.

# \- \[3DWithUs Calculator](https://3dwithus.com/3d-print-cost-calculator) — good UX reference for a clean calculator interface.

