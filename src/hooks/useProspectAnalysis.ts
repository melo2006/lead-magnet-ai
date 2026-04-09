import { useState, useRef, useCallback, useEffect } from "react";
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
  emailsFound: number;
  phonesClassified: number;
  startedAt: number | null;
}

// Persisted subset that survives refresh
interface PersistedBatchState {
  total: number;
  completed: number;
  costSummary: BatchCostSummary;
  emailsFound: number;
  phonesClassified: number;
  startedAt: number | null;
  interruptedAt: number;
  // IDs of prospects that were already processed so we can skip them on resume
  processedIds: string[];
  // The full list of prospect IDs+data queued for batch
  pendingProspects: Array<{
    id: string;
    website_url: string;
    business_name: string;
    niche: string;
  }>;
}

const STORAGE_KEY = "leadengine_batch_progress";

const saveBatchState = (state: PersistedBatchState) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
};

const loadBatchState = (): PersistedBatchState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};

const clearBatchState = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
};

export const useProspectAnalysis = () => {
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0, completed: 0, current: null, isRunning: false, isPaused: false,
    costSummary: { totalCost: 0, perProspect: [], apiTotals: {} },
    emailsFound: 0, phonesClassified: 0, startedAt: null,
  });
  const [interruptedState, setInterruptedState] = useState<PersistedBatchState | null>(null);
  const abortRef = useRef(false);
  const pauseRef = useRef(false);
  const processedIdsRef = useRef<string[]>([]);

  // On mount, check for interrupted batch
  useEffect(() => {
    const saved = loadBatchState();
    if (saved && saved.completed < saved.total) {
      setInterruptedState(saved);
      // Restore the cost summary banner so user can see last progress
      setBatchProgress({
        total: saved.total,
        completed: saved.completed,
        current: null,
        isRunning: false,
        isPaused: false,
        costSummary: saved.costSummary,
        emailsFound: saved.emailsFound,
        phonesClassified: saved.phonesClassified,
        startedAt: null,
      });
    }
  }, []);

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
    clearBatchState();
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

  const dismissInterrupted = useCallback(() => {
    setInterruptedState(null);
    clearBatchState();
  }, []);

  const analyzeBatch = async (
    prospects: Array<{
      id?: string;
      website_url: string | null;
      business_name: string;
      niche?: string | null;
    }>,
    resumeFrom?: PersistedBatchState
  ) => {
    const withWebsite = prospects.filter((p) => p.id && p.website_url);
    if (withWebsite.length === 0) {
      toast.error("No prospects with websites to analyze");
      return;
    }

    abortRef.current = false;
    pauseRef.current = false;
    setInterruptedState(null);

    // If resuming, skip already-processed IDs
    const skipIds = new Set(resumeFrom?.processedIds || []);
    const toProcess = withWebsite.filter(p => !skipIds.has(p.id!));

    const costSummary: BatchCostSummary = resumeFrom
      ? { ...resumeFrom.costSummary }
      : { totalCost: 0, perProspect: [], apiTotals: {} };

    let completed = resumeFrom?.completed || 0;
    let emailsFound = resumeFrom?.emailsFound || 0;
    let phonesClassified = resumeFrom?.phonesClassified || 0;
    processedIdsRef.current = resumeFrom?.processedIds || [];

    const totalCount = resumeFrom?.total || withWebsite.length;
    const startTime = Date.now();

    setBatchProgress({
      total: totalCount, completed, current: null, isRunning: true, isPaused: false,
      costSummary, emailsFound, phonesClassified, startedAt: startTime,
    });

    toast.info(`${resumeFrom ? "Resuming" : "Analyzing"} ${toProcess.length} prospects...`);

    for (const prospect of toProcess) {
      if (abortRef.current) {
        toast.info(`Batch stopped. ${completed}/${totalCount} completed.`);
        clearBatchState();
        break;
      }

      while (pauseRef.current && !abortRef.current) {
        await new Promise((r) => setTimeout(r, 500));
      }
      if (abortRef.current) {
        toast.info(`Batch stopped. ${completed}/${totalCount} completed.`);
        clearBatchState();
        break;
      }

      setBatchProgress(prev => ({ ...prev, current: prospect.business_name, completed }));
      const result = await analyze(prospect);

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
      if (result?.owner_email || result?.email) emailsFound++;
      if (result?.phone_type) phonesClassified++;

      completed++;
      processedIdsRef.current.push(prospect.id!);
      setBatchProgress(prev => ({ ...prev, completed, costSummary: { ...costSummary }, emailsFound, phonesClassified }));

      // Persist progress so it survives refresh
      saveBatchState({
        total: totalCount,
        completed,
        costSummary: { ...costSummary },
        emailsFound,
        phonesClassified,
        startedAt: startTime,
        interruptedAt: Date.now(),
        processedIds: [...processedIdsRef.current],
        pendingProspects: withWebsite.map(p => ({
          id: p.id!, website_url: p.website_url!, business_name: p.business_name, niche: p.niche || "",
        })),
      });

      await new Promise((r) => setTimeout(r, 1500));
    }

    setBatchProgress(prev => ({ ...prev, isRunning: false, isPaused: false, startedAt: null }));
    if (!abortRef.current) {
      clearBatchState();
      toast.success(`Batch analysis complete! Est. cost: $${costSummary.totalCost.toFixed(3)}`);
    }
  };

  const resumeInterrupted = useCallback(() => {
    const saved = interruptedState;
    if (!saved) return;
    // Rebuild prospect list from persisted data and resume
    analyzeBatch(
      saved.pendingProspects.map(p => ({ id: p.id, website_url: p.website_url, business_name: p.business_name, niche: p.niche })),
      saved
    );
  }, [interruptedState]);

  return {
    analyze, analyzeBatch, analyzingIds, batchProgress,
    stopBatch, pauseBatch, resumeBatch,
    interruptedState, resumeInterrupted, dismissInterrupted,
  };
};
