import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-4 space-y-6">
        {sessionId ? (
          <>
            <CheckCircle className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-3xl font-bold text-foreground">Welcome Aboard! 🎉</h1>
            <p className="text-muted-foreground">
              Your subscription is confirmed. Our team will reach out within 24 hours to schedule your onboarding call and get your AI Voice Agent & Chat Widget set up.
            </p>
            <div className="rounded-xl border border-border bg-card p-5 text-left space-y-2">
              <h3 className="font-semibold text-foreground">What happens next:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>1. 📞 We'll call you to schedule onboarding</li>
                <li>2. 🔧 We set up your AI agent & install widgets</li>
                <li>3. 🧪 You test and approve everything</li>
                <li>4. 🚀 Go live — never miss a call again</li>
              </ul>
            </div>
            <Button onClick={() => navigate("/")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Homepage
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-foreground">No session found</h1>
            <p className="text-muted-foreground">It looks like you arrived here by accident.</p>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Go Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
