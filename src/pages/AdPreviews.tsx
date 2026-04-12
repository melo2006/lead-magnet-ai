import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, Eye, MousePointerClick, Phone, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import fbAdV1 from "@/assets/ads/fb-ad-vet-v1.jpg";
import fbAdV2 from "@/assets/ads/fb-ad-vet-v2.jpg";
import fbAdV3 from "@/assets/ads/fb-ad-vet-v3.jpg";
import googleAdV1 from "@/assets/ads/google-ad-vet-v1.jpg";
import googleAdV2 from "@/assets/ads/google-ad-vet-v2.jpg";

const facebookAds = [
  {
    id: "fb-v1",
    name: "Pain Point — Missed Calls Stats",
    image: fbAdV1,
    format: "Feed (1080×1080)",
    headline: "Your Vet Clinic Misses 38% of Calls",
    primaryText: "That's $450 per missed call. Your AI Receptionist answers every call 24/7, books appointments, and triages emergencies.",
    cta: "See Your Free AI Demo",
    style: "Data-driven / Urgency",
  },
  {
    id: "fb-v2",
    name: "Emotional Story — After-Hours Call",
    image: fbAdV2,
    format: "Feed (1080×1080)",
    headline: "A Pet Owner Called at 8PM. Nobody Answered.",
    primaryText: "After hours, weekends, holidays — AI Hidden Leads answers every call. Emergencies get triaged. Appointments get booked. 24/7.",
    cta: "Try It Free — See Your Demo",
    style: "Emotional / Story-driven",
  },
  {
    id: "fb-v3",
    name: "Story/Reel — Split Screen",
    image: fbAdV3,
    format: "Story/Reel (1080×1920)",
    headline: "Stop Losing $450 Every Missed Call",
    primaryText: "AI Answers. Books. Triages. 24/7. Free demo for your clinic.",
    cta: "Free Demo for Your Clinic",
    style: "Visual / Mobile-first",
  },
];

const googleAds = [
  {
    id: "g-v1",
    name: "Leaderboard Banner",
    image: googleAdV1,
    format: "Display (728×90)",
    headline: "Never Miss Another Pet Emergency Call",
    description: "AI Receptionist for Vet Clinics — Starting $49/mo",
    cta: "Free Demo",
    style: "Clean / Professional",
  },
  {
    id: "g-v2",
    name: "Square Display Ad",
    image: googleAdV2,
    format: "Display (300×250)",
    headline: "38% of Vet Calls Go Unanswered",
    description: "Your AI Receptionist books appointments, triages emergencies, 24/7.",
    cta: "See Free Demo",
    style: "Emotional / Data-driven",
  },
];

const googleSearchAds = [
  {
    headline1: "AI Receptionist for Vet Clinics",
    headline2: "Never Miss a Pet Emergency Call",
    headline3: "Starting at $49/mo — Try Free",
    description1: "Your vet clinic misses 38% of calls. Our AI answers 24/7, books appointments, triages emergencies, and warm-transfers urgent calls to your phone.",
    description2: "22 new clients in month one. AI receptionist handles after-hours calls, books morning appointments, and sends you summaries. Free demo.",
    displayUrl: "aihiddenleads.com/vet-clinics",
    sitelinks: ["Free Demo", "Pricing", "How It Works", "Case Studies"],
  },
  {
    headline1: "Stop Losing $450 Per Missed Call",
    headline2: "AI Phone System for Vets",
    headline3: "24/7 Pet Emergency Triage",
    description1: "Pet owners call 3 vets — the one who answers first wins. Be that vet with an AI receptionist that never sleeps. Free personalized demo.",
    description2: "Busy during check-ins? In surgery? Your AI handles calls, qualifies leads, and books appointments while you focus on patients.",
    displayUrl: "aihiddenleads.com/veterinary",
    sitelinks: ["Watch Demo", "Plans & Pricing", "Testimonials", "Get Started"],
  },
];

interface BudgetTier {
  daily: number;
  monthly: number;
  impressions: string;
  clicks: string;
  cpc: string;
  leads: string;
  costPerLead: string;
  conversions: string;
  roi: string;
}

