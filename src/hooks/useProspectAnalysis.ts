import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BatchProgress {
  total: number;
  completed: number;
  current: string | null;
  isRunning: boolean;
}

export const useProspectAnalysis = () => {
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0, completed: 0, current: null, isRunning: false,
  });
  const abortRef = useRef(false);

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

  const stopBatch = useCallback(() => {
    abortRef.current = true;
    toast.info("Stopping batch analysis after current prospect...");
  }, []);

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

    abortRef.current = false;
    setBatchProgress({ total: withWebsite.length, completed: 0, current: null, isRunning: true });
    toast.info(`Analyzing ${withWebsite.length} prospects...`);

    let completed = 0;
    for (const prospect of withWebsite) {
      if (abortRef.current) {
        toast.info(`Batch stopped. ${completed}/${withWebsite.length} completed.`);
        break;
      }

      setBatchProgress(prev => ({ ...prev, current: prospect.business_name, completed }));
      await analyze(prospect);
      completed++;
      setBatchProgress(prev => ({ ...prev, completed }));
      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 1500));
    }

    setBatchProgress({ total: 0, completed: 0, current: null, isRunning: false });
    if (!abortRef.current) {
      toast.success("Batch analysis complete!");
    }
  };

  return { analyze, analyzeBatch, analyzingIds, batchProgress, stopBatch };
};
