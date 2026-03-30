import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Building2, Flame, Thermometer, Snowflake, Megaphone,
  TrendingUp, Search, Plus, ArrowRight, Mail, Eye,
  MousePointerClick, BarChart3
} from "lucide-react";

const CRMDashboard = () => {
  const { data: prospects = [] } = useQuery({
    queryKey: ["dashboard-prospects"],
    queryFn: async () => {
      const { data } = await supabase.from("prospects").select("*").limit(500);
      return data || [];
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["dashboard-campaigns"],
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("*").order("created_at", { ascending: false }).limit(10);
      return (data || []) as any[];
    },
  });

  const total = prospects.length;
  const hot = prospects.filter((p: any) => p.lead_temperature === "hot").length;
  const warm = prospects.filter((p: any) => p.lead_temperature === "warm").length;
  const cold = prospects.filter((p: any) => p.lead_temperature === "cold").length;
  const analyzed = prospects.filter((p: any) => p.ai_analyzed).length;
  const contacted = prospects.filter((p: any) => p.email_sent_at || p.sms_sent_at).length;

  const statCards = [
    { label: "Total Prospects", value: total, icon: Building2, color: "text-primary", bg: "bg-primary/10" },
    { label: "Hot Leads", value: hot, icon: Flame, color: "text-red-400", bg: "bg-red-400/10" },
    { label: "Warm Leads", value: warm, icon: Thermometer, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Cold Leads", value: cold, icon: Snowflake, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "AI Analyzed", value: analyzed, icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
    { label: "Contacted", value: contacted, icon: Mail, color: "text-purple-400", bg: "bg-purple-400/10" },
  ];

  const recentProspects = prospects
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const statusLabel: Record<string, { text: string; cls: string }> = {
    draft: { text: "Draft", cls: "bg-muted text-muted-foreground" },
    active: { text: "Active", cls: "bg-primary/20 text-primary" },
    paused: { text: "Paused", cls: "bg-amber-400/20 text-amber-400" },
    completed: { text: "Done", cls: "bg-emerald-400/20 text-emerald-400" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your prospects and campaigns</p>
        </div>
        <div className="flex gap-2">
          <Link to="/prospects" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary border border-border text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors">
            <Search className="w-4 h-4" /> Find Leads
          </Link>
          <Link to="/campaigns" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Campaign
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Active Campaigns */}
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Campaigns</h2>
            </div>
            <Link to="/campaigns" className="text-[11px] text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4">
            {campaigns.length === 0 ? (
              <div className="text-center py-8">
                <Megaphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No campaigns yet</p>
                <Link to="/campaigns" className="text-xs text-primary hover:underline mt-1 inline-block">Create your first campaign</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.slice(0, 5).map((c: any) => {
                  const st = statusLabel[c.status] || statusLabel.draft;
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          {c.niche && <span>{c.niche}</span>}
                          <span>{c.prospect_count} prospects</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Prospects */}
        <div className="bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Recent Prospects</h2>
            </div>
            <Link to="/crm/prospects" className="text-[11px] text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4 space-y-1.5">
            {recentProspects.length === 0 ? (
              <div className="text-center py-8">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No prospects yet</p>
                <Link to="/crm/prospects" className="text-xs text-primary hover:underline mt-1 inline-block">Search for businesses</Link>
              </div>
            ) : (
              recentProspects.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{p.business_name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.city}{p.state ? `, ${p.state}` : ""} · {p.niche || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{p.lead_score}</span>
                    {p.lead_temperature === "hot" && <Flame className="w-3 h-3 text-red-400" />}
                    {p.lead_temperature === "warm" && <Thermometer className="w-3 h-3 text-amber-400" />}
                    {p.lead_temperature === "cold" && <Snowflake className="w-3 h-3 text-blue-400" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard;