const budgetData: Record<string, { facebook: BudgetTier; google: BudgetTier }> = {
  "$10": {
    facebook: { daily: 10, monthly: 300, impressions: "3,000–5,000/day", clicks: "30–60/day", cpc: "$0.18–0.35", leads: "15–25/mo", costPerLead: "$12–20", conversions: "2–4 clients", roi: "4–8× at $49/mo" },
    google: { daily: 10, monthly: 300, impressions: "800–1,500/day", clicks: "8–15/day", cpc: "$0.70–1.25", leads: "8–15/mo", costPerLead: "$20–38", conversions: "1–3 clients", roi: "2–6× at $49/mo" },
  },
  "$15": {
    facebook: { daily: 15, monthly: 450, impressions: "5,000–8,000/day", clicks: "50–90/day", cpc: "$0.17–0.30", leads: "25–40/mo", costPerLead: "$11–18", conversions: "4–7 clients", roi: "5–10× at $49/mo" },
    google: { daily: 15, monthly: 450, impressions: "1,200–2,200/day", clicks: "12–22/day", cpc: "$0.68–1.20", leads: "12–22/mo", costPerLead: "$20–38", conversions: "2–4 clients", roi: "3–6× at $49/mo" },
  },
  "$20": {
    facebook: { daily: 20, monthly: 600, impressions: "7,000–12,000/day", clicks: "70–130/day", cpc: "$0.15–0.28", leads: "35–55/mo", costPerLead: "$11–17", conversions: "5–9 clients", roi: "5–11× at $49/mo" },
    google: { daily: 20, monthly: 600, impressions: "1,600–3,000/day", clicks: "16–30/day", cpc: "$0.65–1.20", leads: "16–30/mo", costPerLead: "$20–38", conversions: "3–5 clients", roi: "3–6× at $49/mo" },
  },
  "$25": {
    facebook: { daily: 25, monthly: 750, impressions: "9,000–15,000/day", clicks: "90–160/day", cpc: "$0.15–0.28", leads: "45–70/mo", costPerLead: "$11–17", conversions: "7–12 clients", roi: "6–12× at $49/mo" },
    google: { daily: 25, monthly: 750, impressions: "2,000–3,800/day", clicks: "20–38/day", cpc: "$0.65–1.20", leads: "20–38/mo", costPerLead: "$20–38", conversions: "3–6 clients", roi: "3–6× at $49/mo" },
  },
};

