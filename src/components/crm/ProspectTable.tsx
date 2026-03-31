import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Phone, MapPin, Star, ExternalLink, Zap, MessageSquare,
  ChevronDown, ChevronUp, Flame, Thermometer, Snowflake,
  Brain, Loader2, CheckSquare, Square, Mail, Send,
  ArrowUpDown, Gauge, ChevronLeft, ChevronRight,
  Linkedin, Facebook, Instagram, Smartphone,
  Settings2, GripVertical, Eye, EyeOff, Info,
  Mic, Globe
} from "lucide-react";
import { Link } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  | "city" | "ai_analyzed" | "niche" | "contact_method" | "owner_name"
  | "voiceai_fit" | "webdev_fit";

const tempIcons: Record<string, any> = {
  hot: Flame, warm: Thermometer, cold: Snowflake,
};
const tempColors: Record<string, string> = {
  hot: "text-red-400 bg-red-400/10 border-red-400/30",
  warm: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  cold: "text-blue-400 bg-blue-400/10 border-blue-400/30",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Column definitions
type ColumnId = "business" | "niche" | "temp" | "location" | "actions" | "rating" | "reviews" | "score" | "website" | "chat" | "voiceai" | "booking" | "sitequality" | "ai" | "owner" | "contact" | "social" | "voiceai_candidate" | "webdev_candidate";

interface ColumnDef {
  id: ColumnId;
  label: string;
  sortKey?: SortKey;
  minWidth: string;
  removable: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: "business", label: "Business", sortKey: "business_name", minWidth: "200px", removable: false },
  { id: "niche", label: "Niche", sortKey: "niche", minWidth: "100px", removable: true },
  { id: "temp", label: "Temp", sortKey: "lead_temperature", minWidth: "60px", removable: true },
  { id: "location", label: "Location", sortKey: "city", minWidth: "120px", removable: true },
  { id: "actions", label: "Actions", minWidth: "120px", removable: false },
  { id: "voiceai_candidate", label: "Voice AI Fit", sortKey: "voiceai_fit", minWidth: "85px", removable: true },
  { id: "webdev_candidate", label: "Web Dev Fit", sortKey: "webdev_fit", minWidth: "85px", removable: true },
  { id: "rating", label: "Rating", sortKey: "rating", minWidth: "60px", removable: true },
  { id: "reviews", label: "Reviews", sortKey: "review_count", minWidth: "70px", removable: true },
  { id: "score", label: "Score", sortKey: "lead_score", minWidth: "70px", removable: true },
  { id: "website", label: "Website", sortKey: "has_website", minWidth: "70px", removable: true },
  { id: "chat", label: "Chat", sortKey: "has_chat_widget", minWidth: "70px", removable: true },
  { id: "voiceai", label: "Voice AI", sortKey: "has_voice_ai", minWidth: "70px", removable: true },
  { id: "booking", label: "Booking", sortKey: "has_online_booking", minWidth: "75px", removable: true },
  { id: "sitequality", label: "Site Quality", sortKey: "website_quality_score", minWidth: "80px", removable: true },
  { id: "ai", label: "AI", sortKey: "ai_analyzed", minWidth: "55px", removable: true },
  { id: "owner", label: "Owner", sortKey: "owner_name", minWidth: "100px", removable: true },
  { id: "contact", label: "Contact", sortKey: "contact_method", minWidth: "90px", removable: true },
  { id: "social", label: "Social", minWidth: "80px", removable: true },
];

const DEFAULT_ORDER: ColumnId[] = ALL_COLUMNS.map(c => c.id);
const DEFAULT_VISIBLE = new Set<ColumnId>(ALL_COLUMNS.map(c => c.id));

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

