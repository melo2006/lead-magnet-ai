

## Problem

The iframe `onError` event does **not** fire when a website blocks embedding via `X-Frame-Options` or CSP headers. The iframe silently renders a blank/black page. Since `iframeBlocked` never becomes `true`, the screenshot fallback never triggers -- even though a valid screenshot URL exists in the database.

## Root Cause

Line 208: `onError={() => setIframeBlocked(true)}` -- this only fires on network-level errors (e.g., DNS failure), not on HTTP header-based embedding restrictions. Weebly sites block iframes via `X-Frame-Options: SAMEORIGIN`.

## Fix

**File: `src/pages/DemoSite.tsx`**

1. Add a timer-based iframe validation: after the iframe "loads," try to access `contentWindow.document` inside a try/catch. If it throws (cross-origin block) or the iframe appears blank, set `iframeBlocked = true` and fall back to the screenshot.

2. Update the `onLoad` handler (line 209-211) to:
   - Try accessing `iframe.contentWindow.location.href` in a try/catch
   - If it throws a cross-origin error, that's actually expected and fine (means the site loaded but is cross-origin)
   - Use a **timeout fallback** (3-4 seconds): if the iframe hasn't confirmed it loaded content, assume it's blocked and switch to screenshot

3. Add a `useRef` for the iframe element and a `useEffect` with a timeout:
   - After 4 seconds, check if iframe is still showing (not blocked) but appears empty
   - If so, flip to screenshot fallback

4. Move the `onLoad` to actually verify content loaded by checking the iframe's `contentDocument` accessibility -- if blocked by X-Frame-Options, the browser still fires `onLoad` but the document is inaccessible AND blank.

**Concrete implementation:**
- Add `iframeRef = useRef<HTMLIFrameElement>(null)`
- Add `useEffect` that sets a 4-second timer after `leadData` is set; if `iframeBlocked` is still false, try to detect blank content and flip to screenshot
- In the iframe `onLoad`, try `iframeRef.current?.contentDocument` -- if it returns null AND the site is cross-origin, that's normal. But also start a secondary check.
- Key insight: when X-Frame-Options blocks, the browser fires `onLoad` but renders a blank page. We detect this by setting a flag in `onLoad` and if the page looks blank after load (which we can't truly verify cross-origin), we use a simple heuristic: set a timer and if the user hasn't interacted, fall back to screenshot after a few seconds.

**Simpler approach:** Since we cannot reliably detect X-Frame-Options blocking from JS, the best pattern is:
- Default to showing the screenshot if one exists
- Add a "Try Live Site" button that loads the iframe on demand
- OR: attempt iframe first with a short timeout (3s), then auto-fallback

I recommend the **timeout approach**: attempt iframe, auto-fallback to screenshot after 3 seconds if the iframe onLoad fires but we detect cross-origin restrictions.

## Changes

### `src/pages/DemoSite.tsx`
- Add `useRef` for iframe
- Add `iframeLoaded` state
- In `onLoad`: set `iframeLoaded = true`, then try `contentDocument` access; if null (cross-origin blocked content), set `iframeBlocked = true`  
- Add `useEffect` with 3.5s timeout: if iframe hasn't loaded OR has loaded but content is inaccessible, flip to screenshot
- Keep existing screenshot fallback logic (lines 213-223) as-is

## Technical Details

When `X-Frame-Options: SAMEORIGIN` blocks an iframe:
- `onError` does NOT fire
- `onLoad` DOES fire  
- `contentDocument` returns `null`
- The iframe renders blank/white/black

The fix catches this in `onLoad` by checking if `contentDocument` is null, which reliably indicates the content was blocked or is cross-origin. Since we can't distinguish "loaded cross-origin successfully" from "blocked by X-Frame-Options" via JS alone, we also use a visual timeout heuristic.

