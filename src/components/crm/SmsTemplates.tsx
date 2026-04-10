import type { Prospect } from "@/hooks/useProspectSearch";

export interface SmsTemplate {
  id: string;
  name: string;
  description: string;
  angle: string;
  mms: boolean;
  buildBody: (p: Pick<Prospect, "business_name" | "owner_name" | "niche">, demoUrl: string) => string;
}

const name = (p: Pick<Prospect, "business_name" | "owner_name">) =>
  p.owner_name?.trim() || p.business_name;

const OPT_OUT = `\n\nWant to keep getting new leads? Great — do nothing! Reply STOP to opt out.`;

export const smsTemplates: SmsTemplate[] = [
  {
    id: "quick_demo",
    name: "Quick AI Demo",
    description: "Short & direct — shows the demo link with a friendly CTA.",
    angle: "Demo showcase",
    mms: false,
    buildBody: (p, demoUrl) =>
      `Hi ${name(p)}! We built a quick AI demo for ${p.business_name} — see Chat AI & Voice AI live on your site.\n\nTry it now, it's totally free:\n${demoUrl}\n\n— AI Hidden Leads${OPT_OUT}`,
  },
  {
    id: "quick_demo_mms",
    name: "Quick AI Demo + Screenshot",
    description: "Same message but attaches a mockup of their website with AI widgets.",
    angle: "Demo showcase (MMS)",
    mms: true,
    buildBody: (p, demoUrl) =>
      `Hi ${name(p)}! We built a quick AI demo for ${p.business_name} — see Chat AI & Voice AI live on your site.\n\nTry it now, it's totally free:\n${demoUrl}\n\n— AI Hidden Leads${OPT_OUT}`,
  },
  {
    id: "missed_calls",
    name: "Missed Calls",
    description: "Pain-point angle — highlights missed leads & unanswered calls.",
    angle: "Pain point",
    mms: false,
    buildBody: (p, demoUrl) =>
      `Hey ${name(p)}, have you missed any leads lately from calls going to voicemail or visitors leaving your site?\n\nI built a Voice AI that talks to your customers, takes notes, books appointments & transfers qualified leads to you live.\n\nCheck out what I set up for ${p.business_name}:\n${demoUrl}\n\n— AI Hidden Leads${OPT_OUT}`,
  },
  {
    id: "industry_fomo",
    name: "Industry FOMO",
    description: "Social proof angle — frames AI as the new standard in their niche.",
    angle: "Industry trend",
    mms: false,
    buildBody: (p, demoUrl) =>
      `Hi ${name(p)}, most ${p.niche || "business"} owners in your area are missing out by not answering calls fast enough.\n\nI built an AI assistant for ${p.business_name} that picks up every call, answers FAQs, and books appointments 24/7.\n\nSee it in action — totally free:\n${demoUrl}\n\n— AI Hidden Leads${OPT_OUT}`,
  },
  {
    id: "industry_fomo_mms",
    name: "Industry FOMO + Screenshot",
    description: "Industry angle with an attached website mockup showing the AI widgets.",
    angle: "Industry trend (MMS)",
    mms: true,
    buildBody: (p, demoUrl) =>
      `Hi ${name(p)}, most ${p.niche || "business"} owners in your area are missing out by not answering calls fast enough.\n\nI built an AI assistant for ${p.business_name} that picks up every call, answers FAQs, and books appointments 24/7.\n\nSee it in action — totally free:\n${demoUrl}\n\n— AI Hidden Leads${OPT_OUT}`,
  },
];

export const getSmsTemplate = (id: string) =>
  smsTemplates.find((t) => t.id === id) ?? smsTemplates[0];
