import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Activity, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type UsageStats = {
  today: { scans: number; cost: number; leads: number };
  thisMonth: { scans: number; cost: number; leads: number };
  allTime: { scans: number; cost: number; leads: number };
};

const FIRECRAWL_COST_PER_SEARCH = 0.01;

export function estimateScanCost(platformCount: number): {
  minCost: number;
  maxCost: number;
  firecrawlCalls: number;
} {
  const maxQueries = 3;
  const firecrawlCalls = maxQueries * platformCount;
  return {
    minCost: firecrawlCalls * FIRECRAWL_COST_PER_SEARCH,
    maxCost: firecrawlCalls * FIRECRAWL_COST_PER_SEARCH,
    firecrawlCalls,
  };
}

export function CostEstimate({ platformCount }: { platformCount: number }) {
  const { minCost, firecrawlCalls } = estimateScanCost(platformCount);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
      <Calculator className="w-3.5 h-3.5 text-primary" />
      <span>
        Est. cost: <strong className="text-foreground">${minCost.toFixed(2)}</strong>
        {" "}({firecrawlCalls} search calls — Tavily free tier used first, Firecrawl as fallback)
      </span>
    </div>
  );
}

export function LastScanCost({ usage }: { usage: { firecrawl_calls: number; ai_calls: number; estimated_cost_usd: number } | null }) {
  if (!usage) return null;

  return (
    <div className="flex items-center gap-2 text-xs bg-green-500/10 text-green-700 dark:text-green-400 rounded-md px-3 py-2">
      <DollarSign className="w-3.5 h-3.5" />
      <span>
        Last scan cost: <strong>${usage.estimated_cost_usd.toFixed(4)}</strong>
        {" "}({usage.firecrawl_calls} searches, {usage.ai_calls} AI batches)
      </span>
    </div>
  );
}

export function UsageDashboard() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [todayRes, monthRes, allRes] = await Promise.all([
        supabase.from("scraping_usage").select("estimated_cost_usd, leads_found").gte("created_at", todayStart),
        supabase.from("scraping_usage").select("estimated_cost_usd, leads_found").gte("created_at", monthStart),
        supabase.from("scraping_usage").select("estimated_cost_usd, leads_found"),
      ]);

      const sum = (rows: any[] | null) => ({
        scans: rows?.length || 0,
        cost: rows?.reduce((s, r) => s + Number(r.estimated_cost_usd), 0) || 0,
        leads: rows?.reduce((s, r) => s + (r.leads_found || 0), 0) || 0,
      });

      setStats({
        today: sum(todayRes.data),
        thisMonth: sum(monthRes.data),
        allTime: sum(allRes.data),
      });
    } catch (err) {
      console.error("Failed to load usage stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) return null;

  const items = [
    { label: "Today", icon: Activity, ...stats.today },
    { label: "This Month", icon: TrendingUp, ...stats.thisMonth },
    { label: "All Time", icon: DollarSign, ...stats.allTime },
  ];

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" /> Scraping Cost Tracker
        </p>
        <div className="grid grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-lg font-bold">${item.cost.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">
                {item.scans} scans · {item.leads} leads
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
