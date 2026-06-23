# Dimaso RFP Radar

Private opportunity intelligence for finding and scoring realistic web development and maintenance RFPs while excluding US government procurement.

## Local setup

1. Install Node 20+ and run `pnpm install`.
2. Copy `.env.example` to `.env.local` and add Supabase, Brave Search, private-access, and optional Resend credentials.
3. Run `pnpm db:generate && pnpm db:push`.
4. Start the app with `pnpm dev`.

Demo data is used only when no database is configured. With Supabase connected, the dashboard contains real scanned sources only. Search ingestion requires `BRAVE_SEARCH_API_KEY`. Daily scan and digest routes are configured in `vercel.json` for 08:00 and 08:15 Europe/Belgrade during summer time (Vercel cron uses UTC).

## Important routes

- `/` — priority dashboard (Good Fit and Review by default)
- `/opportunities` and `/opportunities/[id]` — complete pipeline and score detail
- `/sources` — default query management
- `/opportunities/new` — public URL intake
- `/api/cron/target-scan` — direct daily monitoring of verified US target organization RFP/vendor pages
- `/api/cron/digest` — Resend email digest after the target-site scan

The ingestion helper fetches public HTML only, identifies itself, times out slow requests, discovers linked PDF/DOC/DOCX files, and never attempts to authenticate or bypass paywalls. Production deployments should add application authentication and a fuller robots.txt policy before inviting users.
