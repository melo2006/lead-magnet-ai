import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, MessageSquare, Eye, MousePointerClick, Phone, AlertTriangle,
  RefreshCw, Search, Ban, ExternalLink, TrendingUp, Clock
} from "lucide-react";
import { format, subDays, subHours, isAfter } from "date-fns";

type TimeRange = "24h" | "7d" | "30d" | "all";
type Channel = "all" | "email" | "sms";

interface ProspectEngagement {
  id: string;
  business_name: string;
  owner_name: string | null;
  niche: string | null;
  phone: string | null;
  email: string | null;
  pipeline_stage: string;
  do_not_contact: boolean;
  // Email
  email_sent_at: string | null;
  email_opened_at: string | null;
  email_clicked_at: string | null;
  // SMS
  sms_sent_at: string | null;
  sms_clicked_at: string | null;
  // Demo
  demo_viewed_at: string | null;
  demo_link: string | null;
  // General
  last_contacted_at: string | null;
  website_url: string | null;
}

const stageBadge = (stage: string) => {
  const colors: Record<string, string> = {
    new: "bg-muted text-muted-foreground",
    qualified: "bg-blue-500/20 text-blue-400",
    contacted: "bg-yellow-500/20 text-yellow-400",
    demo_sent: "bg-purple-500/20 text-purple-400",
    demo_viewed: "bg-emerald-500/20 text-emerald-400",
    interested: "bg-primary/20 text-primary",
    closed_won: "bg-green-500/20 text-green-400",
    closed_lost: "bg-red-500/20 text-red-400",
  };
  return <Badge className={colors[stage] || "bg-muted text-muted-foreground"}>{stage.replace(/_/g, " ")}</Badge>;
};

const timeAgo = (date: string | null) => {
  if (!date) return null;
  try {
    return format(new Date(date), "MMM d, h:mm a");
  } catch {
    return null;
  }
};

