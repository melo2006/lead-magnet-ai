# Multi-language site (EN / PT-BR / ES) + Retell voice routing

## Phase 1 — i18n foundation (this round)

### Stack
- `react-i18next` + `i18next` + `i18next-browser-languagedetector`
- Translation files: `src/i18n/locales/{en,pt-BR,es}.json`
- Init in `src/i18n/index.ts`, imported once in `src/main.tsx`
- Language persisted to `localStorage` (key: `lang`) and `<html lang="..">`

### Language switcher
- Added to `LandingNavbar.tsx` (desktop + mobile)
- Compact dropdown: 🇺🇸 EN · 🇧🇷 PT · 🌎 ES
- Auto-detects browser language on first visit, defaults to EN

### Pages translated (round 1 — public marketing surface only)
Conversion-critical strings only — CRM/admin stays English:
- `LandingNavbar`, `Footer`
- `HeroSection`, `StatsSection`, `ServicesGrid`
- `HowItWorksSection`, `PricingSection`, `AddOnPackages`
- `TestimonialSection`, `LeadCaptureSection`, `TryWebsiteCTA`
- `DemoDifferentiator`, `BeforeAfterSection`
- `PrivacyPolicy`, `TermsOfService` (compliance — required translated for LatAm carriers)

Strings I'll pull from current copy, then auto-translate to PT-BR / neutral-LatAm ES via Lovable AI Gateway and you review before going live.

### Out of scope this round
- CRM (`/dashboard/*`) — stays English (internal tool)
- Demo site dynamic content (uses scanned business data, not static copy)
- Marketing Hub, Ad Previews

## Phase 2 — Retell multi-language voice (this round, partial)

### Architecture
Three agents, one per language. Site language → agent ID mapping in edge function:

```text
en-US  → agent_0dd08673d770e8adf08f920490  (current Aspen, already exists)
pt-BR  → agent_TBD_PTBR  (you create in Retell dashboard)
es-419 → agent_TBD_ES    (you create in Retell dashboard)
```

### What I'll ship now
- Update `avatar-spokesperson-call/index.ts` to accept `{ language: 'en' | 'pt' | 'es' }` from the client
- Route to the correct `RETELL_AGENT_ID` based on language
- Translate `SPOKESPERSON_PROMPT` into PT-BR and ES versions (full Aspen sales script, native idioms, "A-I Hidden Leads" pronunciation rules)
- `TalkingAvatarWidget` reads current `i18n.language` and passes it to the edge function
- Graceful fallback: if PT/ES agent IDs aren't set yet, show toast "Portuguese voice agent coming soon" and keep English

### What you need to do in Retell dashboard
For each new agent (PT-BR and ES):
1. Create agent, copy the agent ID
2. **TTS provider: ElevenLabs**
3. **Model: `eleven_multilingual_v2`**
4. **Voice (PT-BR):** Camila (warm female) or Thiago (friendly male) — both native Brazilian
5. **Voice (ES neutral LatAm):** Valentina or Mateo
6. **Language:** `pt-BR` / `es` (NOT `multi`)
7. Paste in the prompt I'll generate (saved in `supabase/functions/avatar-spokesperson-call/prompts/`)
8. Send me the two agent IDs — I'll drop them into the edge function as `RETELL_AGENT_ID_PT` and `RETELL_AGENT_ID_ES` secrets

### Out of scope this round
- Chat widget translation (separate ticket — it already adapts to the visitor)
- Outbound call agents (scan-website voice demo) — language-aware routing for that comes after we validate the spokesperson PT voice sounds natural to you

## Files touched

**New**
- `src/i18n/index.ts`
- `src/i18n/locales/en.json`, `pt-BR.json`, `es.json`
- `src/components/LanguageSwitcher.tsx`
- `supabase/functions/avatar-spokesperson-call/prompts/pt-BR.ts`
- `supabase/functions/avatar-spokesperson-call/prompts/es.ts`

**Edited**
- `src/main.tsx` (import i18n)
- `src/components/landing/LandingNavbar.tsx` (switcher)
- All landing components listed above (replace hardcoded strings with `t('...')`)
- `src/components/landing/Footer.tsx`
- `src/pages/PrivacyPolicy.tsx`, `src/pages/TermsOfService.tsx`
- `src/components/landing/TalkingAvatarWidget.tsx` (pass language)
- `supabase/functions/avatar-spokesperson-call/index.ts` (language routing)
- `package.json` (3 new deps)

## After approval, I'll verify
- Build passes
- Switching language re-renders the page instantly without reload
- `<html lang>` updates correctly (SEO)
- Edge function deploys and falls back gracefully if PT/ES agent IDs aren't set
