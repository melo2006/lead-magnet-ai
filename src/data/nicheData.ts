export interface NicheData {
  id: string;
  label: string;
  icon: string;
  stats: {
    missedCallRate: string;
    revenuePerMissedCall: string;
    avgResponseTime: string;
    conversionLift: string;
  };
  headline: string;
  subheadline: string;
  painPoint: string;
  testimonial: {
    quote: string;
    name: string;
    title: string;
    avatar: string;
  };
}

export const niches: NicheData[] = [
  {
    id: "realtors",
    label: "Realtors",
    icon: "🏠",
    stats: {
      missedCallRate: "48%",
      revenuePerMissedCall: "$1,200",
      avgResponseTime: "4.2 hrs",
      conversionLift: "3.8×",
    },
    headline: "Realtors lose $1,200 every time a buyer call goes to voicemail",
    subheadline: "A buyer sees your sign, calls, gets voicemail — and calls the next agent. Your AI assistant answers in 0.4 seconds.",
    painPoint: "Busy at a showing? Driving? In a meeting? Your AI handles it — qualifies leads, books showings, and warm-transfers hot buyers to your phone.",
    testimonial: {
      quote: "I was missing 40% of my calls during showings. Within the first week, AI Hidden Leads booked 3 showings I would have lost completely. One of them closed at $485K.",
      name: "Maria Gonzalez",
      title: "RE/MAX South Florida",
      avatar: "MG",
    },
  },
  {
    id: "medspa",
    label: "Med Spas",
    icon: "💉",
    stats: {
      missedCallRate: "35%",
      revenuePerMissedCall: "$800",
      avgResponseTime: "6.1 hrs",
      conversionLift: "4.2×",
    },
    headline: "Med Spas lose $800 per missed call — and clients book with a competitor in minutes",
    subheadline: "Your client wants Botox NOW. They call, you're mid-procedure — they book elsewhere. Never again.",
    painPoint: "Your receptionist is overwhelmed. Your AI answers every call, books consultations, and upsells packages — 24/7.",
    testimonial: {
      quote: "We went from missing 1 in 3 calls to zero. Our booking rate jumped 42% in the first month. The ROI was immediate.",
      name: "Dr. Sarah Chen",
      title: "Glow Aesthetics, Miami",
      avatar: "SC",
    },
  },
  {
    id: "autodetail",
    label: "Auto Detailing",
    icon: "🚗",
    stats: {
      missedCallRate: "52%",
      revenuePerMissedCall: "$350",
      avgResponseTime: "8.3 hrs",
      conversionLift: "5.1×",
    },
    headline: "Mobile detailers miss 52% of calls while they're elbow-deep in a detail job",
    subheadline: "You're waxing a Tesla. Your phone rings. You can't pick up. That's $350 gone. Your AI never misses.",
    painPoint: "You're a one-person operation. Your AI assistant books jobs, gives quotes, and sends confirmations while you work.",
    testimonial: {
      quote: "I run my business solo. AI Hidden Leads is like having a full-time receptionist for $149/month. I booked 11 extra jobs last month.",
      name: "Marcus Williams",
      title: "Elite Mobile Detail, Fort Lauderdale",
      avatar: "MW",
    },
  },
  {
    id: "veterinary",
    label: "Vet Clinics",
    icon: "🐾",
    stats: {
      missedCallRate: "38%",
      revenuePerMissedCall: "$450",
      avgResponseTime: "3.8 hrs",
      conversionLift: "3.5×",
    },
    headline: "Vet clinics lose $450 every time a panicked pet owner can't get through",
    subheadline: "Their dog is limping. They call 3 vets — the one who answers first wins. Be that vet.",
    painPoint: "Your front desk is juggling check-ins, calls, and emergencies. Your AI triages calls and books appointments instantly.",
    testimonial: {
      quote: "Pet emergencies don't wait for office hours. Our AI handles after-hours calls and books morning appointments. We gained 22 new clients in month one.",
      name: "Dr. James Park",
      title: "Coral Springs Animal Hospital",
      avatar: "JP",
    },
  },
  {
    id: "marine",
    label: "Marine Services",
    icon: "⚓",
    stats: {
      missedCallRate: "58%",
      revenuePerMissedCall: "$1,800",
      avgResponseTime: "12 hrs",
      conversionLift: "4.7×",
    },
    headline: "Marine service shops lose $1,800 per missed call — and boat season waits for no one",
    subheadline: "A boat owner needs an engine service before the weekend. They call, you're on a dock job. That's $1,800 lost.",
    painPoint: "You're on a boat, under a hull, or at the marina. Your AI books haul-outs, schedules maintenance, and gives estimates.",
    testimonial: {
      quote: "During season, we were drowning in calls. AI Hidden Leads handles scheduling, estimates, and even warranty questions. Game changer for our marina.",
      name: "Captain Rick Torres",
      title: "Boca Marine Services",
      avatar: "RT",
    },
  },
];