// Lead Scoring Legend
const ScoringLegend = () => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Info className="w-3.5 h-3.5" />
          Scoring Guide
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <h4 className="text-sm font-semibold text-foreground mb-3">How Lead Scores Work</h4>
        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <div>
            <p className="font-semibold text-foreground mb-1">Score (0–100)</p>
            <ul className="space-y-1 list-disc pl-4">
              <li><strong className="text-red-400">No website</strong> → +40 pts (biggest opportunity)</li>
              <li><strong className="text-amber-400">Low reviews</strong> (&lt;10) → +20 pts</li>
              <li><strong className="text-amber-400">Low rating</strong> (&lt;4.0) → +15 pts</li>
              <li><strong className="text-primary">No chat widget</strong> → +10 pts</li>
              <li><strong className="text-primary">No voice AI</strong> → +10 pts</li>
              <li><strong className="text-primary">No online booking</strong> → +5 pts</li>
            </ul>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="font-semibold text-foreground mb-1">Temperature</p>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-3 h-3 text-red-400" />
              <span><strong className="text-red-400">Hot</strong> — Score ≥ 70 (high opportunity)</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Thermometer className="w-3 h-3 text-amber-400" />
              <span><strong className="text-amber-400">Warm</strong> — Score 40–69</span>
            </div>
            <div className="flex items-center gap-2">
              <Snowflake className="w-3 h-3 text-blue-400" />
              <span><strong className="text-blue-400">Cold</strong> — Score &lt; 40 (already optimized)</span>
            </div>
          </div>
          <p className="pt-2 border-t border-border text-[11px]">
            Higher scores mean the business is <em>missing</em> tools we can provide — voice AI, chat, website, or booking. These are your best prospects.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Column Manager
