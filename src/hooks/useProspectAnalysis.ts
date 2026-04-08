import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CostBreakdown {
  total_usd: number;
  breakdown: Record<string, { calls: number; cost: number }>;
}

export interface BatchCostSummary {
  totalCost: number;
  perProspect: CostBreakdown[];
  apiTotals: Record<string, { calls: number; cost: number }>;
}

export interface BatchProgress {
  total: number;
  completed: number;
  current: string | null;
  isRunning: boolean;
  isPaused: boolean;
  costSummary: BatchCostSummary;
}

export const useProspectAnalysis = () => {
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0, completed: 0, current: null, isRunning: false, isPaused: false,
    costSummary: { totalCost: 0, perProspect: [], apiTotals: {} },
  });
  const abortRef = useRef(false);
  const pauseRef = useRef(false);

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
      return data.data as Record<string, any>;
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
    pauseRef.current = false;
    toast.info("Stopping batch analysis after current prospect...");
  }, []);

  const pauseBatch = useCallback(() => {
    pauseRef.current = true;
    setBatchProgress(prev => ({ ...prev, isPaused: true }));
    toast.info("Pausing batch analysis after current prospect...");
  }, []);

  const resumeBatch = useCallback(() => {
    pauseRef.current = false;
    setBatchProgress(prev => ({ ...prev, isPaused: false }));
    toast.info("Resuming batch analysis...");
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
    pauseRef.current = false;
    const costSummary: BatchCostSummary = { totalCost: 0, perProspect: [], apiTotals: {} };
    setBatchProgress({ total: withWebsite.length, completed: 0, current: null, isRunning: true, isPaused: false, costSummary });
    toast.info(`Analyzing ${withWebsite.length} prospects...`);

    let completed = 0;
    for (const prospect of withWebsite) {
      if (abortRef.current) {
        toast.info(`Batch stopped. ${completed}/${withWebsite.length} completed.`);
        break;
      }

      // Wait while paused
      while (pauseRef.current && !abortRef.current) {
        await new Promise((r) => setTimeout(r, 500));
      }
      if (abortRef.current) {
        toast.info(`Batch stopped. ${completed}/${withWebsite.length} completed.`);
        break;
      }

      setBatchProgress(prev => ({ ...prev, current: prospect.business_name, completed }));
      const result = await analyze(prospect);

      // Track cost
      if (result?.cost) {
        const cost = result.cost as CostBreakdown;
        costSummary.totalCost += cost.total_usd;
        costSummary.perProspect.push(cost);
        for (const [api, usage] of Object.entries(cost.breakdown)) {
          if (!costSummary.apiTotals[api]) costSummary.apiTotals[api] = { calls: 0, cost: 0 };
          costSummary.apiTotals[api].calls += usage.calls;
          costSummary.apiTotals[api].cost += usage.cost;
        }
      }

      completed++;
      setBatchProgress(prev => ({ ...prev, completed, costSummary: { ...costSummary } }));
      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 1500));
    }

    setBatchProgress(prev => ({ ...prev, isRunning: false, isPaused: false }));
    if (!abortRef.current) {
      toast.success(`Batch analysis complete! Est. cost: $${costSummary.totalCost.toFixed(3)}`);
    }
  };

  return { analyze, analyzeBatch, analyzingIds, batchProgress, stopBatch, pauseBatch, resumeBatch };
};
