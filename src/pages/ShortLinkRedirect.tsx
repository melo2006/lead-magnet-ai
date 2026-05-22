import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function ShortLinkRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("Missing link.");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("resolve-short-link", {
          body: { slug },
        });
        if (error) throw error;
        if (!data?.target_url) throw new Error("Link not found");

        const target = new URL(data.target_url, window.location.origin);
        if (target.pathname === "/demo") {
          target.pathname = "/demo-site";
        }
        window.location.replace(target.toString());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not resolve link.");
      }
    })();
  }, [slug]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      {error ? (
        <div className="text-center space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          <a href="/" className="text-xs text-primary hover:underline">Go home</a>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Redirecting…
        </div>
      )}
    </div>
  );
}