export default function EngagementDashboard() {
  const [prospects, setProspects] = useState<ProspectEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [channel, setChannel] = useState<Channel>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState("activity");

  const fetchProspects = async () => {
    setLoading(true);
    // Fetch all prospects that have any outreach activity
    const { data, error } = await supabase
      .from("prospects")
      .select("id, business_name, owner_name, niche, phone, email, pipeline_stage, do_not_contact, email_sent_at, email_opened_at, email_clicked_at, sms_sent_at, sms_clicked_at, demo_viewed_at, demo_link, last_contacted_at, website_url")
      .or("email_sent_at.not.is.null,sms_sent_at.not.is.null")
      .order("last_contacted_at", { ascending: false, nullsFirst: false });

    if (!error && data) {
      setProspects(data as ProspectEngagement[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProspects();
  }, []);

  // Filter by time range
  const cutoff = (() => {
    if (timeRange === "24h") return subHours(new Date(), 24);
    if (timeRange === "7d") return subDays(new Date(), 7);
    if (timeRange === "30d") return subDays(new Date(), 30);
    return new Date(0);
  })();

  const filtered = prospects.filter((p) => {
    // Time filter — check if any activity falls within range
    const dates = [p.email_sent_at, p.sms_sent_at, p.email_opened_at, p.email_clicked_at, p.sms_clicked_at, p.demo_viewed_at].filter(Boolean);
    const inRange = dates.some((d) => isAfter(new Date(d!), cutoff));
    if (!inRange && timeRange !== "all") return false;

    // Channel filter
    if (channel === "email" && !p.email_sent_at) return false;
    if (channel === "sms" && !p.sms_sent_at) return false;

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.business_name.toLowerCase().includes(q) ||
        (p.owner_name || "").toLowerCase().includes(q) ||
        (p.niche || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    totalContacted: filtered.length,
    emailsSent: filtered.filter((p) => p.email_sent_at).length,
    emailsOpened: filtered.filter((p) => p.email_opened_at).length,
    emailsClicked: filtered.filter((p) => p.email_clicked_at).length,
    smsSent: filtered.filter((p) => p.sms_sent_at).length,
    smsClicked: filtered.filter((p) => p.sms_clicked_at).length,
    demosViewed: filtered.filter((p) => p.demo_viewed_at).length,
    doNotContact: filtered.filter((p) => p.do_not_contact).length,
  };

  const openRate = stats.emailsSent > 0 ? Math.round((stats.emailsOpened / stats.emailsSent) * 100) : 0;
  const clickRate = stats.emailsSent > 0 ? Math.round((stats.emailsClicked / stats.emailsSent) * 100) : 0;
  const demoRate = stats.totalContacted > 0 ? Math.round((stats.demosViewed / stats.totalContacted) * 100) : 0;

  // Prospects who have NOT engaged at all (sent but no opens/clicks/demos)
  const noEngagement = filtered.filter(
    (p) => !p.email_opened_at && !p.email_clicked_at && !p.sms_clicked_at && !p.demo_viewed_at
  );

  // Hot leads — clicked or viewed demo
  const hotLeads = filtered.filter((p) => p.email_clicked_at || p.sms_clicked_at || p.demo_viewed_at);

  // DNC flagged
  const dncProspects = prospects.filter((p) => p.do_not_contact);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Engagement Tracker</h1>
          <p className="text-sm text-muted-foreground">Track opens, clicks, demo views, and opt-outs across all channels</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProspects} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {(["24h", "7d", "30d", "all"] as TimeRange[]).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={timeRange === t ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setTimeRange(t)}
            >
              {t === "24h" ? "24h" : t === "7d" ? "7 days" : t === "30d" ? "30 days" : "All time"}
            </Button>
          ))}
        </div>
        <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="email">Email only</SelectItem>
            <SelectItem value="sms">SMS only</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search business or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Contacted" value={stats.totalContacted} />
        <StatCard icon={<Mail className="h-4 w-4" />} label="Emails Sent" value={stats.emailsSent} />
        <StatCard icon={<Eye className="h-4 w-4" />} label="Opened" value={stats.emailsOpened} sub={`${openRate}%`} />
        <StatCard icon={<MousePointerClick className="h-4 w-4" />} label="Clicked" value={stats.emailsClicked} sub={`${clickRate}%`} />
        <StatCard icon={<MessageSquare className="h-4 w-4" />} label="SMS Sent" value={stats.smsSent} />
        <StatCard icon={<Phone className="h-4 w-4" />} label="Demos Viewed" value={stats.demosViewed} sub={`${demoRate}%`} />
        <StatCard icon={<Ban className="h-4 w-4" />} label="Opted Out" value={stats.doNotContact} accent="destructive" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="activity" className="text-xs">All Activity ({filtered.length})</TabsTrigger>
          <TabsTrigger value="hot" className="text-xs">🔥 Hot Leads ({hotLeads.length})</TabsTrigger>
          <TabsTrigger value="cold" className="text-xs">❄️ No Engagement ({noEngagement.length})</TabsTrigger>
          <TabsTrigger value="dnc" className="text-xs">🚫 Do Not Contact ({dncProspects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <EngagementTable prospects={filtered} />
        </TabsContent>
        <TabsContent value="hot">
          <EngagementTable prospects={hotLeads} />
        </TabsContent>
        <TabsContent value="cold">
          <EngagementTable prospects={noEngagement} />
        </TabsContent>
        <TabsContent value="dnc">
          <EngagementTable prospects={dncProspects} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: number; sub?: string; accent?: string }) {
  return (
    <Card className="border-border">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-[11px] uppercase tracking-wide">{label}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-bold ${accent === "destructive" ? "text-destructive" : "text-foreground"}`}>{value}</span>
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function EngagementTable({ prospects }: { prospects: ProspectEngagement[] }) {
  if (prospects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No prospects match these filters</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Business</TableHead>
            <TableHead className="text-xs">Stage</TableHead>
            <TableHead className="text-xs text-center">Email Sent</TableHead>
            <TableHead className="text-xs text-center">Opened</TableHead>
            <TableHead className="text-xs text-center">Clicked</TableHead>
            <TableHead className="text-xs text-center">SMS Sent</TableHead>
            <TableHead className="text-xs text-center">Demo Viewed</TableHead>
            <TableHead className="text-xs">Last Activity</TableHead>
            <TableHead className="text-xs text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prospects.slice(0, 100).map((p) => (
            <TableRow key={p.id} className={p.do_not_contact ? "opacity-50" : ""}>
              <TableCell className="text-xs">
                <div className="font-medium text-foreground">{p.business_name}</div>
                {p.owner_name && <div className="text-muted-foreground text-[10px]">{p.owner_name}</div>}
                {p.niche && <div className="text-muted-foreground text-[10px]">{p.niche}</div>}
              </TableCell>
              <TableCell>{stageBadge(p.pipeline_stage)}</TableCell>
              <TableCell className="text-center">
                {p.email_sent_at ? <EventDot color="blue" title={timeAgo(p.email_sent_at) || ""} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-center">
                {p.email_opened_at ? <EventDot color="yellow" title={timeAgo(p.email_opened_at) || ""} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-center">
                {p.email_clicked_at ? <EventDot color="green" title={timeAgo(p.email_clicked_at) || ""} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-center">
                {p.sms_sent_at ? <EventDot color="purple" title={timeAgo(p.sms_sent_at) || ""} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-center">
                {p.demo_viewed_at ? <EventDot color="emerald" title={timeAgo(p.demo_viewed_at) || ""} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {timeAgo(p.last_contacted_at) || "—"}
              </TableCell>
              <TableCell className="text-center">
                {p.do_not_contact ? (
                  <Badge variant="destructive" className="text-[10px]">DNC</Badge>
                ) : p.demo_viewed_at ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">Engaged</Badge>
                ) : p.email_opened_at || p.sms_clicked_at ? (
                  <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]">Opened</Badge>
                ) : (
                  <Badge className="bg-muted text-muted-foreground text-[10px]">Sent</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {prospects.length > 100 && (
        <div className="text-center py-2 text-xs text-muted-foreground border-t border-border">
          Showing 100 of {prospects.length} prospects
        </div>
      )}
    </div>
  );
}

function EventDot({ color, title }: { color: string; title: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-400",
    yellow: "bg-yellow-400",
    green: "bg-green-400",
    purple: "bg-purple-400",
    emerald: "bg-emerald-400",
  };
  return (
    <span title={title} className="inline-flex items-center justify-center">
      <span className={`w-2.5 h-2.5 rounded-full ${colors[color] || "bg-muted"}`} />
    </span>
  );
}
