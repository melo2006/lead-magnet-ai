

## Self-Service Demo Landing Page (`/try`)

### Why a separate page
The existing `/landing` page has 8+ sections and a 6-field form — great for organic traffic but too much friction for paid Facebook ad clicks. Ad visitors need a single screen with one input field and instant gratification.

### What gets built

**New page: `/try`** — a single-screen, no-scroll landing page with:

1. **Headline + 3 benefit icons** (top third)
   - "See Your Website With AI — In 10 Seconds"
   - Three compact benefit chips: "Never Miss a Call" / "24/7 AI Receptionist" / "Instant Lead Capture"

2. **Single URL input + Go button** (center, hero-sized)
   - Just the website URL field — no name, email, phone, or file upload
   - Big, glowing CTA: "Show Me My AI Demo"
   - Auto-creates a lead record with minimal data (website URL only, niche auto-detected)
   - Triggers the scan-website function and navigates to `/demo` with the scanning animation

3. **Social proof strip** (bottom)
   - "Trusted by 500+ local businesses" with a few star ratings
   - "Free · No signup · 10 seconds"

4. **No navbar** — clean, distraction-free page (hides the main Navbar)

### Technical details

- **New file**: `src/pages/TryDemo.tsx` — standalone page component
- **Route**: Add `/try` route in `App.tsx`
- **Lead creation**: Inserts a minimal lead record (just `website_url` and auto-generated `business_name` from domain) then invokes `scan-website`, same flow as `LeadCaptureSection` but simplified
- **Navbar hidden**: The `/try` route conditionally hides the Navbar component, or the page renders full-screen with its own minimal header
- **Mobile-first**: Designed for phone screens (Facebook traffic is 85%+ mobile)
- **Dark theme**: Matches existing brand aesthetic (emerald/purple gradients)
- **Framer Motion**: Subtle entrance animations consistent with rest of site

### Files changed
1. `src/pages/TryDemo.tsx` — new single-screen ad landing page
2. `src/App.tsx` — add `/try` route, conditionally hide Navbar on that route
3. `src/components/Navbar.tsx` — minor update to hide on `/try` path

