import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useProspectAnalysis = () => {
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  const analyze = async (prospect: {
    id?: string;
    website_url: string | null;
    business_name: string;
    niche?: string | null;
  }) => {
    if (!prospect.id || !prospect.website_url) {
      toast.error("No website to analyze");
      return null;
    }

    setAnalyzingIds((prev) => new Set(prev).add(prospect.id!));

    try {
      const { data, error } = await supabase.functions.invoke("analyze-prospect", {
        body: {
          prospect_id: prospect.id,
          website_url: prospect.website_url,
          business_name: prospect.business_name,
          niche: prospect.niche || "",
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Analysis failed");

      toast.success(`Analysis complete for ${prospect.business_name}`);
      return data.data;
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast.error(err.message || "Analysis failed");
      return null;
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(prospect.id!);
        return next;
      });
    }
  };

  const analyzeBatch = async (
    prospects: Array<{
      id?: string;
      website_url: string | null;
      business_name: string;
      niche?: string | null;
    }>
  ) => {
    const withWebsite = prospects.filter((p) => p.id && p.website_url);
    if (withWebsite.length === 0) {
      toast.error("No prospects with websites to analyze");
      return;
    }

    toast.info(`Analyzing ${withWebsite.length} prospects...`);

    for (const prospect of withWebsite) {
      await analyze(prospect);
      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 1500));
    }

    toast.success("Batch analysis complete!");
  };

  return { analyze, analyzeBatch, analyzingIds };
};
