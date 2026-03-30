import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { History, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { IntentLead, NICHES } from "./types";
import IntentLeadCard from "./IntentLeadCard";
import { formatDistanceToNow, format } from "date-fns";

type ScanGroup = {
  date: string;
  niche: string;
  location: string;
  leads: IntentLead[];
};

export default function ScanHistory() {
  const [leads, setLeads] = useState<IntentLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNiche, setFilterNiche] = useState("all");
  const [filterTemp, setFilterTemp] = useState("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    loadHistory();
  }, [filterNiche, filterTemp, limit]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("intent_leads")
        .select("*")
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filterNiche !== "all") query = query.eq("search_niche", filterNiche);
      if (filterTemp !== "all") query = query.eq("lead_temperature", filterTemp);

      const { data, error } = await query;
      if (error) throw error;
      setLeads((data || []) as IntentLead[]);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group leads by scan session (same created_at minute + niche + location)
  const groups: ScanGroup[] = [];
  const groupMap = new Map<string, IntentLead[]>();

  for (const lead of leads) {
    const dateKey = lead.created_at ? format(new Date(lead.created_at), "yyyy-MM-dd HH:mm") : "unknown";
    const key = `${dateKey}|${lead.search_niche || ""}|${lead.search_location || ""}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(lead);
  }

  for (const [key, groupLeads] of groupMap) {
    const [date, niche, location] = key.split("|");
    groups.push({ date, niche, location, leads: groupLeads });
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterNiche} onValueChange={setFilterNiche}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter niche" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Niches</SelectItem>
            {NICHES.map((n) => (
              <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTemp} onValueChange={setFilterTemp}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Temperature" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Temps</SelectItem>
            <SelectItem value="hot">🔥 Hot</SelectItem>
            <SelectItem value="warm">🌡️ Warm</SelectItem>
            <SelectItem value="cold">❄️ Cold</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={loadHistory} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        <span className="text-xs text-muted-foreground ml-auto">
          {leads.length} leads loaded
        </span>
      </div>

      {/* Grouped results */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Loading scan history...</CardContent>
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No previous scans found. Run a scan to get started.
          </CardContent>
        </Card>
      ) : (
        groups.map((group, gi) => {
          const key = `${group.date}|${group.niche}|${group.location}`;
          const isExpanded = expandedGroups.has(key);
          const hotCount = group.leads.filter((l) => l.lead_temperature === "hot").length;
          const warmCount = group.leads.filter((l) => l.lead_temperature === "warm").length;
          const scanDate = group.date !== "unknown" ? new Date(group.date) : null;

          return (
            <Card key={gi}>
              <button
                className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg"
                onClick={() => toggleGroup(key)}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold capitalize">{group.niche || "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">• {group.location || "Unknown location"}</span>
                  <span className="text-xs text-muted-foreground">
                    • {scanDate ? formatDistanceToNow(scanDate, { addSuffix: true }) : "Unknown date"}
                  </span>
                  <span className="text-xs">
                    {group.leads.length} leads
                    {hotCount > 0 && <span className="text-red-400 ml-1">({hotCount} 🔥)</span>}
                    {warmCount > 0 && <span className="text-orange-400 ml-1">({warmCount} 🌡️)</span>}
                  </span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {isExpanded && (
                <CardContent className="pt-0 space-y-3">
                  {group.leads.map((lead, i) => (
                    <IntentLeadCard key={i} lead={lead} index={i} />
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      {leads.length >= limit && (
        <Button variant="outline" className="w-full" onClick={() => setLimit((p) => p + 50)}>
          Load more...
        </Button>
      )}
    </div>
  );
}
