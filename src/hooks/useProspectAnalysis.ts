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

export type BatchRunStatus = "idle" | "running" | "paused" | "interrupted" | "stopped" | "completed" | "failed";

export interface BatchAuditEvent {
  at: number;
  type:
    | "start"
    | "resume"
    | "lead_started"
    | "lead_completed"
    | "lead_failed"
    | "paused"
    | "stopped"
    | "completed"
    | "interrupted"
    | "failed";
  message: string;
  prospectName?: string | null;
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
  status: BatchRunStatus;
  failedCount: number;
  lastUpdatedAt: number | null;
  lastCompletedName: string | null;
  lastError: string | null;
  events: BatchAuditEvent[];
}

interface PersistedBatchState {
  total: number;
  completed: number;
  costSummary: BatchCostSummary;
  emailsFound: number;
  phonesClassified: number;
  failedCount: number;
  startedAt: number | null;
  interruptedAt: number;
  updatedAt: number;
  current: string | null;
  status: BatchRunStatus;
  lastCompletedName: string | null;
  lastError: string | null;
  events: BatchAuditEvent[];
  processedIds: string[];
  pendingProspects: Array<{
    id: string;
    website_url: string;
    business_name: string;
    niche: string;
  }>;
}

export const STORAGE_KEY = "leadengine_batch_progress";
const MAX_EVENTS = 8;

const emptyCostSummary = (): BatchCostSummary => ({
  totalCost: 0,
  perProspect: [],
  apiTotals: {},
});

const appendEvent = (events: BatchAuditEvent[], event: BatchAuditEvent) => {
  const next = [...events, event];
  return next.slice(-MAX_EVENTS);
};

const normalizeBatchState = (raw: any): PersistedBatchState | null => {
  if (!raw || typeof raw !== "object") return null;

  const total = Number(raw.total ?? 0);
  const completed = Number(raw.completed ?? 0);
  const isIncomplete = total > 0 && completed < total;
  const initialStatus = typeof raw.status === "string" ? raw.status : isIncomplete ? "interrupted" : "completed";
  const status: BatchRunStatus =
    (initialStatus === "running" || initialStatus === "paused") && isIncomplete
      ? "interrupted"
      : initialStatus;

  return {
    total,
    completed,
    costSummary: raw.costSummary ?? emptyCostSummary(),
    emailsFound: Number(raw.emailsFound ?? 0),
    phonesClassified: Number(raw.phonesClassified ?? 0),
    failedCount: Number(raw.failedCount ?? 0),
    startedAt: typeof raw.startedAt === "number" ? raw.startedAt : null,
    interruptedAt: Number(raw.interruptedAt ?? raw.updatedAt ?? Date.now()),
    updatedAt: Number(raw.updatedAt ?? raw.interruptedAt ?? Date.now()),
    current: typeof raw.current === "string" ? raw.current : null,
    status,
    lastCompletedName: typeof raw.lastCompletedName === "string" ? raw.lastCompletedName : null,
    lastError: typeof raw.lastError === "string" ? raw.lastError : null,
    events: Array.isArray(raw.events)
      ? raw.events
          .filter((event) => event && typeof event === "object" && typeof event.message === "string")
          .slice(-MAX_EVENTS)
          .map((event) => ({
            at: Number(event.at ?? Date.now()),
            type: event.type ?? "lead_completed",
            message: event.message,
            prospectName: typeof event.prospectName === "string" ? event.prospectName : null,
          }))
      : [],
    processedIds: Array.isArray(raw.processedIds)
      ? raw.processedIds.filter((id: unknown): id is string => typeof id === "string")
      : [],
    pendingProspects: Array.isArray(raw.pendingProspects)
      ? raw.pendingProspects
          .filter((prospect: any) => prospect?.id && prospect?.website_url)
          .map((prospect: any) => ({
            id: String(prospect.id),
            website_url: String(prospect.website_url),
            business_name: String(prospect.business_name ?? "Unknown business"),
            niche: String(prospect.niche ?? ""),
          }))
      : [],
  };
};

const saveBatchState = (state: PersistedBatchState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};

const loadBatchState = (): PersistedBatchState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeBatchState(JSON.parse(raw));
  } catch {
    return null;
  }
};

const clearBatchState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

