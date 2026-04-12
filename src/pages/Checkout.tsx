import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";

const planDetails: Record<string, { name: string; price: string; features: string[]; priceId: string }> = {
  essentials: {
    name: "AI Essentials — Voice + Chat",
    price: "$99/mo",
    priceId: "essentials_monthly",
    features: [
      "AI Voice Agent — 24/7 receptionist for your business",
      "AI Chat Widget installed on your website",
      "Lead capture & automatic appointment booking",
      "Warm transfer hot leads directly to your phone",
      "Up to 100 AI interactions per month included",
      "Email & SMS lead notifications",
      "Basic analytics dashboard",
    ],
  },
  growth: {
    name: "Growth Engine — Leads + Outreach + Reputation",
    price: "$199/mo",
    priceId: "growth_monthly",
    features: [
      "Everything in AI Essentials",
      "Database Reactivation — revive old/cold leads",
      "50 new leads per month from AI prospecting",
      "Automated Email & SMS outreach campaigns",
      "Multi-step drip sequences (days/weeks of follow-up)",
      "Google Review management & reputation monitoring",
      "Speed-to-Lead — 60-second AI callback on new leads",
      "Full CRM pipeline & tracking",
    ],
  },
  fullservice: {
    name: "Full Service — Complete Marketing Machine",
    price: "$349/mo",
    priceId: "fullservice_monthly",
    features: [
      "Everything in Growth Engine",
      "Unlimited lead generation",
      "Unlimited outreach campaigns",
      "Social media content creation & posting",
      "Website refresh included",
      "Priority AI voice minutes",
      "Dedicated account manager",
      "White-label reporting",
    ],
  },
};

const disclaimers = [
  "AI voice and chat usage beyond included interactions is billed at cost (typically $30–$90/mo depending on call volume). We pass through provider costs with no markup.",
  "Lead generation results vary by industry, location, and market conditions. We do not guarantee a specific number of leads, appointments, or revenue outcomes.",
  "You may cancel your subscription at any time. No long-term contracts required.",
  "Setup fees are one-time charges for initial configuration, widget installation, and onboarding.",
  "We are not responsible for AI usage overage charges beyond included minutes. Usage is visible in your dashboard at all times.",
];

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planKey = searchParams.get("plan") || "essentials";
  const plan = planDetails[planKey] || planDetails.essentials;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Plans
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
              <p className="text-3xl font-extrabold text-primary mt-2">{plan.price}</p>
              <p className="text-sm text-muted-foreground mt-1">Launch Special — 50% off first 3 months</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" /> What's Included
              </h3>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Our Guarantee
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✅ Cancel anytime — no long-term contracts</li>
                <li>✅ 14-day money-back guarantee if not satisfied</li>
                <li>✅ Free onboarding call with our team</li>
                <li>✅ Full usage transparency in your dashboard</li>
              </ul>
            </div>

            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" /> Important Disclaimers
              </h3>
              <ul className="space-y-2">
                {disclaimers.map((d, i) => (
                  <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                    {i + 1}. {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Complete Your Order</h2>
            <div className="rounded-xl border border-border bg-card p-1 min-h-[400px]">
              <StripeEmbeddedCheckout
                priceId={plan.priceId}
                returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
