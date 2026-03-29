import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Phone, MapPin, Star, ExternalLink, Zap, MessageSquare,
  ChevronDown, ChevronUp, Flame, Thermometer, Snowflake,
  Brain, Loader2, CheckSquare, Square, Mail, Send,
  ArrowUpDown, Gauge, ChevronLeft, ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Prospect } from "@/hooks/useProspectSearch";
import { useProspectAnalysis } from "@/hooks/useProspectAnalysis";

interface Props {
  prospects: Prospect[];
  isLoading: boolean;
  onRefetch?: () => void;
  onOutreach?: (selected: Prospect[]) => void;
}

type SortKey =
  | "lead_score" | "rating" | "review_count" | "business_name"
  | "has_website" | "has_chat_widget" | "has_voice_ai"
  | "has_online_booking" | "website_quality_score" | "lead_temperature"
  | "city" | "ai_analyzed" | "niche";

const tempIcons: Record<string, any> = {
  hot: Flame, warm: Thermometer, cold: Snowflake,
};
const tempColors: Record<string, string> = {
  hot: "text-red-400 bg-red-400/10 border-red-400/30",
  warm: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  cold: "text-blue-400 bg-blue-400/10 border-blue-400/30",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SortHeader = ({
  label, sortKey, currentSort, currentDir, onSort, className = "",
}: {
  label: string; sortKey: SortKey; currentSort: SortKey; currentDir: "asc" | "desc";
  onSort: (key: SortKey) => void; className?: string;
}) => (
  <button
    onClick={() => onSort(sortKey)}
    className={`flex items-center gap-0.5 hover:text-foreground whitespace-nowrap ${className}`}
  >
    {label}
    {currentSort === sortKey ? (
      currentDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
    ) : (
      <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
    )}
  </button>
);

const BoolBadge = ({ value, scanned }: { value: boolean | null; scanned: boolean }) => {
  if (!scanned) return <span className="text-[10px] text-muted-foreground">—</span>;
  return value ? (
    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Yes</span>
  ) : (
    <span className="text-[10px] font-semibold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">No</span>
  );
};

const ProspectTable = ({ prospects, isLoading, onRefetch, onOutreach }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("lead_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { analyze, analyzeBatch, analyzingIds } = useProspectAnalysis();

  const sorted = useMemo(() => {
    return [...prospects].sort((a, b) => {
      const aRaw = (a as any)[sortBy];
      const bRaw = (b as any)[sortBy];
      if (typeof aRaw === "boolean" || typeof bRaw === "boolean") {
        return sortDir === "desc" ? (bRaw ? 1 : 0) - (aRaw ? 1 : 0) : (aRaw ? 1 : 0) - (bRaw ? 1 : 0);
      }
      if (typeof aRaw === "string" && typeof bRaw === "string") {
        return sortDir === "desc" ? bRaw.localeCompare(aRaw) : aRaw.localeCompare(bRaw);
      }
      return sortDir === "desc" ? Number(bRaw ?? 0) - Number(aRaw ?? 0) : Number(aRaw ?? 0) - Number(bRaw ?? 0);
    });
  }, [prospects, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (col: SortKey) => {
    if (sortBy === col) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
    setPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sorted.map((p) => p.place_id)));
  };

  const handleAnalyze = async (prospect: Prospect) => {
    await analyze({ id: prospect.id, website_url: prospect.website_url, business_name: prospect.business_name, niche: prospect.niche });
    onRefetch?.();
  };

  const handleBatchAnalyze = async () => {
    const selected = sorted.filter((p) => selectedIds.has(p.place_id));
    await analyzeBatch(selected.map((p) => ({ id: p.id, website_url: p.website_url, business_name: p.business_name, niche: p.niche })));
    onRefetch?.();
  };

  const handleAnalyzeAll = async () => {
    const unanalyzed = sorted.filter((p) => !(p as any).ai_analyzed && p.has_website && p.id);
    if (unanalyzed.length === 0) { return; }
    await analyzeBatch(unanalyzed.map((p) => ({ id: p.id, website_url: p.website_url, business_name: p.business_name, niche: p.niche })));
    onRefetch?.();
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading prospects...</p>
        </div>
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-foreground font-semibold mb-1">No prospects yet</h3>
        <p className="text-sm text-muted-foreground">Search for businesses above to start building your pipeline</p>
      </div>
    );
  }

  const unanalyzedCount = sorted.filter((p) => !(p as any).ai_analyzed && p.has_website).length;

  return (
    <div className="space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">{prospects.length} prospects · Page {safePage}/{totalPages}</p>
        <div className="flex items-center gap-2">
          {unanalyzedCount > 0 && (
            <button
              onClick={handleAnalyzeAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
            >
              <Brain className="w-3.5 h-3.5" />
              Analyze All ({unanalyzedCount})
            </button>
          )}
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1 rounded-lg bg-secondary border border-border text-xs text-foreground"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s} per page</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-primary">{selectedIds.size} selected</span>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleBatchAnalyze} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
              <Brain className="w-3 h-3" /> Analyze Selected
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/30 text-accent-foreground text-xs font-medium hover:bg-accent/30 transition-colors">
              <Mail className="w-3 h-3" /> Email Selected
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors">
              <Send className="w-3 h-3" /> SMS Selected
            </button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </motion.div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <ScrollArea className="w-full">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                <th className="px-3 py-2.5 text-left sticky left-0 bg-secondary/50 z-10">
                  <button onClick={toggleSelectAll} className="flex items-center justify-center">
                    {selectedIds.size === sorted.length && sorted.length > 0 ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left min-w-[200px]"><SortHeader label="Business" sortKey="business_name" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[100px]"><SortHeader label="Niche" sortKey="niche" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[60px]"><SortHeader label="Temp" sortKey="lead_temperature" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[120px]"><SortHeader label="Location" sortKey="city" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[60px]"><SortHeader label="Rating" sortKey="rating" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[70px]"><SortHeader label="Reviews" sortKey="review_count" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[70px]"><SortHeader label="Score" sortKey="lead_score" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[70px]"><SortHeader label="Website" sortKey="has_website" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[70px]"><SortHeader label="Chat" sortKey="has_chat_widget" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[70px]"><SortHeader label="Voice AI" sortKey="has_voice_ai" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[75px]"><SortHeader label="Booking" sortKey="has_online_booking" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[80px]"><SortHeader label="Site Quality" sortKey="website_quality_score" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[55px]"><SortHeader label="AI" sortKey="ai_analyzed" currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} /></th>
                <th className="px-3 py-2.5 text-left min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginated.map((p, i) => {
                const TempIcon = tempIcons[p.lead_temperature] || Snowflake;
                const isExpanded = expandedId === p.place_id;
                const isSelected = selectedIds.has(p.place_id);
                const isAnalyzing = analyzingIds.has(p.id || "");
                const aiAnalyzed = (p as any).ai_analyzed;
                const qualityScore = (p as any).website_quality_score || 0;

                return (
                  <motion.tr
                    key={p.place_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    className={`hover:bg-secondary/30 cursor-pointer transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                    onClick={() => setExpandedId(isExpanded ? null : p.place_id)}
                  >
                    <td className="px-3 py-2.5 sticky left-0 bg-card z-10">
                      <button onClick={(e) => { e.stopPropagation(); toggleSelect(p.place_id); }} className="flex items-center justify-center">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate max-w-[200px]">{p.business_name}</h3>
                        {p.phone && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5"><Phone className="w-2.5 h-2.5" />{p.phone}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground truncate max-w-[100px] block">
                        {p.niche || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${tempColors[p.lead_temperature]}`}>
                        <TempIcon className="w-2.5 h-2.5" />{p.lead_temperature?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><span className="text-muted-foreground truncate max-w-[120px] block">{p.city}{p.state ? `, ${p.state}` : ""}</span></td>
                    <td className="px-3 py-2.5"><div className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /><span className="font-medium text-foreground">{p.rating || "—"}</span></div></td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.review_count}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 rounded-full bg-secondary w-10 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${p.lead_score}%`, backgroundColor: p.lead_score >= 75 ? "hsl(0, 84%, 60%)" : p.lead_score >= 50 ? "hsl(38, 92%, 50%)" : "hsl(210, 80%, 60%)" }} />
                        </div>
                        <span className="font-bold text-foreground">{p.lead_score}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">{p.has_website ? <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Yes</span> : <span className="text-[10px] font-semibold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">No</span>}</td>
                    <td className="px-3 py-2.5"><BoolBadge value={p.has_chat_widget} scanned={!!aiAnalyzed} /></td>
                    <td className="px-3 py-2.5"><BoolBadge value={p.has_voice_ai} scanned={!!aiAnalyzed} /></td>
                    <td className="px-3 py-2.5"><BoolBadge value={p.has_online_booking} scanned={!!aiAnalyzed} /></td>
                    <td className="px-3 py-2.5">
                      {!aiAnalyzed ? <span className="text-[10px] text-muted-foreground">—</span> : (
                        <div className="flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-muted-foreground" />
                          <span className={`font-medium ${qualityScore >= 70 ? "text-primary" : qualityScore >= 40 ? "text-amber-400" : "text-red-400"}`}>{qualityScore}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : aiAnalyzed ? <span className="text-[9px] px-1 py-0.5 rounded bg-primary/20 text-primary font-medium">AI ✓</span> : <span className="text-[10px] text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {p.website_url && (
                          <a href={p.website_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors" title="Visit website"><ExternalLink className="w-3.5 h-3.5" /></a>
                        )}
                        {p.google_maps_url && (
                          <a href={p.google_maps_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors" title="Google Maps"><MapPin className="w-3.5 h-3.5" /></a>
                        )}
                        {!aiAnalyzed && p.has_website && (
                          <button onClick={(e) => { e.stopPropagation(); handleAnalyze(p); }} disabled={isAnalyzing} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50" title="AI Analyze"><Brain className="w-3.5 h-3.5" /></button>
                        )}
                        <Link to={`/demo?url=${encodeURIComponent(p.website_url || "")}&name=${encodeURIComponent(p.business_name)}&niche=${encodeURIComponent(p.niche || "")}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors" title="Generate Demo"><Zap className="w-3.5 h-3.5" /></Link>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Expanded row detail */}
        {expandedId && (() => {
          const p = sorted.find((pr) => pr.place_id === expandedId);
          if (!p) return null;
          const aiAnalysis = (p as any).ai_analysis;
          const aiAnalyzed = (p as any).ai_analyzed;
          const isAnalyzing = analyzingIds.has(p.id || "");

          return (
            <motion.div key={expandedId} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4 pt-3 bg-secondary/20 border-t border-border/50">
              {aiAnalysis && (
                <div className="pb-3 mb-3 border-b border-border/50">
                  <div className="flex items-center gap-1.5 mb-1.5"><Brain className="w-3.5 h-3.5 text-primary" /><h4 className="text-xs font-semibold text-primary">AI Sales Analysis</h4></div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{aiAnalysis}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Full Address</h4><p className="text-sm text-foreground">{p.formatted_address}</p></div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Business Type</h4>
                  <p className="text-sm text-foreground">{p.primary_type || "N/A"}</p>
                  <div className="flex flex-wrap gap-1 mt-1">{(p.business_types || []).slice(0, 5).map((t: string) => (<span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">{t}</span>))}</div>
                </div>
                <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Website</h4>{p.website_url ? <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">{p.website_url}</a> : <p className="text-sm text-red-400">No website</p>}</div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/50">
                {!aiAnalyzed && p.has_website && (
                  <button onClick={() => handleAnalyze(p)} disabled={isAnalyzing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors disabled:opacity-50">
                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}{isAnalyzing ? "Analyzing..." : "AI Analyze"}
                  </button>
                )}
                <Link to={`/demo?url=${encodeURIComponent(p.website_url || "")}&name=${encodeURIComponent(p.business_name)}&niche=${encodeURIComponent(p.niche || "")}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"><Zap className="w-3 h-3" /> Generate Demo</Link>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/30 text-accent-foreground text-xs font-medium hover:bg-accent/30 transition-colors"><MessageSquare className="w-3 h-3" /> Send Outreach</button>
                {p.phone && <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"><Phone className="w-3 h-3" /> Call</a>}
              </div>
            </motion.div>
          );
        })()}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) pageNum = i + 1;
              else if (safePage <= 4) pageNum = i + 1;
              else if (safePage >= totalPages - 3) pageNum = totalPages - 6 + i;
              else pageNum = safePage - 3 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${pageNum === safePage ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}>{pageNum}</button>
              );
            })}
            <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectTable;
