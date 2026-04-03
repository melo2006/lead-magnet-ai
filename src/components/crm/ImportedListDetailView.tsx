import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Globe, Mail, Phone, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ImportedListDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: list } = useQuery({
    queryKey: ["imported-list", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imported_lists")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["imported-leads", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imported_leads")
        .select("*")
        .eq("list_id", id!)
        .order("lead_score", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const scoreBadge = (score: string) => {
    if (score === "Hot") return "bg-red-500/15 text-red-400 border-red-500/20";
    if (score === "Medium") return "bg-amber-500/15 text-amber-400 border-amber-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  const scoreOrder = (s: string) => (s === "Hot" ? 0 : s === "Medium" ? 1 : 2);
  const sorted = [...leads].sort((a, b) => scoreOrder(a.lead_score ?? "Cold") - scoreOrder(b.lead_score ?? "Cold"));

  const categories = [...new Set(leads.map((l: any) => l.category).filter(Boolean))];
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterScore, setFilterScore] = useState<string>("all");

  const filtered = sorted.filter((l: any) => {
    if (filterCat !== "all" && l.category !== filterCat) return false;
    if (filterScore !== "all" && l.lead_score !== filterScore) return false;
    return true;
  });

  const handleLaunchDemo = (lead: any) => {
    if (!lead.website_url) return;
    const url = lead.website_url.startsWith("http") ? lead.website_url : `https://${lead.website_url}`;

    const params = new URLSearchParams({
      url,
      name: lead.business_name || "Business",
    });

    if (lead.phone) params.set("callerPhone", lead.phone);
    if (lead.email) params.set("callerEmail", lead.email);

    navigate(`/demo?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/imported")} className="p-1.5 rounded-md hover:bg-secondary">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{list?.name || "Loading..."}</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} leads · {list?.source_filename}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Total", value: leads.length, color: "text-foreground" },
          { label: "Hot", value: leads.filter((l: any) => l.lead_score === "Hot").length, color: "text-red-400" },
          { label: "Medium", value: leads.filter((l: any) => l.lead_score === "Medium").length, color: "text-amber-400" },
          { label: "Categories", value: categories.length, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-md border border-border bg-card text-foreground"
        >
          <option value="all">All Categories</option>
          {categories.map((c: any) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterScore}
          onChange={(e) => setFilterScore(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-md border border-border bg-card text-foreground"
        >
          <option value="all">All Scores</option>
          <option value="Hot">Hot</option>
          <option value="Medium">Medium</option>
          <option value="Cold">Cold</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px]">Business</TableHead>
              <TableHead className="text-[11px]">Category</TableHead>
              <TableHead className="text-[11px]">Score</TableHead>
              <TableHead className="text-[11px]">Contact</TableHead>
              <TableHead className="text-[11px]">Web Score</TableHead>
              <TableHead className="text-[11px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                  No leads match your filters
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead: any) => (
                <TableRow key={lead.id} className="group">
                  <TableCell>
                    <div>
                      <p className="text-xs font-medium text-foreground">{lead.business_name}</p>
                      <p className="text-[10px] text-muted-foreground">{lead.city}, {lead.state}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground">
                      {lead.category || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${scoreBadge(lead.lead_score)}`}>
                      {lead.lead_score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="text-muted-foreground hover:text-primary">
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="text-muted-foreground hover:text-primary">
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {lead.website_url && (
                        <a href={lead.website_url} target="_blank" rel="noopener" className="text-muted-foreground hover:text-primary">
                          <Globe className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(lead.website_quality_score || 0) * 10}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{lead.website_quality_score}/10</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleLaunchDemo(lead)}
                      disabled={!lead.website_url}
                    >
                      <Play className="w-3 h-3" /> Demo
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ImportedListDetailView;
