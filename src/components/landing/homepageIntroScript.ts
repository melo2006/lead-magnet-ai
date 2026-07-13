// Official ~90-second homepage intro transcript for AIHiddenLeads.com
// Record this in HeyGen / TalkingPhotos.ai with a transparent background
// and drop it into the PreRollVideo slot before Aspen takes over live.
// NOTE: This is the VIDEO script only — it does NOT drive the live Retell agent.

export const homepageIntroScript = `Hey, thank you for stopping by! I'm Ron from A I Hidden Leads dot com. Quick question!

Did you know that seventy-eight percent of leads buy from whoever answers first? Not the cheapest. Not the best. The fastest!

Right now, while you're busy on a job, in a meeting, or asleep, potential customers are calling your competitors because nobody picked up your phone or replied fast enough. Every missed call is hundreds — sometimes thousands of dollars walking out your door, all because you did not answer your phone or respond to their questions on your website!

That's exactly why we built AI Hidden Leads.

We can offer you at least five powerful tools that will help you grow your leads and increase your revenue. Our clients are seeing results within days or weeks.

One — an AI Voice Agent that answers your phone twenty-four seven. It sounds completely natural, like a real person, and it can handle multiple calls at the same time — so your customers never get a busy signal or sit on hold. It books appointments, answers questions, and transfers hot leads straight to you. And it costs a fraction of what you'd pay an answering service or a full-time receptionist.

Two — an AI Chat Widget on your website so visitors never leave without getting answers.

Three — we reactivate your old contact database with outbound AI calls and texts, bringing past customers back with new offers.

Four — we find you brand-new leads using hidden techniques across the internet, social media, local directories, and by improving your review ratings and Google rankings — especially for B2B, so your pipeline never runs dry.

Five — we create a custom AI Video Avatar intro, just like the one you're watching right now, to welcome visitors to your own website.

Want to learn more? Click the "Talk to Aspen" button right here on the page. Aspen will answer any questions about our services.

Or better yet, scroll down and try the free live demo. Enter your business name and website, and in under two minutes you'll see your own website running with a live Voice Agent, a Chat AI, and even a Video Avatar intro — all working for your business.

Try it now. Your next customer is already looking for you.`;

export const homepageIntroSegments = homepageIntroScript
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);
