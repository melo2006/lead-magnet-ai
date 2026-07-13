// Official ~60-second homepage intro transcript for AIHiddenLeads.com
// Record this in HeyGen / TalkingPhotos.ai with a transparent background
// and drop it into the PreRollVideo slot before Aspen takes over live.
// NOTE: This is the VIDEO script only — it does NOT drive the live Retell agent.

export const homepageIntroScript = `Hey! Welcome to AIHiddenLeads.com — I'm Aspen.

Did you know that seventy-eight percent of customers buy from the first business that answers? Every missed call and every slow reply is money walking straight to your competitor.

Here are five ways we help you grow:

One — our AI voice agent answers your phone twenty-four seven, books appointments, and transfers hot leads straight to you.

Two — the same AI lives on your website as a chat widget, so visitors never leave unanswered.

Three — we reactivate your old, sleepy contact database with AI calls and texts offering new promotions.

Four — we specialize in finding you brand-new leads. Using hidden techniques across the internet and local directories, we uncover high-quality B2B prospects — and B2C when it fits — with accurate emails and phone numbers, filtered exactly to who you sell to.

Five — we can even put a custom AI video spokesperson like me right on your homepage to greet every visitor. Yes — this intro video you're watching right now is a service we offer too.

Try the free simulation below — enter your name, company, and website, and see it work on your own site in under two minutes. What's your name?`;

export const homepageIntroSegments = homepageIntroScript
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);
