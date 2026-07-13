import { useState, useRef, useEffect } from "react";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { homepageIntroScript } from "@/components/landing/homepageIntroScript";

const TranscriptPage = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Auto-select the entire transcript on load so the user can copy instantly.
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
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

      <div className="flex-1 p-4">
        <textarea
          ref={textareaRef}
          readOnly
          value={homepageIntroScript}
          className="w-full h-full min-h-[70vh] rounded-lg border border-border bg-background p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          onFocus={(e) => e.target.select()}
        />
      </div>
    </div>
  );
};

export default TranscriptPage;
