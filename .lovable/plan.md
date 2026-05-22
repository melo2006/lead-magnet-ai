
# Ad Hijack v3: Nationwide search, approval flow, instant demos

## 1. Search form (`src/pages/AdHijack.tsx`)
- Make **City/State optional** (placeholder: "Leave blank for nationwide").
- Add **Country multi-select** (default checked): US, CA, UK, AU. Pass as array.
- Add **Language filter** (default: English only) — checkbox.
- Keep niche dropdowns + custom query.
- "Top N results" slider (10 / 25 / 50 / 100).

## 2. Scraper (`supabase/functions/scrape-social-ads/index.ts`)
- Accept `countries: string[]`, `languages: string[]`, `city?: string` (optional), `limit: number`.
- Pass `countries` array to Apify Meta Ad Library actor (it supports multi-country).
- Filter results by `ad_creative_text` language (simple English heuristic via langdetect-style char check; reject Korean/Arabic/CJK ranges).
- Continue extracting `fb_post_url` / `ig_post_url` / contact-page fallback.
- Persist `engagement_status`: `commentable` | `contact_form` | `dark_post`.
- Store `approval_status: 'pending'` on each `scraped_ads` row.

## 3. Approval workflow (UI)
- Results table gets a new **Status column** + per-row **Approve / Reject** buttons + **Bulk approve** toolbar.
- Only ads with `approval_status='approved'` show the live **Copy + Open** action buttons.
- Pending rows show preview-only: ad text, AI comment draft (editable inline), platform badge, link preview.
- Filter dropdown: Pending / Approved / Rejected / All.

## 4. Instant Demo link (no homepage detour)
- Short link target stays `/demo-site?url=...&name=...&niche=...&source=ad_hijack&autostart=1`.
- `DemoSite.tsx`:
  - When `autostart=1`, kick off scrape immediately on mount, show existing "Building your live demo now" loader (88% cap).
  - Once scrape resolves, auto-render iframe + voice/chat widgets + top banner CTA.
  - Voice agent auto-greets after 1.5s (uses existing proactive teaser hook).
- Banner CTA already present — verify it links to pricing, not homepage.

## 5. Transfer target for ad-hijack demos
- When demo session originates from `source=ad_hijack` (no form filled), set Retell transfer target to **+1 954-770-6622** (sales director).
- Add `AD_HIJACK_TRANSFER_PHONE` constant in `retell-web-call/index.ts` and select it when `metadata.source === 'ad_hijack'`.
- Agent prompt: explicit instruction that transfer goes to "our AI specialist" since no caller form was completed.

## 6. DB migration
```sql
ALTER TABLE scraped_ads
  ADD COLUMN approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN engagement_status text,
  ADD COLUMN detected_language text,
  ADD COLUMN ad_country text;

ALTER TABLE ad_scan_jobs
  ADD COLUMN countries text[] DEFAULT '{US}',
  ADD COLUMN languages text[] DEFAULT '{en}',
  ADD COLUMN result_limit integer DEFAULT 25;
```

## 7. Files touched
- `supabase/migrations/<new>.sql`
- `supabase/functions/scrape-social-ads/index.ts`
- `supabase/functions/retell-web-call/index.ts`
- `src/pages/AdHijack.tsx`
- `src/pages/DemoSite.tsx` (autostart wiring)
- `src/integrations/supabase/types.ts` (auto-regen)

## 8. Out of scope (deferred)
- Auto-posting comments via Browserbase agent (separate large effort).
- Auto-filling website Contact Us forms via agentic browser (separate effort — flagged in Status column as "contact_form" with manual link for now).

Approve and I'll implement in this order: migration → scraper → UI → demo autostart → transfer routing.
