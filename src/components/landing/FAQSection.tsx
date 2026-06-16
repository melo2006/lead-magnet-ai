import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "What exactly counts as an 'AI interaction' in the $99 plan?",
    a: "One AI interaction = one conversation on your website (voice or chat) up to 5 minutes long. The $99 AI Essentials plan includes 100 of these per month — enough to cover most small-business website traffic. If you go over, additional conversations are billed at just $0.50 each so you never miss a lead. You'll get a friendly SMS warning at 80 and again at 100 conversations.",
  },
  {
    q: "What happens if I go over my monthly limits?",
    a: "We use a soft cap with SMS warnings, not a hard shut-off. At 80% usage you get a heads-up, at 100% another SMS, and any extra usage is auto-billed at the end of the month at transparent passthrough rates: $0.50 per extra AI conversation, ~$0.02/min for live human phone transfers via Twilio, $0.015 per SMS. You can set your own hard cap in settings if you prefer predictability over coverage.",
  },
  {
    q: "How much does a live transfer to a human cost?",
    a: "Live phone transfers use Twilio at our cost — approximately $0.02 per minute. A typical 4–5 minute live transfer call adds about $0.10. Even with heavy usage this rarely adds more than $30–$90/month, and we bill it transparently at cost, not marked up.",
  },
  {
    q: "Where do the 50 new leads in the Growth Engine plan come from?",
    a: "We source B2B leads from public business directories — Google Maps, Apollo.io, LinkedIn company pages, Yelp, and industry-specific directories. Every lead is verified for a real phone number using Twilio line-type lookup and a valid business email before delivery. These are 100% B2B leads (businesses, not consumers), fully compliant with CAN-SPAM and TCPA, with opt-out language built into every outbound message. No gray-market data, no scraping of private info.",
  },
  {
    q: "What if I need more than 50 leads per month?",
    a: "Additional verified B2B leads are available at $1.50 each (our cost is $0.30–$0.80, billed at honest passthrough margins). Just let us know your target volume and we'll set up overage billing or move you to the Full Service plan, where lead generation is unlimited and we run the outreach for you.",
  },
  {
    q: "What voice does Aspen use? Is it expensive AI?",
    a: "Aspen uses Retell AI with ElevenLabs Flash v2.5 — a premium-sounding voice at a low cost (~$0.06/minute total). That's why we can offer 100 conversations on the $99 plan and still keep margins healthy without cutting quality.",
  },
  {
    q: "How long does the AI conversation typically last?",
    a: "Most lead conversations on a website last 2–4 minutes. A live human transfer call typically lasts 4–6 minutes. We budget 5 minutes per interaction in your plan, which fits the vast majority of real conversations.",
  },
  {
    q: "Is SMS included? What about the 1 SMS/second carrier limit?",
    a: "Yes — SMS is included for outbound recaps, lead replies, and overage warnings. We use Twilio with A2P 10DLC registration so your messages are properly registered with carriers, deliver reliably, and stay under the per-second throughput caps. Every outbound SMS includes 'Reply STOP to opt out' as required by TCPA.",
  },
  {
    q: "How fast do you go live?",
    a: "2–3 business days for AI Essentials and Growth Engine. Full Service is 5–7 business days because we also set up your outreach sequences, CRM imports, and live transfer routing.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Month-to-month, cancel anytime from your dashboard. No long-term contracts, no cancellation fees.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-16 sm:py-24 px-4 sm:px-6 bg-secondary/20 border-t border-border">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            HELP & FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
            Questions? We have answers.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Pricing, limits, overages, lead sources, and how everything works — clearly explained.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-border rounded-lg bg-card px-4"
            >
              <AccordionTrigger className="text-left text-sm sm:text-base font-semibold hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Still have questions? Talk to Aspen (bottom-right) or scroll up to book a live demo.
        </p>
      </div>
    </section>
  );
};

export default FAQSection;
