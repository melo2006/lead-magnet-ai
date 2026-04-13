import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain, RefreshCw, Phone, Mail, MessageSquare, Monitor,
  Zap, Clock, CalendarDays, ArrowDown, Flame, TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FollowUpAction {
  prospect_id: string;
  business_name: string;
  priority: number;
  urgency: "immediate" | "today" | "this_week" | "low";
  channel: "call" | "email" | "sms" | "demo";
  action: string;
  reason: string;
  engagement_score: number;
}

interface AIResult {
  actions: FollowUpAction[];
  summary: string;
}

const urgencyConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  immediate: { label: "Act Now", cls: "bg-red-500/20 text-red-400 border-red-500/30", icon: <Zap className="w-3 h-3" /> },
  today: { label: "Today", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: <Clock className="w-3 h-3" /> },
  this_week: { label: "This Week", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: <CalendarDays className="w-3 h-3" /> },
  low: { label: "Low Priority", cls: "bg-muted text-muted-foreground border-border", icon: <ArrowDown className="w-3 h-3" /> },
};

const channelConfig: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  call: { label: "Call", icon: <Phone className="w-3.5 h-3.5" />, cls: "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" },
  email: { label: "Email", icon: <Mail className="w-3.5 h-3.5" />, cls: "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25" },
  sms: { label: "SMS", icon: <MessageSquare className="w-3.5 h-3.5" />, cls: "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25" },
  demo: { label: "Demo", icon: <Monitor className="w-3.5 h-3.5" />, cls: "bg-primary/15 text-primary hover:bg-primary/25" },
};

export default function FollowUpIntelligence() {
  const [result, setResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-follow-up-intelligence");
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setResult(data as AIResult);
      toast({ title: "Analysis complete", description: `${data.actions?.length || 0} action items generated.` });
    } catch (e: any) {
      const msg = e?.message || "Failed to run analysis";
      setError(msg);
      toast({ title: "Analysis failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const immediateCount = result?.actions.filter((a) => a.urgency === "immediate").length || 0;
  const todayCount = result?.actions.filter((a) => a.urgency === "today").length || 0;
  const avgScore = result?.actions.length
    ? Math.round(result.actions.reduce((s, a) => s + a.engagement_score, 0) / result.actions.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            AI Follow-Up Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI analyzes all prospect interactions and recommends prioritized next steps
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="gap-2">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {loading ? "Analyzing…" : result ? "Re-Analyze" : "Run AI Analysis"}
        </Button>
      </div>

      {/* Empty state */}
      {!result && !loading && !error && (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Brain className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Ready to Analyze</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Click "Run AI Analysis" to scan all prospect engagement data — email opens, demo views, chat transcripts, and voice calls — and get a prioritized action list.
            </p>
            <Button onClick={runAnalysis} size="lg" className="gap-2">
              <Zap className="w-4 h-4" /> Run AI Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing prospect engagement across all channels…</p>
            <p className="text-xs text-muted-foreground mt-1">This may take 10-15 seconds</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="border-destructive/50">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={runAnalysis}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !loading && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatMini label="Total Actions" value={result.actions.length} icon={<TrendingUp className="w-4 h-4" />} />
            <StatMini label="Act Now" value={immediateCount} icon={<Zap className="w-4 h-4 text-red-400" />} accent />
            <StatMini label="Follow Up Today" value={todayCount} icon={<Clock className="w-4 h-4 text-amber-400" />} />
            <StatMini label="Avg Engagement" value={`${avgScore}%`} icon={<Flame className="w-4 h-4 text-primary" />} />
          </div>

          {/* AI Summary */}
          {result.summary && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3 px-4">
                <p className="text-sm text-foreground flex items-start gap-2">
                  <Brain className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{result.summary}</span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action items */}
          <div className="space-y-2.5">
            {result.actions.map((a, i) => {
              const urg = urgencyConfig[a.urgency] || urgencyConfig.low;
              const ch = channelConfig[a.channel] || channelConfig.email;
              return (
                <Card key={a.prospect_id + i} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      {/* Priority number */}
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">#{i + 1}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-foreground">{a.business_name}</span>
                          <Badge className={`text-[10px] gap-1 ${urg.cls}`}>
                            {urg.icon} {urg.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            Score: {a.engagement_score}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground mb-1">{a.action}</p>
                        <p className="text-xs text-muted-foreground">{a.reason}</p>
                      </div>

                      {/* Channel action button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`shrink-0 gap-1.5 text-xs rounded-lg ${ch.cls}`}
                      >
                        {ch.icon} {ch.label}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {result.actions.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No action items generated — no engaged prospects found.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatMini({ label, value, icon, accent }: { label: string; value: number | string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
          {icon}
          <span className="text-[10px] uppercase tracking-wide">{label}</span>
        </div>
        <span className={`text-xl font-bold ${accent ? "text-red-400" : "text-foreground"}`}>{value}</span>
      </CardContent>
    </Card>
  );
}
