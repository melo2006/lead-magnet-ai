import { useState } from "react";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { homepageIntroScript } from "@/components/landing/homepageIntroScript";

const TranscriptPage = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(homepageIntroScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy transcript:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleCopy}
            variant={copied ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy transcript
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Homepage Intro Transcript
          </h1>
          <p className="text-sm text-muted-foreground">
            Tap the copy button, then paste it into your teleprompter or notes app.
          </p>
        </div>

        <Textarea
          readOnly
          value={homepageIntroScript}
          className="min-h-[60vh] font-mono text-sm leading-relaxed resize-y"
          onFocus={(e) => e.target.select()}
        />
      </div>
    </div>
  );
};

export default TranscriptPage;