const ColumnManager = ({
  columnOrder, visibleColumns, onReorder, onToggle,
}: {
  columnOrder: ColumnId[];
  visibleColumns: Set<ColumnId>;
  onReorder: (order: ColumnId[]) => void;
  onToggle: (id: ColumnId) => void;
}) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(idx, 0, moved);
    onReorder(newOrder);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const colMap = Object.fromEntries(ALL_COLUMNS.map(c => [c.id, c]));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Settings2 className="w-3.5 h-3.5" />
          Columns
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1">
          Drag to reorder · Click to toggle
        </p>
        <div className="space-y-0.5 mt-1 max-h-72 overflow-y-auto">
          {columnOrder.map((colId, idx) => {
            const col = colMap[colId];
            if (!col) return null;
            const isVisible = visibleColumns.has(colId);
            return (
              <div
                key={colId}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab text-xs transition-colors ${
                  dragIdx === idx ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary"
                }`}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className={`flex-1 ${isVisible ? "text-foreground" : "text-muted-foreground"}`}>
                  {col.label}
                </span>
                {col.removable ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggle(colId); }}
                    className="p-0.5 rounded hover:bg-secondary"
                  >
                    {isVisible ? <Eye className="w-3 h-3 text-primary" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                  </button>
                ) : (
                  <span className="text-[9px] text-muted-foreground">required</span>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ProspectTable = ({ prospects, isLoading, onRefetch, onOutreach }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("lead_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_ORDER);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(new Set(DEFAULT_VISIBLE));
  const { analyze, analyzeBatch, analyzingIds } = useProspectAnalysis();
  const returnTo = encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}`);

  const colMap = useMemo(() => Object.fromEntries(ALL_COLUMNS.map(c => [c.id, c])), []);
  const activeColumns = useMemo(() => columnOrder.filter(id => visibleColumns.has(id)), [columnOrder, visibleColumns]);

  const toggleColumnVisibility = useCallback((id: ColumnId) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

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
    if (unanalyzed.length === 0) return;
    await analyzeBatch(unanalyzed.map((p) => ({ id: p.id, website_url: p.website_url, business_name: p.business_name, niche: p.niche })));
    onRefetch?.();
  };

  // Render a cell by column id
  const renderCell = (colId: ColumnId, p: Prospect, aiAnalyzed: boolean, isAnalyzing: boolean) => {
    const qualityScore = (p as any).website_quality_score || 0;
    const TempIcon = tempIcons[p.lead_temperature] || Snowflake;

    switch (colId) {
      case "business":
        return (
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate max-w-[200px]">{p.business_name}</h3>
            {p.phone && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5"><Phone className="w-2.5 h-2.5" />{p.phone}</span>}
          </div>
        );
      case "niche":
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground truncate max-w-[100px] block">
            {p.niche || "—"}
          </span>
        );
      case "temp":
        return (
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${tempColors[p.lead_temperature]}`}>
            <TempIcon className="w-2.5 h-2.5" />{p.lead_temperature?.toUpperCase()}
          </span>
        );
      case "location":
        return <span className="text-muted-foreground truncate max-w-[120px] block">{p.city}{p.state ? `, ${p.state}` : ""}</span>;
      case "actions":
        return (
          <div className="flex items-center gap-2.5">
            {p.website_url && (
              <a href={p.website_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors" title="Visit website"><ExternalLink className="w-3.5 h-3.5" /></a>
            )}
            {p.google_maps_url && (
              <a href={p.google_maps_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors" title="Google Maps"><MapPin className="w-3.5 h-3.5" /></a>
            )}
            {!aiAnalyzed && p.has_website && (
              <button onClick={(e) => { e.stopPropagation(); handleAnalyze(p); }} disabled={isAnalyzing} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50" title="AI Analyze"><Brain className="w-3.5 h-3.5" /></button>
            )}
            <Link to={`/demo?url=${encodeURIComponent(p.website_url || "")}&name=${encodeURIComponent(p.business_name)}&niche=${encodeURIComponent(p.niche || "")}&returnTo=${returnTo}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors" title="Generate Demo"><Zap className="w-3.5 h-3.5" /></Link>
          </div>
        );
      case "rating":
        return <div className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /><span className="font-medium text-foreground">{p.rating || "—"}</span></div>;
      case "reviews":
        return <span className="text-muted-foreground">{p.review_count}</span>;
      case "score":
        return (
          <div className="flex items-center gap-1">
            <div className="h-1.5 rounded-full bg-secondary w-10 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${p.lead_score}%`, backgroundColor: p.lead_score >= 75 ? "hsl(0, 84%, 60%)" : p.lead_score >= 50 ? "hsl(38, 92%, 50%)" : "hsl(210, 80%, 60%)" }} />
            </div>
            <span className="font-bold text-foreground">{p.lead_score}</span>
          </div>
        );
      case "website":
        return p.has_website ? <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Yes</span> : <span className="text-[10px] font-semibold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">No</span>;
      case "chat":
        return <BoolBadge value={p.has_chat_widget} scanned={!!aiAnalyzed} />;
      case "voiceai":
        return <BoolBadge value={p.has_voice_ai} scanned={!!aiAnalyzed} />;
      case "booking":
        return <BoolBadge value={p.has_online_booking} scanned={!!aiAnalyzed} />;
      case "sitequality":
        return !aiAnalyzed ? <span className="text-[10px] text-muted-foreground">—</span> : (
          <div className="flex items-center gap-1">
            <Gauge className="w-3 h-3 text-muted-foreground" />
            <span className={`font-medium ${qualityScore >= 70 ? "text-primary" : qualityScore >= 40 ? "text-amber-400" : "text-red-400"}`}>{qualityScore}</span>
          </div>
        );
      case "ai":
        return isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : aiAnalyzed ? <span className="text-[9px] px-1 py-0.5 rounded bg-primary/20 text-primary font-medium">AI ✓</span> : <span className="text-[10px] text-muted-foreground">—</span>;
      case "owner":
        return (p as any).owner_name ? (
          <div className="min-w-0">
            <span className="text-xs font-medium text-foreground truncate block max-w-[100px]">{(p as any).owner_name}</span>
            {(p as any).owner_phone && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Smartphone className="w-2.5 h-2.5" />{(p as any).owner_phone}</span>}
          </div>
        ) : <span className="text-[10px] text-muted-foreground">—</span>;
      case "contact":
        return (p as any).contact_method && (p as any).contact_method !== 'unknown' ? (
          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded capitalize">{(p as any).contact_method}</span>
        ) : <span className="text-[10px] text-muted-foreground">—</span>;
      case "social":
        return (
          <div className="flex items-center gap-1">
            {(p as any).linkedin_url && <a href={(p as any).linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-0.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors" title="LinkedIn"><Linkedin className="w-3.5 h-3.5" /></a>}
            {(p as any).facebook_url && <a href={(p as any).facebook_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-0.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors" title="Facebook"><Facebook className="w-3.5 h-3.5" /></a>}
            {(p as any).instagram_url && <a href={(p as any).instagram_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-0.5 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors" title="Instagram"><Instagram className="w-3.5 h-3.5" /></a>}
            {!(p as any).linkedin_url && !(p as any).facebook_url && !(p as any).instagram_url && <span className="text-[10px] text-muted-foreground">—</span>}
          </div>
        );
      case "voiceai_candidate": {
        // Voice AI candidate = has website (we can read it & install widget)
        const isCandidate = !!p.has_website;
        const hasIt = !!(p as any).has_voice_ai;
        if (hasIt) return <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Has AI</span>;
        return isCandidate ? (
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"><Mic className="w-2.5 h-2.5" />Ready</span>
        ) : (
          <span className="text-[10px] font-semibold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">No Site</span>
        );
      }
      case "webdev_candidate": {
        // Web dev candidate = no website (opportunity to build one)
        const needsWebsite = !p.has_website;
        return needsWebsite ? (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" />Hot</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        );
      }
      default:
        return null;
    }
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
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{prospects.length} prospects · Page {safePage}/{totalPages}</p>
          <ScoringLegend />
        </div>
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
          <ColumnManager
            columnOrder={columnOrder}
            visibleColumns={visibleColumns}
            onReorder={setColumnOrder}
            onToggle={toggleColumnVisibility}
          />
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
            <button
              onClick={() => onOutreach?.(sorted.filter((p) => selectedIds.has(p.place_id)))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/30 text-accent-foreground text-xs font-medium hover:bg-accent/30 transition-colors"
            >
              <Mail className="w-3 h-3" /> Email Selected
            </button>
            <button
              onClick={() => onOutreach?.(sorted.filter((p) => selectedIds.has(p.place_id)))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
            >
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
                {activeColumns.map(colId => {
                  const col = colMap[colId];
                  if (!col) return null;
                  return (
                    <th key={colId} className={`px-3 py-2.5 text-left`} style={{ minWidth: col.minWidth }}>
                      {col.sortKey ? (
                        <SortHeader label={col.label} sortKey={col.sortKey} currentSort={sortBy} currentDir={sortDir} onSort={toggleSort} />
                      ) : (
                        <span className="whitespace-nowrap">{col.label}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginated.map((p, i) => {
                const isExpanded = expandedId === p.place_id;
                const isSelected = selectedIds.has(p.place_id);
                const isAnalyzing = analyzingIds.has(p.id || "");
                const aiAnalyzed = (p as any).ai_analyzed;

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
                    {activeColumns.map(colId => (
                      <td key={colId} className="px-3 py-2.5">
                        {renderCell(colId, p, !!aiAnalyzed, isAnalyzing)}
                      </td>
                    ))}
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
              {((p as any).owner_name || (p as any).owner_email || (p as any).linkedin_url || (p as any).facebook_url) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-border/50">
                  {(p as any).owner_name && <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Owner/Manager</h4><p className="text-sm text-foreground">{(p as any).owner_name}</p>{(p as any).owner_phone && <p className="text-xs text-muted-foreground mt-0.5">{(p as any).owner_phone}</p>}{(p as any).owner_email && <p className="text-xs text-muted-foreground">{(p as any).owner_email}</p>}</div>}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-1">Social Profiles</h4>
                    <div className="flex flex-wrap gap-2">
                      {(p as any).linkedin_url && <a href={(p as any).linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><Linkedin className="w-3 h-3" />LinkedIn</a>}
                      {(p as any).facebook_url && <a href={(p as any).facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><Facebook className="w-3 h-3" />Facebook</a>}
                      {(p as any).instagram_url && <a href={(p as any).instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline"><Instagram className="w-3 h-3" />Instagram</a>}
                      {(p as any).whatsapp_number && <span className="text-xs text-muted-foreground">WhatsApp: {(p as any).whatsapp_number}</span>}
                    </div>
                  </div>
                  {(p as any).contact_method && (p as any).contact_method !== 'unknown' && <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Best Contact Method</h4><span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded capitalize">{(p as any).contact_method}</span></div>}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/50">
                {!aiAnalyzed && p.has_website && (
                  <button onClick={() => handleAnalyze(p)} disabled={isAnalyzing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors disabled:opacity-50">
                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}{isAnalyzing ? "Analyzing..." : "AI Analyze"}
                  </button>
                )}
                <Link to={`/demo?url=${encodeURIComponent(p.website_url || "")}&name=${encodeURIComponent(p.business_name)}&niche=${encodeURIComponent(p.niche || "")}&returnTo=${returnTo}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"><Zap className="w-3 h-3" /> Generate Demo</Link>
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
