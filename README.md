# Dimaso RFP Radar

Private opportunity intelligence for finding and scoring realistic web development and maintenance RFPs while excluding US government procurement.

## Local setup

1. Install Node 20+ and run `pnpm install`.
2. Copy `.env.example` to `.env.local` and add Supabase, Brave Search, private-access, and optional Resend credentials.
3. Run `pnpm db:generate && pnpm db:push`.
4. Start the app with `pnpm dev`.

Demo data is used only when no database is configured. With Supabase connected, the dashboard contains real scanned sources only. Search ingestion can use optional search providers, but the main workflow crawls verified target organization RFP/vendor pages directly. The daily target scan is configured in `vercel.json` for 08:00 Europe/Belgrade during summer time (Vercel cron uses UTC). Daily email digests are disabled.

## Important routes

- `/` — priority dashboard (Good Fit and Review by default)
- `/opportunities` and `/opportunities/[id]` — complete pipeline and score detail
- `/sources` — default query management
- `/opportunities/new` — public URL intake
- `/api/cron/target-scan` — direct daily monitoring of verified US target organization RFP/vendor pages
- `/api/cron/digest` — manual-only Resend email digest endpoint; not scheduled in production

The ingestion helper fetches public HTML only, identifies itself, times out slow requests, discovers linked PDF/DOC/DOCX files, and never attempts to authenticate or bypass paywalls. Production deployments should add application authentication and a fuller robots.txt policy before inviting users.
