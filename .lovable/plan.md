

# AI Hidden Leads — Homepage Redesign Plan

## The Problem

Your current marketing page (`/marketing`) focuses narrowly on "missed calls" and AI voice demos. But your business offers much more: lead generation, database reactivation, AI voice agents, chat widgets, campaign automation, and outreach — plus a unique 90-second live demo generator that no competitor (including ClientForce) has.

The homepage needs to reflect the full platform and position AI Hidden Leads as a complete lead generation and sales automation solution for local businesses.

## What ClientForce Does (and Doesn't)

ClientForce offers: AI sales agents, auto-prospecting, multi-channel outreach (email/SMS/WhatsApp/voice), unified inbox, lead finder, Chrome extension, calendar booking, proposals, agency mode, and reselling.

**What they DON'T have** (your unique advantages):
- 90-second personalized live demo generator (scan any website, show AI in action)
- Instant before/after website preview with embedded AI
- Speed-to-lead (auto-call within 60 seconds of engagement)
- Visual outreach templates with website mockups

## Proposed New Homepage Structure

The homepage will be rebuilt at `/` (replacing the CRM as the default route — CRM moves to `/dashboard/*`).

### Section 1: Hero
- **Headline**: "Stop Losing Leads. Start Closing Them — With AI."
- **Subheadline**: "AI Hidden Leads finds your ideal customers, reaches out automatically, and answers every call, chat, and text — 24/7. See it work on YOUR business in 90 seconds."
- **Two CTAs**: "See Your Free AI Demo" (scrolls to demo form) + "Watch How It Works" (video modal)
- **Trust badges**: "No credit card · 90-second setup · Works for any local business"

### Section 2: Pain Points / Stats
- Keep the existing missed-call stats but expand to include: "78% of leads go to the first responder", "Only 27% of leads ever get contacted", "$1,200 average lost per missed opportunity"

### Section 3: Services Grid (NEW — inspired by ClientForce but tailored to YOUR offering)
Six core services, each as a card:

1. **AI Voice Agent** — 24/7 receptionist that answers, qualifies, books appointments, and warm-transfers hot leads to your phone
2. **AI Chat Widget** — Instant website chat trained on your business. Captures leads, answers FAQs, books appointments
3. **Lead Generation Engine** — Intent-based prospecting that finds businesses actively searching for your services (Google Maps, directories, intent signals)
4. **Database Reactivation** — AI calls your old/dead lead lists, re-engages them, and books appointments automatically
5. **Automated Outreach Campaigns** — Multi-step email + SMS + voice sequences with personalized website demos attached
6. **Speed-to-Lead** — When a prospect opens your email or views your demo, AI calls them within 60 seconds

### Section 4: "How It Works" (Revised)
Four steps:
1. **We Find Your Leads** — AI scans for businesses in your niche that need your services
2. **We Send Personalized Demos** — Each prospect gets a custom demo showing AI on THEIR website
3. **AI Handles Every Response** — Voice, chat, email, SMS — all answered instantly, 24/7
4. **You Close the Deal** — Qualified leads are warm-transferred to you or booked on your calendar

### Section 5: Before/After (Keep existing)
The website transformation showcase — this is unique to you and very compelling.

### Section 6: The "Demo Drop" Differentiator (NEW)
A focused section showing what makes you unique vs. competitors:
- "While others send cold emails, we send personalized AI demos"
- Show a visual of the demo link / phone mockup that prospects receive
- "Your prospect sees their OWN website with AI chat and voice — in 90 seconds"

### Section 7: Testimonials (Keep existing)

### Section 8: Pricing / Packages (NEW — optional, can be added later)
Three tiers similar to ClientForce but for YOUR services:
- **Starter**: AI Voice + Chat widget setup
- **Growth**: Everything + lead generation + outreach campaigns
- **Agency**: Everything + database reactivation + white-label

### Section 9: Lead Capture / Demo Form (Keep existing)
The form that generates the 90-second live demo.

### Section 10: Compliance Footer (NEW)
- Privacy Policy link
- Terms of Service link
- SMS/communication consent language
- This satisfies carrier compliance requirements for toll-free SMS verification

## Routing Changes

| Current | New |
|---------|-----|
| `/` → CRM dashboard | `/` → New homepage |
| `/marketing` → Marketing page | Remove (merged into `/`) |
| CRM at `/*` | CRM at `/dashboard/*` |
| `/demo` | `/demo` (unchanged) |
| `/demo-site` | `/demo-site` (unchanged) |

## Files to Create/Modify

1. **New components**:
   - `src/components/landing/ServicesGrid.tsx` — 6-service card grid
   - `src/components/landing/DemoDifferentiator.tsx` — unique value prop section
   - `src/components/landing/PricingSection.tsx` — pricing tiers (optional)
   - `src/pages/PrivacyPolicy.tsx` — compliance page
   - `src/pages/TermsOfService.tsx` — compliance page

2. **Modified files**:
   - `src/pages/Index.tsx` — rebuild with new section order and services
   - `src/components/landing/HeroSection.tsx` — new headline/copy
   - `src/components/landing/FeaturesSection.tsx` — replace with expanded services
   - `src/components/landing/HowItWorksSection.tsx` — revised 4-step flow
   - `src/components/landing/Footer.tsx` — add Privacy/Terms links
   - `src/App.tsx` — update routing (`/` = homepage, `/dashboard/*` = CRM)
   - `src/pages/CRM.tsx` — adjust for new route prefix

## What This Does NOT Change
- The CRM dashboard and all its features remain intact (just at `/dashboard/*`)
- The demo flow (`/demo`, `/demo-site`) stays the same
- All edge functions, database tables, and backend logic are untouched
- Outreach templates and campaign system remain as-is

## Implementation Order
1. Create Privacy Policy and Terms of Service pages (unblocks SMS compliance)
2. Rebuild the homepage with new sections
3. Update routing so `/` is the homepage and CRM moves to `/dashboard`
4. Add compliance links to footer

