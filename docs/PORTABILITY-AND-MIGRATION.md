# AI Hidden Leads — Portability & Migration Guide

How to take this app out of Lovable, keep it in your own GitHub repo, run it against your own
Supabase project, and rebuild/extend it inside another AI coding tool (Google AI Studio, Cursor,
Windsurf, Replit, Claude Code, etc.).

---

## 1. What is actually "Lovable-specific"

Almost nothing. The app is a **standard Vite + React 18 + TypeScript + Tailwind + shadcn/ui**
frontend talking to a **standard Supabase backend** (Postgres + Auth + Edge Functions + Storage).

| Piece | Lovable-specific? | Notes |
|---|---|---|
| `src/**` React code | No | Plain Vite/React |
| `supabase/migrations/**` | No | Plain SQL, runs on any Supabase/Postgres |
| `supabase/functions/**` | No | Plain Deno Edge Functions |
| `src/integrations/supabase/client.ts` | Auto-generated | Just reads env vars — safe to hand-edit after export |
| `@lovable.dev/cloud-auth-js` package | **Yes** | Only used for preview auth convenience. Remove it and use `supabase.auth` directly |
| `supabase/config.toml` | Partly | Contains the managed project ref; replace with your own |
| `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) | Managed values | Replace with your own project's values |

"Lovable Cloud" **is** Supabase — a Supabase project provisioned and billed through Lovable. There
is no proprietary database layer to unwind. Detaching = pointing the same code at a Supabase project
you own.

---

## 2. Get the code into your own GitHub repo

1. In Lovable: top-right **GitHub** button → **Connect to GitHub** → authorize → **Create repository**.
2. Lovable pushes the full project and keeps it in two-way sync.
3. Clone locally:
   ```bash
   git clone https://github.com/<you>/<repo>.git
   cd <repo>
   npm install
   ```
4. To make the repo fully independent later, just disconnect the GitHub sync in Lovable (or fork the
   repo). The code keeps working — nothing phones home.

**Also export the data**, which does not live in Git:
- Cloud → **Advanced settings → Export data** (schema + rows).
- Keep a copy of `supabase/migrations/` — it recreates the entire schema from scratch.

---

## 3. Stand up your own Supabase project

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-new-project-ref>
supabase db push            # applies every file in supabase/migrations/
supabase functions deploy   # deploys all Edge Functions
```

Then set the frontend env vars in `.env`:

```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your anon/publishable key>
VITE_SUPABASE_PROJECT_ID=<your-ref>
```

Auth setup in your Supabase dashboard:
- **Authentication → URL Configuration**: Site URL + redirect URLs (`http://localhost:8080`,
  your production domain, `/auth/callback`).
- **Providers → Google**: enable, paste your Google OAuth client ID/secret.
- Email confirmations: keep **on** (public sign-ups are intentionally disabled in this app; the
  admin is `melo2006@gmail.com`).

Also remove the Lovable preview-auth helper after export:
```bash
npm remove @lovable.dev/cloud-auth-js
```
and delete `src/integrations/supabase/previewAuthStorage.ts`, replacing its usage in
`src/integrations/supabase/client.ts` with the default `localStorage` storage.

---

## 4. Database inventory (24 public tables)

`ad_scan_jobs`, `call_event_logs`, `call_history`, `call_transfer_jobs`, `campaign_sequence_steps`,
`campaign_sequences`, `campaigns`, `demo_call_attempts`, `demo_chat_interactions`, `imported_leads`,
`imported_lists`, `intent_leads`, `leads`, `prospect_enrichment_job_items`,
`prospect_enrichment_jobs`, `prospect_sequence_enrollments`, `prospects`, `scraped_ads`,
`scraping_usage`, `short_links`, `sms_delivery_log`, `sms_opt_outs`, `subscriptions`,
`voice_guardrails`.

All are RLS-protected and multi-tenant scoped. Every `CREATE TABLE` in the migrations is followed by
`GRANT` statements — keep that pattern in any new tool, or PostgREST will return permission errors.

## 5. Edge Functions inventory (28)

`ai-campaign-advisor`, `ai-follow-up-intelligence`, `analyze-prospect`, `avatar-qa`,
`avatar-spokesperson-call`, `check-iframe-embed`, `create-browser-session`, `create-checkout`,
`generate-ad-comment`, `geo-grid-scan`, `get-stripe-price`, `live-transfer-bridge`,
`payments-webhook`, `process-drip-campaign`, `resolve-short-link`, `retell-setup`,
`retell-web-call`, `scan-website`, `scrape-social-ads`, `search-intent-leads`, `search-places`,
`send-demo-recap-whatsapp`, `send-outreach-email`, `send-outreach-sms`, `speed-to-lead`,
`track-engagement`, `twilio-sms-status`, `whatsapp-webhook` (+ `_shared`).

## 6. Secrets these functions expect

Set these in **Supabase → Edge Functions → Secrets** of your own project:

