// Official ~90-second homepage intro transcript for AIHiddenLeads.com
// Record this in HeyGen / TalkingPhotos.ai with a transparent background
// and drop it into the PreRollVideo slot before Aspen takes over live.
// NOTE: This is the VIDEO script only — it does NOT drive the live Retell agent.

export const homepageIntroScript = `Hey, thank you for stopping by! I'm Ron from A I Hidden Leads dot com.

Quick question — did you know that seventy-eight percent of leads buy from whoever answers first? Not the cheapest. Not the best. The fastest.

Right now, while you're busy on a job, stuck in a meeting, or asleep at night, potential customers are calling your competitors because nobody picked up your phone or replied fast enough on your website. Every missed call is hundreds — sometimes thousands — of dollars walking straight out your door.

That's exactly why we built AI Hidden Leads.

We give you five powerful AI tools that capture more leads, book more appointments, and grow your revenue — while you focus on running your business.

One — a human-like AI Voice Agent that answers your phone twenty-four hours a day, seven days a week. It sounds completely natural, like a real person. It can handle multiple calls at the same time, so your customers never get a busy signal and never sit on hold. It answers questions, books appointments, handles objections, and transfers hot leads straight to you. And it costs a fraction of what you'd pay an answering service or a full-time receptionist.

Two — an AI Chat Widget on your website that instantly engages visitors, answers their questions, and turns them into booked leads while you sleep.

Three — we reactivate your old, sleepy contact database with AI-powered outbound calls and texts, bringing past customers back with fresh offers and promotions.

Four — we find you brand-new leads using hidden techniques across the internet, social media, and local directories. We also help increase your review ratings and improve your Google rankings, especially for high-quality B2B prospects, so your pipeline never runs dry.

Five — we create a custom AI Video Avatar intro, just like the one you're watching right now, to personally welcome visitors to your own website and guide them to take action.

Want to learn more? Click the "Talk to Aspen" button right here on the page. Aspen will answer any questions about our services.

Or better yet, scroll down and try the free live demo. Enter your business name and website, and in under two minutes you'll see your own website running with a live Voice Agent, a Chat AI, and even a Video Avatar intro — all working for your business.

Try it now. Your next customer is already looking for you.`;

export const homepageIntroSegments = homepageIntroScript
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);