export const useProspectAnalysis = () => {
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0,
    completed: 0,
    current: null,
    isRunning: false,
    isPaused: false,
    costSummary: emptyCostSummary(),
    emailsFound: 0,
    phonesClassified: 0,
    startedAt: null,
    status: "idle",
    failedCount: 0,
    lastUpdatedAt: null,
    lastCompletedName: null,
    lastError: null,
    events: [],
  });
  const [interruptedState, setInterruptedState] = useState<PersistedBatchState | null>(null);
  const [lastBatchState, setLastBatchState] = useState<PersistedBatchState | null>(null);
  const abortRef = useRef(false);
  const pauseRef = useRef(false);
  const processedIdsRef = useRef<string[]>([]);
  const lastErrorRef = useRef<string | null>(null);

  const persistMonitor = useCallback((state: PersistedBatchState | null) => {
    setLastBatchState(state);
    if (!state) {
      setInterruptedState(null);
      clearBatchState();
      return;
    }

    saveBatchState(state);
    if (state.completed < state.total) {
      setInterruptedState(state);
    } else {
      setInterruptedState(null);
    }
  }, []);

  useEffect(() => {
    const saved = loadBatchState();
    if (!saved) return;

    setLastBatchState(saved);
    if (saved.completed < saved.total) {
      setInterruptedState(saved);
    }

    setBatchProgress({
      total: saved.total,
      completed: saved.completed,
      current: saved.current,
      isRunning: false,
      isPaused: saved.status === "paused",
      costSummary: saved.costSummary,
      emailsFound: saved.emailsFound,
      phonesClassified: saved.phonesClassified,
      startedAt: null,
      status: saved.status,
      failedCount: saved.failedCount,
      lastUpdatedAt: saved.updatedAt,
      lastCompletedName: saved.lastCompletedName,
      lastError: saved.lastError,
      events: saved.events,
    });
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

    lastErrorRef.current = null;
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
      const message = err?.message || "Analysis failed";
      console.error("Analysis error:", err);
      lastErrorRef.current = message;
      toast.error(message);
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

    const at = Date.now();
    const stopEvent: BatchAuditEvent = {
      at,
      type: "stopped",
      message: "Stop requested. The batch will stop after the current lead.",
    };

    setBatchProgress((prev) => ({
      ...prev,
      isPaused: false,
      status: "stopped",
      lastUpdatedAt: at,
      events: appendEvent(prev.events, stopEvent),
    }));

    const saved = loadBatchState();
    if (saved) {
      persistMonitor({
        ...saved,
        status: "stopped",
        updatedAt: at,
        interruptedAt: at,
        events: appendEvent(saved.events, stopEvent),
      });
    }

    toast.info("Stopping batch analysis after current prospect...");
  }, [persistMonitor]);

  const pauseBatch = useCallback(() => {
    pauseRef.current = true;

    const at = Date.now();
    const pauseEvent: BatchAuditEvent = {
      at,
      type: "paused",
      message: "Batch paused.",
    };

    setBatchProgress((prev) => ({
      ...prev,
      isPaused: true,
      status: "paused",
      lastUpdatedAt: at,
      events: appendEvent(prev.events, pauseEvent),
    }));

    const saved = loadBatchState();
    if (saved) {
      persistMonitor({
        ...saved,
        status: "paused",
        updatedAt: at,
        interruptedAt: at,
        events: appendEvent(saved.events, pauseEvent),
      });
    }

    toast.info("Pausing batch analysis after current prospect...");
  }, [persistMonitor]);

  const resumeBatch = useCallback(() => {
    pauseRef.current = false;

    const at = Date.now();
    const resumeEvent: BatchAuditEvent = {
      at,
      type: "resume",
      message: "Batch resumed.",
    };

    setBatchProgress((prev) => ({
      ...prev,
      isPaused: false,
      status: "running",
      lastUpdatedAt: at,
      lastError: null,
      events: appendEvent(prev.events, resumeEvent),
    }));

    const saved = loadBatchState();
    if (saved) {
      persistMonitor({
        ...saved,
        status: "running",
        updatedAt: at,
        interruptedAt: at,
        lastError: null,
        events: appendEvent(saved.events, resumeEvent),
      });
    }

    toast.info("Resuming batch analysis...");
  }, [persistMonitor]);

  const dismissInterrupted = useCallback(() => {
    setInterruptedState(null);
    setLastBatchState(null);
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

    const skipIds = new Set(resumeFrom?.processedIds || []);
    const toProcess = withWebsite.filter((p) => !skipIds.has(p.id!));

    const costSummary: BatchCostSummary = resumeFrom
      ? { ...resumeFrom.costSummary }
      : emptyCostSummary();

    let completed = resumeFrom?.completed || 0;
    let emailsFound = resumeFrom?.emailsFound || 0;
    let phonesClassified = resumeFrom?.phonesClassified || 0;
    let failedCount = resumeFrom?.failedCount || 0;
    let lastCompletedName = resumeFrom?.lastCompletedName || null;
    let lastError = resumeFrom?.lastError || null;
    let events = resumeFrom?.events || [];
    processedIdsRef.current = resumeFrom?.processedIds || [];

    const totalCount = resumeFrom?.total || withWebsite.length;
    const startTime = Date.now();
    const startAt = Date.now();
    const startEvent: BatchAuditEvent = {
      at: startAt,
      type: resumeFrom ? "resume" : "start",
      message: resumeFrom
        ? `Resumed enrichment with ${toProcess.length} leads remaining.`
        : `Started enrichment for ${toProcess.length} leads.`,
    };
    events = appendEvent(events, startEvent);

    const basePendingProspects = withWebsite.map((p) => ({
      id: p.id!,
      website_url: p.website_url!,
      business_name: p.business_name,
      niche: p.niche || "",
    }));

    const createSnapshot = (
      overrides: Partial<PersistedBatchState> = {}
    ): PersistedBatchState => ({
      total: totalCount,
      completed,
      costSummary: { ...costSummary },
      emailsFound,
      phonesClassified,
      failedCount,
      startedAt: startTime,
      interruptedAt: overrides.interruptedAt ?? Date.now(),
      updatedAt: overrides.updatedAt ?? Date.now(),
      current: overrides.current ?? null,
      status: overrides.status ?? "running",
      lastCompletedName,
      lastError,
      events,
      processedIds: [...processedIdsRef.current],
      pendingProspects: basePendingProspects,
      ...overrides,
    });

    const initialSnapshot = createSnapshot({
      status: "running",
      updatedAt: startAt,
      interruptedAt: startAt,
      current: null,
      lastError: null,
      events,
    });

    persistMonitor(initialSnapshot);
    setBatchProgress({
      total: totalCount,
      completed,
      current: null,
      isRunning: true,
      isPaused: false,
      costSummary,
      emailsFound,
      phonesClassified,
      startedAt: startTime,
      status: "running",
      failedCount,
      lastUpdatedAt: startAt,
      lastCompletedName,
      lastError: null,
      events,
    });

    toast.info(`${resumeFrom ? "Resuming" : "Analyzing"} ${toProcess.length} prospects...`);

    try {
      for (const prospect of toProcess) {
        if (abortRef.current) {
          const stoppedAt = Date.now();
          const stopEvent: BatchAuditEvent = {
            at: stoppedAt,
            type: "stopped",
            message: `Batch stopped at ${completed}/${totalCount}.`,
          };
          events = appendEvent(events, stopEvent);
          const stoppedSnapshot = createSnapshot({
            status: "stopped",
            current: null,
            updatedAt: stoppedAt,
            interruptedAt: stoppedAt,
            events,
          });
          persistMonitor(stoppedSnapshot);
          setBatchProgress((prev) => ({
            ...prev,
            isRunning: false,
            isPaused: false,
            current: null,
            startedAt: null,
            status: "stopped",
            lastUpdatedAt: stoppedAt,
            events,
          }));
          toast.info(`Batch stopped. ${completed}/${totalCount} completed.`);
          return;
        }

        while (pauseRef.current && !abortRef.current) {
          await new Promise((r) => setTimeout(r, 500));
        }

        if (abortRef.current) {
          const stoppedAt = Date.now();
          const stopEvent: BatchAuditEvent = {
            at: stoppedAt,
            type: "stopped",
            message: `Batch stopped at ${completed}/${totalCount}.`,
          };
          events = appendEvent(events, stopEvent);
          const stoppedSnapshot = createSnapshot({
            status: "stopped",
            current: null,
            updatedAt: stoppedAt,
            interruptedAt: stoppedAt,
            events,
          });
          persistMonitor(stoppedSnapshot);
          setBatchProgress((prev) => ({
            ...prev,
            isRunning: false,
            isPaused: false,
            current: null,
            startedAt: null,
            status: "stopped",
            lastUpdatedAt: stoppedAt,
            events,
          }));
          toast.info(`Batch stopped. ${completed}/${totalCount} completed.`);
          return;
        }

        const leadStartedAt = Date.now();
        const startedEvent: BatchAuditEvent = {
          at: leadStartedAt,
          type: "lead_started",
          message: `Analyzing ${prospect.business_name}`,
          prospectName: prospect.business_name,
        };
        events = appendEvent(events, startedEvent);

        const runningSnapshot = createSnapshot({
          status: pauseRef.current ? "paused" : "running",
          current: prospect.business_name,
          updatedAt: leadStartedAt,
          interruptedAt: leadStartedAt,
          events,
        });
        persistMonitor(runningSnapshot);
        setBatchProgress((prev) => ({
          ...prev,
          current: prospect.business_name,
          completed,
          status: pauseRef.current ? "paused" : "running",
          lastUpdatedAt: leadStartedAt,
          events,
        }));

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

        const leadFinishedAt = Date.now();
        if (result) {
          lastCompletedName = prospect.business_name;
          lastError = null;
          events = appendEvent(events, {
            at: leadFinishedAt,
            type: "lead_completed",
            message: `Completed ${prospect.business_name}`,
            prospectName: prospect.business_name,
          });
        } else {
          failedCount++;
          lastError = lastErrorRef.current || `Failed to analyze ${prospect.business_name}`;
          events = appendEvent(events, {
            at: leadFinishedAt,
            type: "lead_failed",
            message: lastError,
            prospectName: prospect.business_name,
          });
        }

        const leadSnapshot = createSnapshot({
          status: pauseRef.current ? "paused" : "running",
          current: null,
          updatedAt: leadFinishedAt,
          interruptedAt: leadFinishedAt,
          lastCompletedName,
          lastError,
          failedCount,
          events,
        });
        persistMonitor(leadSnapshot);
        setBatchProgress((prev) => ({
          ...prev,
          completed,
          current: null,
          costSummary: { ...costSummary },
          emailsFound,
          phonesClassified,
          status: pauseRef.current ? "paused" : "running",
          failedCount,
          lastUpdatedAt: leadFinishedAt,
          lastCompletedName,
          lastError,
          events,
        }));

        await new Promise((r) => setTimeout(r, 1500));
      }

      const completedAt = Date.now();
      const completedEvent: BatchAuditEvent = {
        at: completedAt,
        type: "completed",
        message: `Batch completed. ${completed}/${totalCount} leads processed.`,
      };
      events = appendEvent(events, completedEvent);
      const completedSnapshot = createSnapshot({
        status: "completed",
        current: null,
        completed: totalCount,
        updatedAt: completedAt,
        interruptedAt: completedAt,
        lastError: null,
        events,
      });
      persistMonitor(completedSnapshot);
      setBatchProgress((prev) => ({
        ...prev,
        total: totalCount,
        completed: totalCount,
        current: null,
        isRunning: false,
        isPaused: false,
        startedAt: null,
        costSummary: { ...costSummary },
        emailsFound,
        phonesClassified,
        status: "completed",
        failedCount,
        lastUpdatedAt: completedAt,
        lastCompletedName,
        lastError: null,
        events,
      }));
      toast.success(`Batch analysis complete! Est. cost: $${costSummary.totalCost.toFixed(3)}`);
    } catch (err: any) {
      const failedAt = Date.now();
      const message = err?.message || "Batch analysis failed";
      lastError = message;
      events = appendEvent(events, {
        at: failedAt,
        type: "failed",
        message,
      });
      const failedSnapshot = createSnapshot({
        status: "failed",
        current: null,
        updatedAt: failedAt,
        interruptedAt: failedAt,
        lastError,
        failedCount: failedCount + 1,
        events,
      });
      persistMonitor(failedSnapshot);
      setBatchProgress((prev) => ({
        ...prev,
        isRunning: false,
        isPaused: false,
        current: null,
        startedAt: null,
        status: "failed",
        failedCount: failedCount + 1,
        lastUpdatedAt: failedAt,
        lastError,
        events,
      }));
      toast.error(message);
    }
  };

  const resumeInterrupted = useCallback(() => {
    const saved = interruptedState;
    if (!saved) return;
    analyzeBatch(
      saved.pendingProspects.map((p) => ({
        id: p.id,
        website_url: p.website_url,
        business_name: p.business_name,
        niche: p.niche,
      })),
      saved
    );
  }, [interruptedState]);

  return {
    analyze,
    analyzeBatch,
    analyzingIds,
    batchProgress,
    stopBatch,
    pauseBatch,
    resumeBatch,
    interruptedState,
    lastBatchState,
    resumeInterrupted,
    dismissInterrupted,
  };
};