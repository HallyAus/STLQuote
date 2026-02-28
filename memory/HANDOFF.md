# Session Handoff

> Bridge between Claude Code sessions. Updated at the end of every session.
> The SessionStart hook auto-injects this into context.

## Last Updated

- **Date:** 2026-03-01 08:00
- **Branch:** main
- **Focus:** v5.10.0 — Master Backup to OneDrive + Fix Customer Upload

## Accomplished

- **This session — v5.10.0**:
  - **Fix Customer Upload (STL + PDF)**:
    - Added `pdf` to `ALLOWED_EXTENSIONS` in upload route
    - Added PDF magic byte validation (`%PDF-` header)
    - Relaxed STL ASCII check: accept if starts with `solid` (don't require `endsolid`)
    - Updated Prisma `UploadLink.allowedTypes` default to include `pdf`
    - Migration 0034: updates default + existing links to include `pdf`
  - **Master Backup to OneDrive**:
    - `src/lib/onedrive.ts`: Added `uploadLargeFile()` (resumable upload sessions, 5MB chunks) and `uploadFileAuto()` (routes to simple/resumable based on size)
    - `src/app/api/cloud/backup/route.ts`: SSE streaming backup endpoint with 5 phases (17 JSON data files, quote PDFs, invoice PDFs, design files, job photos) + manifest.json. Rate limited 1/hour, feature-gated `cloud_storage`, non-fatal error handling.
    - `src/components/cloud/master-backup-button.tsx`: Button + Dialog modal with phase label, item name, counter, progress bar, inline warnings, completion summary.
    - Wired into `onedrive-settings.tsx` — shows when OneDrive connected + folders set up.
    - Backup folder structure: `Printforge CRM/Backups/{timestamp}/Data/`, `Quotes/`, `Invoices/`, `Design Files/`, `Job Photos/`, `manifest.json`
  - Build type-checked OK (EPERM symlink errors are Windows-only, not code issues)
- **Prior sessions**: v5.9.0 Part Drawings, v5.8.1 Security, v5.3.0 Drip Emails, v5.2.0 Cloud Storage, v5.0.0 Design Studio, v4.15.3 Security, v4.1.0–v4.15.0, v3.0.0, v1.0.0

## In Progress

_None_

## Pending User Requests

1. **Roadmap filter**: Make status counts clickable to filter roadmap items
2. **Shopify email**: Custom Liquid email template for CRM launch announcement
3. **Stripe admin portal**: Fix Stripe for subscription collection in admin panel
4. **Landing page improvements**: User liked 3dprintdesk.com — consider further polish

## Next Steps

1. Deploy v5.10.0 — run migration 0034 on production DB
2. Test customer upload with PDF files through an upload link
3. Test master backup end-to-end (connect OneDrive → backup → verify folder structure)
4. Test large file (>4MB) upload via resumable upload
5. Continue with pending user requests

## Context

- Version: 5.10.0
- App URL: crm.printforge.com.au
- Tiers: Free / Pro ($29/mo, $290/yr), 14-day trial; admins always Pro
- Cloud Storage: Pro feature, encrypted tokens (AES-256-GCM), Google Drive + OneDrive
- Backup: OneDrive only, SSE streaming, 1/hour rate limit, 5 phases + manifest
- Customer Upload: now accepts STL + PDF, relaxed STL ASCII validation