const AdPreviews = () => {
  const navigate = useNavigate();
  const [selectedBudget, setSelectedBudget] = useState<string>("$15");
  const [selectedAd, setSelectedAd] = useState<string | null>(null);

  const budget = budgetData[selectedBudget];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">🐾 Vet Clinic Ad Creatives</h1>
            <p className="text-sm text-muted-foreground">Facebook & Google ad variations with budget projections</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Budget Selector */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" /> Budget Projections
          </h2>
          <div className="flex gap-2 mb-6">
            {Object.keys(budgetData).map((b) => (
              <Button
                key={b}
                variant={selectedBudget === b ? "default" : "outline"}
                onClick={() => setSelectedBudget(b)}
                className="font-mono"
              >
                {b}/day
              </Button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {(["facebook", "google"] as const).map((platform) => {
              const d = budget[platform];
              return (
                <Card key={platform} className="border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      {platform === "facebook" ? "📘 Facebook/Instagram" : "🔍 Google Ads"}
                      <Badge variant="secondary">${d.daily}/day = ${d.monthly}/mo</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Eye, label: "Impressions", value: d.impressions },
                        { icon: MousePointerClick, label: "Clicks", value: d.clicks },
                        { icon: DollarSign, label: "Cost/Click", value: d.cpc },
                        { icon: Users, label: "Leads/Month", value: d.leads },
                        { icon: Phone, label: "Cost/Lead", value: d.costPerLead },
                        { icon: TrendingUp, label: "Expected ROI", value: d.roi },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Icon className="w-3 h-3" /> {label}
                          </div>
                          <div className="font-semibold text-sm text-foreground">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                      <p className="text-xs text-foreground font-medium">
                        💡 {platform === "facebook"
                          ? "Best for awareness & emotional hooks. Lower CPC, higher volume. Target: Vet clinic owners, practice managers, 25mi radius."
                          : "Best for high-intent searches. Higher CPC but buyers are actively looking. Target: 'vet clinic phone system', 'veterinary answering service'."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="mt-4 border-primary/30 bg-primary/5">
            <CardContent className="pt-4">
              <p className="text-sm font-semibold text-foreground">
                🎯 Recommended: Start with <span className="text-primary">$15/day on Facebook</span> + <span className="text-primary">$10/day on Google</span> = $750/mo total.
                Expected: 30–55 leads, 5–10 paying clients at $49–149/mo = <span className="text-primary">$245–$1,490/mo revenue</span>.
                Break-even with just 6 clients on the $49 plan.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Facebook Ads */}
        <Tabs defaultValue="facebook">
          <TabsList className="mb-4">
            <TabsTrigger value="facebook">📘 Facebook Ads</TabsTrigger>
            <TabsTrigger value="google-display">🖼️ Google Display</TabsTrigger>
            <TabsTrigger value="google-search">🔍 Google Search</TabsTrigger>
          </TabsList>

          <TabsContent value="facebook">
            <div className="grid md:grid-cols-3 gap-6">
              {facebookAds.map((ad) => (
                <Card key={ad.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedAd(selectedAd === ad.id ? null : ad.id)}>
                  <div className="aspect-square relative">
                    <img src={ad.image} alt={ad.name} className="w-full h-full object-cover" loading="lazy" />
                    <Badge className="absolute top-2 right-2">{ad.format}</Badge>
                  </div>
                  <CardContent className="pt-4 space-y-2">
                    <h3 className="font-bold text-foreground">{ad.name}</h3>
                    <Badge variant="outline">{ad.style}</Badge>
                    {selectedAd === ad.id && (
                      <div className="space-y-2 pt-2 border-t border-border mt-2">
                        <p className="text-xs text-muted-foreground"><strong>Headline:</strong> {ad.headline}</p>
                        <p className="text-xs text-muted-foreground"><strong>Primary Text:</strong> {ad.primaryText}</p>
                        <p className="text-xs text-muted-foreground"><strong>CTA:</strong> {ad.cta}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">📋 Facebook Ad Copy — Ready to Paste</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold">Ad Variation 1 — Stats Hook</p>
                  <p className="text-sm text-muted-foreground"><strong>Primary Text:</strong> 🚨 Your vet clinic misses 38% of calls. That's $450 walking out the door every time a pet owner can't get through.</p>
                  <p className="text-sm text-muted-foreground">What if an AI receptionist answered every call in 0.4 seconds — booked appointments, triaged emergencies, and texted you a summary?</p>
                  <p className="text-sm text-muted-foreground">👉 See a free personalized demo for YOUR clinic. Takes 30 seconds.</p>
                  <p className="text-sm text-muted-foreground"><strong>Headline:</strong> Never Miss Another Pet Emergency Call</p>
                  <p className="text-sm text-muted-foreground"><strong>Link Description:</strong> AI Receptionist for Vet Clinics — Starting $49/mo</p>
                </div>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold">Ad Variation 2 — Emotional Story</p>
                  <p className="text-sm text-muted-foreground"><strong>Primary Text:</strong> A pet owner called your clinic at 8PM on a Saturday. Their dog was limping. Nobody answered. They called the next vet.</p>
                  <p className="text-sm text-muted-foreground">You lost a $450 client because your phone went to voicemail.</p>
                  <p className="text-sm text-muted-foreground">Our AI receptionist would have answered, triaged the emergency, and booked a morning appointment — all while you slept.</p>
                  <p className="text-sm text-muted-foreground">👉 See exactly how it works for YOUR clinic. Free 30-second demo.</p>
                  <p className="text-sm text-muted-foreground"><strong>Headline:</strong> Your AI Receptionist Never Sleeps</p>
                  <p className="text-sm text-muted-foreground"><strong>Link Description:</strong> 22 New Clients in Month One — See Your Demo</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="google-display">
            <div className="grid md:grid-cols-2 gap-6">
              {googleAds.map((ad) => (
                <Card key={ad.id} className="overflow-hidden">
                  <div className="bg-muted p-4 flex items-center justify-center">
                    <img src={ad.image} alt={ad.name} className="max-w-full rounded-lg shadow" loading="lazy" />
                  </div>
                  <CardContent className="pt-4 space-y-2">
                    <h3 className="font-bold text-foreground">{ad.name}</h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">{ad.format}</Badge>
                      <Badge variant="outline">{ad.style}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground"><strong>Headline:</strong> {ad.headline}</p>
                    <p className="text-xs text-muted-foreground"><strong>Description:</strong> {ad.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="google-search">
            <div className="space-y-6">
              {googleSearchAds.map((ad, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="max-w-xl">
                      <p className="text-xs text-muted-foreground mb-1">Sponsored</p>
                      <p className="text-sm text-primary font-medium">{ad.displayUrl}</p>
                      <h3 className="text-lg text-primary font-medium hover:underline cursor-pointer">
                        {ad.headline1} | {ad.headline2} | {ad.headline3}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{ad.description1}</p>
                      <div className="flex gap-4 mt-2">
                        {ad.sitelinks.map((link) => (
                          <span key={link} className="text-xs text-primary hover:underline cursor-pointer">{link}</span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-xs font-semibold text-foreground mb-1">📝 Full Copy:</p>
                      <p className="text-xs text-muted-foreground"><strong>Description 2:</strong> {ad.description2}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🎯 Recommended Google Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">High Intent (Best)</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• veterinary answering service</li>
                        <li>• vet clinic phone system</li>
                        <li>• after hours vet answering</li>
                        <li>• AI receptionist for vets</li>
                        <li>• vet clinic missed calls solution</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Medium Intent</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• vet clinic automation</li>
                        <li>• veterinary practice management</li>
                        <li>• pet clinic phone system</li>
                        <li>• animal hospital receptionist</li>
                        <li>• vet clinic scheduling software</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">Negative Keywords</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• veterinary school</li>
                        <li>• vet tech salary</li>
                        <li>• free vet clinic</li>
                        <li>• veterinary degree</li>
                        <li>• vet near me (consumer intent)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Targeting Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 Ad Targeting Setup Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-foreground mb-2">📘 Facebook Targeting</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Location:</strong> South Florida (25mi radius from Boca Raton)</li>
                  <li>• <strong>Age:</strong> 30–65</li>
                  <li>• <strong>Interests:</strong> Veterinary medicine, Practice management, Small business owner</li>
                  <li>• <strong>Job Titles:</strong> Veterinarian, Practice Manager, Clinic Owner</li>
                  <li>• <strong>Behavior:</strong> Business page admins, Small business owners</li>
                  <li>• <strong>Objective:</strong> Lead Generation or Conversions</li>
                  <li>• <strong>Placement:</strong> Feed + Stories + Reels</li>
                  <li>• <strong>Landing Page:</strong> aihiddenleads.com/demo</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">🔍 Google Targeting</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Campaign Type:</strong> Search + Display</li>
                  <li>• <strong>Location:</strong> South Florida or nationwide (test both)</li>
                  <li>• <strong>Bid Strategy:</strong> Maximize conversions (after 50 conversions: Target CPA)</li>
                  <li>• <strong>Ad Schedule:</strong> Mon–Fri, 8AM–6PM (business hours)</li>
                  <li>• <strong>Device:</strong> Desktop + Mobile (separate ad groups)</li>
                  <li>• <strong>Extensions:</strong> Sitelinks, Callout, Call, Location</li>
                  <li>• <strong>Landing Page:</strong> aihiddenleads.com/demo</li>
                  <li>• <strong>Display Network:</strong> Veterinary websites, pet care blogs</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdPreviews;
