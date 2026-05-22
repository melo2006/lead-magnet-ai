# Ad Hijack Engine

A new module at `/dashboard/ad-hijack` that scrapes active social media ads (Meta, TikTok, LinkedIn, Google), extracts each advertiser's landing-page URL, enriches them as prospects, generates a personalized demo link, and produces both a copy-paste comment template AND an outbound email/SMS campaign.

## Goal

Replace paid ads with high-relevance comment engagement on competitors' own ads — every comment links to a fully personalized live demo of *that advertiser's* website with our voice + chat AI overlaid.

## Data Sources (v1)

| Platform | Method | Cost |
|---|---|---|
| Meta (FB + Instagram) | Official **Meta Ad Library API** (free, requires Meta dev app + identity verification) | Free |
| TikTok | **Apify** actor `apify/tiktok-ads-library-scraper` | ~$0.50/1k ads |
| LinkedIn | **Apify** actor `apify/linkedin-ads-library-scraper` | ~$0.50/1k ads |
| Google | **Apify** actor `apify/google-ads-transparency-scraper` | ~$0.50/1k ads |

**Apify** is the single new dependency. One `APIFY_API_TOKEN` secret covers TikTok + LinkedIn + Google. Meta uses its own `META_ADS_ACCESS_TOKEN`.

User must add two secrets before scraping works:
- `APIFY_API_TOKEN` — get from apify.com/account
- `META_ADS_ACCESS_TOKEN` — get from developers.facebook.com after creating an app

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│ /dashboard/ad-hijack  (new page)                              │
│                                                               │
│  Scan tab     →  niche + geo + platform multi-select          │
│                  Calls edge fn: scrape-social-ads             │
│                                                               │
│  Results tab  →  Table of scraped ads (ad creative, CTA,      │
│                  landing URL, advertiser, platform)           │
│                  Bulk action: "Convert to prospects"          │
│                                                               │
│  Outreach tab →  Per-ad: comment template + demo link +       │
│                  "Copy" button + "Send via email/SMS" button  │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ Edge functions (new)                                          │
│  • scrape-social-ads     — orchestrates Meta API + Apify     │
│  • generate-ad-comment   — Gemini-generated friendly comment │
│                                                               │
│ Reuses existing:                                              │
│  • scan-website (Firecrawl)  for landing-page enrichment     │
│  • Apollo enrichment         for contact info                │
│  • send-outreach-email/sms   for outbound                    │
│  • /demo?leadId=xxx          for personalized demo           │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ New tables                                                    │
│  • scraped_ads           — raw ad records, dedup by URL      │
│  • ad_scan_jobs          — scan history + cost tracking      │
│                                                               │
│ Reused:                                                       │
│  • prospects             — converted ads land here           │
│  • scraping_usage        — cost telemetry                    │
└──────────────────────────────────────────────────────────────┘
```

## User Workflow

1. **Scan** — Pick niche ("med spa"), location ("Miami"), platforms (toggle 4). Click Scan.
2. **Review** — Table shows: ad thumbnail, advertiser name, CTA text, landing URL, platform, date posted. Filter/sort/dedupe.
3. **Convert** — Select rows → "Convert to prospects" → runs landing-page Firecrawl scan + Apollo enrichment → creates prospect with `source = 'ad_hijack'` and stores the original ad URL.
4. **Generate Outreach** — For each prospect:
   - **Comment template** (manual paste): Gemini writes a friendly, on-brand comment about their ad with a shortlink to their personalized demo. User clicks "Copy" → pastes on the actual social ad.
   - **Email/SMS** (automated): Reuses existing `send-outreach-email` / `send-outreach-sms` with a pre-filled template referencing the ad they ran.
5. **Track** — Demo views, email opens, comment-link clicks all flow into the existing engagement dashboard.

## TOS Safety Rails

- **Never auto-post comments** — clipboard copy only. Honors `mem://constraints/scraping-account-safety`.
- All scraping happens server-side via Apify (their proxy infrastructure) or the official Meta API. No browser automation from user accounts.
- Outbound email/SMS reuses existing opt-out compliance (`do_not_contact`, stop footers).

## Cost Model

Per 100 ads scraped + enriched:
- Apify: ~$0.05
- Firecrawl landing scan: ~$0.10
- Apollo enrichment: ~$1.00
- Gemini comment generation: ~$0.02
- **Total: ~$1.17 per 100 leads** vs. ~$50-200 in ad spend for equivalent reach.

Logged to `scraping_usage` with `scan_type = 'ad_hijack'`.

## Technical Details

### New tables (migration)

```sql
CREATE TABLE public.ad_scan_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  niche text NOT NULL,
  location text,
  platforms text[] NOT NULL,
  status text NOT NULL DEFAULT 'queued', -- queued|running|completed|failed
  ads_found integer NOT NULL DEFAULT 0,
  ads_converted integer NOT NULL DEFAULT 0,
  total_cost_usd numeric(10,3) NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE public.scraped_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_job_id uuid REFERENCES public.ad_scan_jobs(id) ON DELETE CASCADE,
  platform text NOT NULL, -- meta|tiktok|linkedin|google
  ad_id text,             -- platform-native id
  advertiser_name text NOT NULL,
  advertiser_handle text,
  landing_url text NOT NULL,
  cta_text text,
  ad_creative_text text,
  ad_media_url text,
  posted_at timestamptz,
  source_ad_url text,     -- link back to the original ad
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  comment_template text,  -- cached generated comment
  status text NOT NULL DEFAULT 'new', -- new|converted|commented|skipped
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, landing_url)
);
```

RLS: same permissive policies as `prospects` (multi-tenant pattern already in use here).

### New edge functions

- `supabase/functions/scrape-social-ads/index.ts` — accepts `{ niche, location, platforms[] }`, fan-outs to Meta API + Apify actors, upserts into `scraped_ads`, records cost in `scraping_usage`.
- `supabase/functions/generate-ad-comment/index.ts` — accepts `{ scraped_ad_id }`, calls Gemini via Lovable AI Gateway with a strict prompt: friendly, non-spammy, one sentence, mentions a relevant detail from the ad, includes demo shortlink. Caches result on `scraped_ads.comment_template`.

Both register in `supabase/config.toml` with `verify_jwt = false` to match existing pattern.

### New frontend files

- `src/pages/AdHijack.tsx` (route handler under `/dashboard/ad-hijack`)
- `src/components/crm/ad-hijack/AdScanForm.tsx`
- `src/components/crm/ad-hijack/AdResultsTable.tsx`
- `src/components/crm/ad-hijack/AdOutreachPanel.tsx` (per-ad comment + email/SMS actions)
- `src/components/crm/ad-hijack/AdScanHistory.tsx`

Add nav entry in `src/components/crm/CRMSidebar.tsx`.
Add route in `src/pages/CRM.tsx`.

### Secrets required

| Secret | Where to get it |
|---|---|
| `APIFY_API_TOKEN` | apify.com → Settings → Integrations |
| `META_ADS_ACCESS_TOKEN` | developers.facebook.com → create app → Ad Library API access |

Will request via `add_secret` tool on first scan if missing.

## Out of Scope (v1)

- Automated comment posting (TOS risk, banned)
- Multi-language ad parsing (English only first)
- Video ad transcription
- Browser-based scraping of TikTok/LinkedIn (Apify covers this more safely)

## Memory Updates

After build: save new memory `mem://features/crm/ad-hijack-engine` describing the workflow, the manual-paste rule, and the Apify dependency. Update `mem://index.md` with the reference.
