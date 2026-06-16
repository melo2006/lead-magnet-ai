import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle2, XCircle, Ban, RefreshCw, Inbox } from "lucide-react";
import { format } from "date-fns";

type LogRow = {
  id: string;
  message_sid: string | null;
  to_phone: string;
  from_phone: string | null;
  body: string | null;
  template_id: string | null;
  status: string;
  error_code: string | null;
  error_message: string | null;
  is_opt_out: boolean;
  is_test: boolean;
  sent_at: string;
  delivered_at: string | null;
};

type DailyRow = { day: string; sent: number; delivered: number; failed: number; opt_out: number };

const STATUS_COLORS: Record<string, string> = {
  delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  sent: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  queued: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  failed: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  undelivered: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  opt_out: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  inbound: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

export default function SMSDashboard() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sms_delivery_log")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(500);
    setLogs((data as LogRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("sms-log-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_delivery_log" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Aggregate per day
  const dailyMap = new Map<string, DailyRow>();
  for (const l of logs) {
    const day = l.sent_at.slice(0, 10);
    const row = dailyMap.get(day) ?? { day, sent: 0, delivered: 0, failed: 0, opt_out: 0 };
    if (l.is_opt_out || l.status === "opt_out") row.opt_out++;
    else if (l.status === "delivered") { row.delivered++; row.sent++; }
    else if (l.status === "failed" || l.status === "undelivered") row.failed++;
    else row.sent++;
    dailyMap.set(day, row);
  }
  const daily = Array.from(dailyMap.values()).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 14);

  const totals = {
    sent: logs.filter(l => !l.is_opt_out && l.status !== "opt_out" && l.status !== "inbound").length,
    delivered: logs.filter(l => l.status === "delivered").length,
    failed: logs.filter(l => l.status === "failed" || l.status === "undelivered").length,
    optOut: logs.filter(l => l.is_opt_out || l.status === "opt_out").length,
    inbound: logs.filter(l => l.status === "inbound").length,
  };

  // Top carrier errors
  const errorMap = new Map<string, number>();
  for (const l of logs) {
    if (l.error_code) {
      const key = `${l.error_code} — ${l.error_message ?? "Unknown"}`;
      errorMap.set(key, (errorMap.get(key) ?? 0) + 1);
    }
  }
  const topErrors = Array.from(errorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">SMS Delivery</h1>
          <p className="text-xs text-muted-foreground">Live Twilio sent / failed / opt-out events</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={MessageSquare} label="Sent" value={totals.sent} color="text-blue-400" />
        <StatCard icon={CheckCircle2} label="Delivered" value={totals.delivered} color="text-emerald-400" />
        <StatCard icon={XCircle} label="Failed" value={totals.failed} color="text-rose-400" />
        <StatCard icon={Ban} label="Opt-outs" value={totals.optOut} color="text-purple-400" />
        <StatCard icon={Inbox} label="Replies" value={totals.inbound} color="text-cyan-400" />
      </div>

      {/* Daily breakdown */}
      <Card className="p-4">
        <h2 className="text-sm font-bold mb-3">Last 14 days</h2>
        {daily.length === 0 ? (
          <p className="text-xs text-muted-foreground">No SMS activity yet. Send a test from the Prospects view to populate this dashboard.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4">Day</th>
                  <th className="py-2 pr-4">Sent</th>
                  <th className="py-2 pr-4">Delivered</th>
                  <th className="py-2 pr-4">Failed</th>
                  <th className="py-2 pr-4">Opt-outs</th>
                  <th className="py-2">Delivery rate</th>
                </tr>
              </thead>
              <tbody>
                {daily.map(d => {
                  const rate = d.sent > 0 ? Math.round((d.delivered / d.sent) * 100) : 0;
                  return (
                    <tr key={d.day} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-medium">{d.day}</td>
                      <td className="py-2 pr-4">{d.sent}</td>
                      <td className="py-2 pr-4 text-emerald-400">{d.delivered}</td>
                      <td className="py-2 pr-4 text-rose-400">{d.failed}</td>
                      <td className="py-2 pr-4 text-purple-400">{d.opt_out}</td>
                      <td className="py-2">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Carrier errors */}
      <Card className="p-4">
        <h2 className="text-sm font-bold mb-3">Top carrier errors</h2>
        {topErrors.length === 0 ? (
          <p className="text-xs text-muted-foreground">No carrier errors recorded.</p>
        ) : (
          <ul className="space-y-1.5">
            {topErrors.map(([msg, count]) => (
              <li key={msg} className="flex items-center justify-between text-xs">
                <span className="truncate pr-3 text-foreground">{msg}</span>
                <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30">{count}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Recent events */}
      <Card className="p-4">
        <h2 className="text-sm font-bold mb-3">Recent events</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">To</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Template</th>
                <th className="py-2 pr-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 50).map(l => (
                <tr key={l.id} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 text-muted-foreground">{format(new Date(l.sent_at), "MMM d HH:mm")}</td>
                  <td className="py-1.5 pr-3 font-mono">{l.to_phone}{l.is_test && <span className="ml-1 text-[10px] text-amber-400">[TEST]</span>}</td>
                  <td className="py-1.5 pr-3">
                    <Badge variant="outline" className={STATUS_COLORS[l.status] ?? "bg-muted text-muted-foreground"}>
                      {l.status}
                    </Badge>
                  </td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{l.template_id ?? "—"}</td>
                  <td className="py-1.5 pr-3 text-rose-400 truncate max-w-[260px]">
                    {l.error_code ? `${l.error_code}: ${l.error_message ?? ""}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof MessageSquare; label: string; value: number; color: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
    </Card>
  );
}
