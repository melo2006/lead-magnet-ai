---
name: Multi-viewport screenshot capture
description: Screenshot system captures full-page screenshots in 3 viewports (desktop 1920×1080@2x, tablet 768×1024@2x, mobile 390×844@3x) in parallel via Browserless, stored as {leadId}.png, {leadId}-tablet.png, {leadId}-mobile.png. Frontend detects viewer device width and serves matching screenshot. fullPage: true for scrollable experience.
type: feature
---
The scan-website edge function captures 3 full-page screenshots in parallel:
- Desktop: 1920×1080 viewport, deviceScaleFactor 2
- Tablet: 768×1024 viewport, deviceScaleFactor 2
- Mobile: 390×844 viewport, deviceScaleFactor 3

All use `fullPage: true` with 8s waitForTimeout and img waitForSelector.
Storage paths: `{leadId}.png` (desktop), `{leadId}-tablet.png`, `{leadId}-mobile.png`.
DB columns: `website_screenshot` (desktop), `screenshot_tablet`, `screenshot_mobile` on leads table.
Frontend `useResponsiveScreenshot` hook picks the right image based on window.innerWidth (≤480→mobile, ≤820→tablet, else desktop).
BeforePreview scrollable container increased to max-h-[50rem] for full-page screenshots.