```
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY   (auto)
RETELL_API_KEY, RETELL_PHONE_NUMBER, RETELL_AGENT_ID_PT, RETELL_AGENT_ID_ES            (voice AI)
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_API_KEY, TWILIO_WHATSAPP_FROM            (SMS/bridge)
RESEND_API_KEY                                                                          (email)
STRIPE_LIVE_API_KEY, STRIPE_SANDBOX_API_KEY,
PAYMENTS_LIVE_WEBHOOK_SECRET, PAYMENTS_SANDBOX_WEBHOOK_SECRET                           (billing)
FIRECRAWL_API_KEY, TAVILY_API_KEY, EXA_API_KEY, APIFY_API_TOKEN,
BROWSERLESS_API_KEY, BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, HUNTER_API_KEY        (scraping/enrichment)
GOOGLE_MAPS_API_KEY                                                                     (places/geo-grid)
LOVABLE_API_KEY                                                                         (AI gateway — replace, see below)
```

**`LOVABLE_API_KEY` is the one true dependency to swap.** It is used for LLM calls against
`https://ai.gateway.lovable.dev/v1/chat/completions` with models like `google/gemini-2.5-flash` and
`openai/gpt-5-mini`. Outside Lovable, change the base URL + key to OpenAI
(`https://api.openai.com/v1/chat/completions`) or Google
(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`) — the request/response
shape is OpenAI-compatible, so it is a two-line change per function.

## 7. Local run

```bash
npm install
npm run dev        # http://localhost:8080
```

---

## 8. Prompt to paste into your other AI studio

> I have an existing GitHub repository for a web app called **AI Hidden Leads**. Clone/import it and
> help me run, understand, and extend it. Do not rewrite the stack.
>
> **Stack:** Vite 5 + React 18 + TypeScript 5 + Tailwind CSS 3 + shadcn/ui + React Router +
> TanStack Query + i18next (en / pt-BR / es). Backend is **Supabase**: Postgres with RLS, Supabase
> Auth (Google OAuth + email, public sign-ups disabled, single admin), Storage, and 28 Deno Edge
> Functions under `supabase/functions/`.
>
> **What the app does:** a multi-tenant B2B lead-generation and AI-outreach CRM. Marketing site at
> `/`, CRM at `/dashboard/*`, live AI voice demo flows at `/demo` and `/demo-site`. It scrapes and
> scores prospect websites, generates a personalized live demo of the prospect's own site, and runs
> an AI voice agent ("Aspen") over WebRTC via Retell AI, plus email (Resend), SMS/WhatsApp and
> human warm-transfer bridges (Twilio), drip campaigns (pg_cron), Stripe subscriptions, and
> enrichment via Firecrawl / Tavily / Exa / Apify / Browserless / Browserbase / Hunter /
> Google Maps.
>
> **Design system:** dark theme, dense UI, emerald `#10B981` primary on near-black, white text,
> `font-extrabold` headings, small type (`text-xs`, `text-[10px]`). All colors are semantic HSL
> tokens in `src/index.css` and `tailwind.config.ts` — never hardcode color utilities.
>
> **Tasks for you, in order:**
> 1. `npm install`, then create `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
>    `VITE_SUPABASE_PROJECT_ID` from my own Supabase project.
> 2. Link the Supabase CLI to my project, run `supabase db push` to apply every migration in
>    `supabase/migrations/`, then `supabase functions deploy` for all Edge Functions.
> 3. Remove the `@lovable.dev/cloud-auth-js` dependency and `previewAuthStorage.ts`, and make
>    `src/integrations/supabase/client.ts` use the standard `createClient` with `localStorage`
>    session persistence, `autoRefreshToken: true`, `persistSession: true`.
> 4. Replace every call to the Lovable AI gateway
>    (`https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY`) with
>    <OpenAI | Google Gemini> using an OpenAI-compatible endpoint and my `AI_API_KEY` secret.
>    Keep the same JSON request/response contracts.
> 5. List every Edge Function secret the code reads and give me a checklist of which third-party
>    accounts I must create.
> 6. Verify the app boots on `npm run dev`, Google sign-in works, `/dashboard` loads, and report any
>    RLS or permission errors.
>
> **Rules:** keep every table's RLS policies and `GRANT` statements intact; never store user roles on
> a profile/users table (use the separate `user_roles` table + `has_role()` security-definer
> function); keep Retell for automated AI voice and Twilio strictly for human transfer and SMS; keep
> mandatory opt-out text and the `do_not_contact` flag on all outbound messaging.

---

## 9. Backup routine (recommended)

| What | How | Frequency |
|---|---|---|
| Code | GitHub sync (already two-way) | continuous |
| Schema | `supabase/migrations/` in Git | every change |
| Data | Cloud → Advanced settings → Export data, or `supabase db dump --data-only -f backup.sql` | weekly |
| Secrets | Store names + values in a password manager (they are never in Git) | on change |
| Edge Functions | In Git under `supabase/functions/` | continuous |

With those five, you can rebuild the entire product on any Supabase project, from any AI coding tool,
in under an hour.
