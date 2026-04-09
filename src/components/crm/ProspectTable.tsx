import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Phone, MapPin, Star, ExternalLink, Zap, MessageSquare,
  ChevronDown, ChevronUp, Flame, Thermometer, Snowflake,
  Brain, Loader2, CheckSquare, Square, Mail, Send,
  ArrowUpDown, Gauge, ChevronLeft, ChevronRight,
  Linkedin, Facebook, Instagram, Smartphone,
  Settings2, GripVertical, Eye, EyeOff, Info,
  Mic, Globe, MessageCircle, StopCircle, Pause, Play,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Prospect } from "@/hooks/useProspectSearch";
import { useProspectAnalysis } from "@/hooks/useProspectAnalysis";

interface Props {
  prospects: Prospect[];
  isLoading: boolean;
  onRefetch?: () => void;
  onOutreach?: (selected: Prospect[]) => void;
  onCampaign?: (selected: Prospect[]) => void;
  onReviewAnalyzed?: () => void;
  onReviewEmails?: () => void;
  onReviewSms?: () => void;
}

type SortKey =
  | "lead_score" | "rating" | "review_count" | "business_name"
  | "has_website" | "has_chat_widget" | "has_voice_ai"
  | "has_online_booking" | "website_quality_score" | "lead_temperature"
  | "city" | "ai_analyzed" | "niche" | "contact_method" | "owner_name"
  | "voiceai_fit" | "webdev_fit" | "created_at" | "preview_type" | "phone_type" | "sms_capable" | "email";

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
type ColumnId = "business" | "niche" | "temp" | "location" | "actions" | "rating" | "reviews" | "score" | "website" | "chat" | "voiceai" | "booking" | "sitequality" | "ai" | "owner" | "contact" | "social" | "voiceai_candidate" | "webdev_candidate" | "sources" | "date_added" | "preview_type" | "phone_type" | "email" | "sms_capable";

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
  { id: "voiceai_candidate", label: "Voice AI Fit", sortKey: "voiceai_fit", minWidth: "85px", removable: true },
  { id: "temp", label: "Temp", sortKey: "lead_temperature", minWidth: "60px", removable: true },
  { id: "location", label: "Location", sortKey: "city", minWidth: "120px", removable: true },
  { id: "actions", label: "Actions", minWidth: "140px", removable: false },
  { id: "date_added", label: "Added", sortKey: "created_at", minWidth: "95px", removable: true },
  { id: "preview_type", label: "Preview", sortKey: "preview_type", minWidth: "80px", removable: true },
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
  { id: "phone_type", label: "Phone Type", sortKey: "phone_type", minWidth: "85px", removable: true },
  { id: "sms_capable", label: "SMS OK", sortKey: "sms_capable" as SortKey, minWidth: "70px", removable: true },
  { id: "email", label: "Email", sortKey: "email", minWidth: "140px", removable: true },
  { id: "sources", label: "Sources", minWidth: "110px", removable: true },
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

const ProspectTable = ({ prospects, isLoading, onRefetch, onOutreach, onCampaign, onReviewAnalyzed, onReviewEmails, onReviewSms }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("voiceai_fit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(DEFAULT_ORDER);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(new Set(DEFAULT_VISIBLE));
  const {
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
  } = useProspectAnalysis();
  const hasMonitorState = batchProgress.total > 0 || Boolean(interruptedState) || Boolean(lastBatchState);
  const returnTo = encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}`);
  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null);
  
  const [showAnalyzeConfirm, setShowAnalyzeConfirm] = useState(false);
  const [analyzeTarget, setAnalyzeTarget] = useState<"all" | "selected">("all");

  const handleSendSms = async (prospect: Prospect, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!prospect.phone || !prospect.id) {
      toast.error("This prospect has no phone number");
      return;
    }
    setSendingSmsId(prospect.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-outreach-sms", {
        body: {
          prospects: [{
            id: prospect.id,
            business_name: prospect.business_name,
            phone: prospect.phone,
            owner_name: (prospect as any).owner_name || null,
            website_url: prospect.website_url || null,
            niche: prospect.niche || null,
          }],
          customMessage: "",
          baseUrl: window.location.origin,
        },
      });
      if (error) throw error;
      if (data?.sent > 0) {
        toast.success(`SMS sent to ${prospect.business_name}!`);
        onRefetch?.();
      } else {
        toast.error(data?.results?.[0]?.error || "SMS failed to send");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send SMS");
    } finally {
      setSendingSmsId(null);
    }
  };

  const colMap = useMemo(() => Object.fromEntries(ALL_COLUMNS.map(c => [c.id, c])), []);
  const activeColumns = useMemo(() => columnOrder.filter(id => visibleColumns.has(id)), [columnOrder, visibleColumns]);

  const confirmAndAnalyze = (target: "all" | "selected") => {
    setAnalyzeTarget(target);
    setShowAnalyzeConfirm(true);
  };

  const startConfirmedAnalysis = () => {
    setShowAnalyzeConfirm(false);
    if (analyzeTarget === "all") handleAnalyzeAll();
    else handleBatchAnalyze();
  };

  const getAnalyzeCount = () => {
    if (analyzeTarget === "all") return sorted.filter((p) => !(p as any).ai_analyzed && p.has_website && p.id).length;
    return sorted.filter((p) => selectedIds.has(p.place_id) && !(p as any).ai_analyzed && p.has_website).length;
  };

  const toggleColumnVisibility = useCallback((id: ColumnId) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const getPreviewRank = (p: Prospect): number => {
    const url = p.website_url;
    if (!url) return 0;
    if (url.startsWith("https://")) return 2; // iFrame
    if ((p as any).website_screenshot) return 1; // Screenshot
    return 0; // HTTP
  };

  const sorted = useMemo(() => {
    return [...prospects].sort((a, b) => {
      if (sortBy === "voiceai_fit") {
        const aVal = a.has_website && !(a as any).has_voice_ai ? 2 : (a as any).has_voice_ai ? 0 : 1;
        const bVal = b.has_website && !(b as any).has_voice_ai ? 2 : (b as any).has_voice_ai ? 0 : 1;
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      }
      if (sortBy === "webdev_fit") {
        const aVal = a.has_website ? 0 : 1;
        const bVal = b.has_website ? 0 : 1;
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      }
      if (sortBy === "preview_type") {
        const aVal = getPreviewRank(a);
        const bVal = getPreviewRank(b);
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      }
      if (sortBy === "email") {
        const aEmail = (a as any).owner_email || (a as any).email || "";
        const bEmail = (b as any).owner_email || (b as any).email || "";
        if (!aEmail && !bEmail) return 0;
        if (!aEmail) return sortDir === "desc" ? -1 : 1;
        if (!bEmail) return sortDir === "desc" ? 1 : -1;
        return sortDir === "desc" ? bEmail.localeCompare(aEmail) : aEmail.localeCompare(bEmail);
      }
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
            <Link to={`/demo?url=${encodeURIComponent(p.website_url || "")}&name=${encodeURIComponent(p.business_name)}&niche=${encodeURIComponent(p.niche || "")}&prospectId=${encodeURIComponent(p.id || "")}&callerPhone=${encodeURIComponent(p.phone || "")}&returnTo=${returnTo}`} onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors" title="Generate Demo"><Zap className="w-3.5 h-3.5" /></Link>
            {p.phone && (
              <button
                onClick={(e) => handleSendSms(p, e)}
                disabled={sendingSmsId === p.id}
                className={`p-1 rounded transition-colors disabled:opacity-50 ${(p as any).sms_sent_at ? "text-emerald-400 hover:bg-emerald-400/20" : "text-muted-foreground hover:bg-primary/20 hover:text-primary"}`}
                title={(p as any).sms_sent_at ? "SMS sent — click to resend" : "Send SMS with demo link"}
              >
                {sendingSmsId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        );
      case "date_added": {
        const date = (p as any).created_at;
        if (!date) return <span className="text-[10px] text-muted-foreground">—</span>;
        return (
          <span className="text-[10px] text-muted-foreground whitespace-nowrap" title={new Date(date).toLocaleString()}>
            {format(new Date(date), "MMM d, yyyy")}
          </span>
        );
      }
      case "preview_type": {
        const hasScreenshot = !!(p as any).website_screenshot;
        const websiteUrl = p.website_url;
        if (!websiteUrl) return <span className="text-[10px] text-muted-foreground">—</span>;
        // Determine preview type based on available data
        const isHttps = websiteUrl?.startsWith("https://");
        // If has screenshot but no https → screenshot only; if https → likely iframe capable
        if (isHttps) {
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">iFrame</span>;
        }
        if (hasScreenshot) {
          return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">Screenshot</span>;
        }
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">HTTP</span>;
      }
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
      case "sources": {
        const bd = (p as any).business_data || {};
        const hasExa = !!bd.exa_research && Array.isArray(bd.exa_research) && bd.exa_research.length > 0;
        const hasFirecrawl = !!bd.services || !!bd.tagline || !!bd.about || !!bd.branding || !!bd.voice_agent_context || !!(p as any).website_screenshot || ((p as any).website_quality_score || 0) > 0;
        const hasAi = !!(p as any).ai_analyzed;
        if (!hasExa && !hasFirecrawl && !hasAi) return <span className="text-[10px] text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {hasExa && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/25">Exa</span>}
            {hasFirecrawl && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25">FC</span>}
            {hasAi && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25">AI</span>}
          </div>
        );
      }
      case "phone_type": {
        const pt = (p as any).phone_type;
        if (!pt) return <span className="text-[10px] text-muted-foreground">—</span>;
        const phoneTypeStyles: Record<string, string> = {
          mobile: "text-emerald-400 bg-emerald-500/15 border-emerald-500/25",
          landline: "text-amber-400 bg-amber-500/15 border-amber-500/25",
          voip: "text-violet-400 bg-violet-500/15 border-violet-500/25",
        };
        const label = pt.charAt(0).toUpperCase() + pt.slice(1);
        return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${phoneTypeStyles[pt] || "text-muted-foreground bg-secondary border-border"}`}>{label}</span>;
      }
      case "email": {
        const email = (p as any).owner_email || (p as any).email;
        if (!email) return <span className="text-[10px] text-muted-foreground">—</span>;
        return (
          <a
            href={`mailto:${email}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-primary hover:underline truncate block max-w-[140px]"
            title={email}
          >
            {email}
          </a>
        );
      }
      case "sms_capable": {
        const sc = (p as any).sms_capable;
        if (sc === null || sc === undefined) return <span className="text-[10px] text-muted-foreground">—</span>;
        return sc ? (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">✓ Yes</span>
        ) : (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25">✗ No</span>
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

  if (prospects.length === 0 && !hasMonitorState) {
    return (
      <div className="bg-card border border-border rounded-xl p-12 text-center">
        <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-foreground font-semibold mb-1">No prospects yet</h3>
        <p className="text-sm text-muted-foreground">Search for businesses above to start building your pipeline</p>
      </div>
    );
  }

  const unanalyzedCount = sorted.filter((p) => !(p as any).ai_analyzed && p.has_website).length;
  const analyzedCount = sorted.filter((p) => !!(p as any).ai_analyzed && p.has_website).length;
  const websiteProspectCount = sorted.filter((p) => p.has_website && p.id).length;
  const withAnyEmailCount = sorted.filter((p) => Boolean((p as any).owner_email || (p as any).email)).length;
  const withPhoneTypeCount = sorted.filter((p) => Boolean((p as any).phone_type)).length;
  const smsReadyCount = sorted.filter((p) => (p as any).sms_capable === true).length;
  const persistedBatch = interruptedState ?? lastBatchState;
  const persistedCompleted = persistedBatch?.completed ?? 0;
  const persistedTotal = persistedBatch?.total ?? 0;
  const persistedEmails = persistedBatch?.emailsFound ?? 0;
  const persistedPhones = persistedBatch?.phonesClassified ?? 0;
  const persistedCost = persistedBatch?.costSummary.totalCost ?? 0;
  const livePct = batchProgress.total > 0 ? (batchProgress.completed / batchProgress.total) * 100 : 0;
  const persistedPct = persistedTotal > 0 ? (persistedCompleted / persistedTotal) * 100 : 0;
  const coveragePct = websiteProspectCount > 0 ? (analyzedCount / websiteProspectCount) * 100 : 0;
  const hasRecoverableBatch = Boolean(interruptedState && !batchProgress.isRunning);
  const activeCostSummary = batchProgress.isRunning
    ? batchProgress.costSummary
    : persistedBatch?.costSummary ?? batchProgress.costSummary;
  const apiUsageChips = Object.entries(activeCostSummary.apiTotals).filter(([, v]) => v.calls > 0);
  const liveElapsed = batchProgress.startedAt ? (Date.now() - batchProgress.startedAt) / 1000 : 0;
  const livePerProspectSec =
    batchProgress.completed > 0 && liveElapsed > 0 ? liveElapsed / batchProgress.completed : 0;
  const liveRemainingSec = Math.max(0, batchProgress.total - batchProgress.completed) * livePerProspectSec;
  const liveEtaMin = livePerProspectSec > 0 ? Math.ceil(liveRemainingSec / 60) : null;
  const persistedElapsed = persistedBatch?.startedAt ? (Date.now() - persistedBatch.startedAt) / 1000 : 0;
  const persistedPerProspectSec =
    persistedCompleted > 0 && persistedElapsed > 0 ? persistedElapsed / persistedCompleted : 0;
  const persistedRemainingSec = Math.max(0, persistedTotal - persistedCompleted) * persistedPerProspectSec;
  const persistedEtaMin = persistedPerProspectSec > 0 ? Math.ceil(persistedRemainingSec / 60) : null;
  const monitorPct = batchProgress.isRunning ? livePct : persistedBatch ? persistedPct : coveragePct;
  const progressDoneValue = batchProgress.isRunning
    ? batchProgress.completed
    : persistedBatch
      ? persistedCompleted
      : analyzedCount;
  const progressLeftValue = batchProgress.isRunning
    ? Math.max(0, batchProgress.total - batchProgress.completed)
    : persistedBatch
      ? Math.max(0, persistedTotal - persistedCompleted)
      : unanalyzedCount;
  const emailMetricValue = batchProgress.isRunning
    ? batchProgress.emailsFound
    : persistedBatch
      ? persistedEmails
      : withAnyEmailCount;
  const phoneMetricValue = batchProgress.isRunning
    ? batchProgress.phonesClassified
    : persistedBatch
      ? persistedPhones
      : withPhoneTypeCount;
  const costValue = batchProgress.isRunning
    ? `$${batchProgress.costSummary.totalCost.toFixed(3)}`
    : persistedBatch
      ? `$${persistedCost.toFixed(3)}`
      : activeCostSummary.totalCost > 0
        ? `$${activeCostSummary.totalCost.toFixed(3)}`
        : `~$${(unanalyzedCount * 0.025).toFixed(2)}`;
  const monitorStatus = batchProgress.isRunning
    ? batchProgress.isPaused
      ? "paused"
      : "running"
    : persistedBatch?.status ?? (analyzedCount > 0 ? "completed" : "idle");
  const monitorEvents = [...(batchProgress.isRunning ? batchProgress.events : persistedBatch?.events ?? [])]
    .slice(-4)
    .reverse();
  const monitorLastUpdatedAt = batchProgress.isRunning
    ? batchProgress.lastUpdatedAt
    : persistedBatch?.updatedAt ?? null;
  const monitorLastError = batchProgress.isRunning
    ? batchProgress.lastError
    : persistedBatch?.lastError ?? null;
  const monitorCurrentName = batchProgress.isRunning
    ? batchProgress.current
    : persistedBatch?.current ?? null;
  const monitorLastCompletedName = batchProgress.isRunning
    ? batchProgress.lastCompletedName
    : persistedBatch?.lastCompletedName ?? null;
  const statusBadgeClasses: Record<string, string> = {
    idle: "border-border bg-secondary text-muted-foreground",
    running: "border-primary/30 bg-primary/10 text-primary",
    paused: "border-border bg-secondary text-foreground",
    interrupted: "border-border bg-secondary text-foreground",
    stopped: "border-destructive/30 bg-destructive/10 text-destructive",
    completed: "border-primary/30 bg-primary/10 text-primary",
    failed: "border-destructive/30 bg-destructive/10 text-destructive",
  };
  const formatEta = (etaMin: number | null) => {
    if (etaMin === null) return "Calculating…";
    if (etaMin <= 0) return "<1 min";
    if (etaMin >= 60) return `${Math.floor(etaMin / 60)}h ${etaMin % 60}m`;
    return `${etaMin} min`;
  };
  const formatRelativeTime = (timestamp: number | null) => {
    if (!timestamp) return "just now";
    const diffMs = Math.max(0, Date.now() - timestamp);
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };
  const monitorSummary = batchProgress.isRunning
    ? `${batchProgress.completed}/${batchProgress.total} completed${monitorCurrentName && !batchProgress.isPaused ? ` · analyzing ${monitorCurrentName}` : ""}${liveEtaMin !== null && !batchProgress.isPaused ? ` · ETA ${formatEta(liveEtaMin)}` : ""}`
    : hasRecoverableBatch
      ? `${persistedCompleted}/${persistedTotal} completed before the browser session ended · resume without re-running finished leads`
      : monitorStatus === "failed"
        ? `Last run failed after ${progressDoneValue}/${persistedTotal || websiteProspectCount} leads${monitorLastError ? ` · ${monitorLastError}` : ""}`
        : monitorStatus === "stopped"
          ? `Last run was stopped at ${progressDoneValue}/${persistedTotal || websiteProspectCount} leads`
          : monitorStatus === "completed" && persistedTotal > 0
            ? `Last run completed ${persistedCompleted}/${persistedTotal} leads${monitorLastCompletedName ? ` · last finished ${monitorLastCompletedName}` : ""}`
            : `${analyzedCount} of ${websiteProspectCount} website prospects in this view already enhanced · ${unanalyzedCount} still remaining`;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Enrichment Monitor</p>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  statusBadgeClasses[monitorStatus] ?? statusBadgeClasses.idle
                }`}
              >
                {monitorStatus}
              </span>
              {monitorLastUpdatedAt && (
                <span className="text-[10px] text-muted-foreground">
                  Updated {formatRelativeTime(monitorLastUpdatedAt)}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {monitorStatus === "running"
                  ? "Enhancement is running"
                  : monitorStatus === "paused"
                    ? "Enhancement is paused"
                    : monitorStatus === "interrupted"
                      ? "Enhancement was interrupted"
                      : monitorStatus === "failed"
                        ? "Enhancement needs attention"
                        : monitorStatus === "completed"
                          ? "Enhancement completed"
                          : monitorStatus === "stopped"
                            ? "Enhancement was stopped"
                            : "Enhancement controls live here"}
              </h2>
              <p className="text-xs text-muted-foreground">{monitorSummary}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {batchProgress.isRunning ? (
              <>
                {batchProgress.isPaused ? (
                  <Button size="sm" onClick={resumeBatch}>
                    <Play className="w-3.5 h-3.5" />
                    Resume
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={pauseBatch}>
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={stopBatch}>
                  <StopCircle className="w-3.5 h-3.5" />
                  Stop
                </Button>
              </>
            ) : (
              <>
                {hasRecoverableBatch && (
                  <Button size="sm" onClick={resumeInterrupted}>
                    <Play className="w-3.5 h-3.5" />
                    Resume
                  </Button>
                )}
                {unanalyzedCount > 0 && (
                  <Button
                    size="sm"
                    variant={hasRecoverableBatch || persistedBatch ? "outline" : "default"}
                    onClick={() => confirmAndAnalyze("all")}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    {persistedBatch ? `Restart (${unanalyzedCount})` : `Start (${unanalyzedCount})`}
                  </Button>
                )}
                {hasRecoverableBatch && (
                  <Button size="sm" variant="secondary" onClick={dismissInterrupted}>
                    <X className="w-3.5 h-3.5" />
                    Clear
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {batchProgress.isRunning
                ? "Live batch progress"
                : hasRecoverableBatch
                  ? "Interrupted batch progress"
                  : persistedBatch
                    ? "Last batch progress"
                    : "Enhanced coverage in this view"}
            </span>
            <span className="font-mono font-bold text-foreground">{monitorPct.toFixed(0)}%</span>
          </div>
          <Progress value={monitorPct} className="h-3" />
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
          <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Done</p>
            <p className="text-lg font-bold text-foreground">{progressDoneValue}</p>
          </div>
          <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining</p>
            <p className="text-lg font-bold text-foreground">{progressLeftValue}</p>
          </div>
          <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ETA</p>
            <p className="text-lg font-bold text-foreground">
              {monitorStatus === "running"
                ? batchProgress.completed > 0
                  ? formatEta(liveEtaMin)
                  : "Calculating…"
                : hasRecoverableBatch
                  ? persistedCompleted > 0
                    ? formatEta(persistedEtaMin)
                    : "Resume"
                  : monitorStatus === "completed"
                    ? "Done"
                    : monitorStatus === "failed" || monitorStatus === "stopped"
                      ? "Stopped"
                      : "—"}
            </p>
            {monitorStatus === "running" && livePerProspectSec > 0 ? (
              <p className="text-[9px] text-muted-foreground mt-0.5">
                ~{Math.round(livePerProspectSec)}s per lead
              </p>
            ) : hasRecoverableBatch && persistedPerProspectSec > 0 ? (
              <p className="text-[9px] text-muted-foreground mt-0.5">
                ~{Math.round(persistedPerProspectSec)}s per lead before interruption
              </p>
            ) : null}
          </div>
          <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Emails</p>
            <p className="text-lg font-bold text-foreground">{emailMetricValue}</p>
          </div>
          <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Phones</p>
            <p className="text-lg font-bold text-foreground">{phoneMetricValue}</p>
          </div>
          <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">SMS OK</p>
            <p className="text-lg font-bold text-foreground">{smsReadyCount}</p>
          </div>
          <div className="bg-card/60 rounded-lg px-3 py-2 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost</p>
            <p className="text-lg font-bold text-foreground">{costValue}</p>
          </div>
        </div>

        {apiUsageChips.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[10px]">
            {apiUsageChips.map(([api, usage]) => (
              <span key={api} className="px-2 py-1 rounded bg-secondary border border-border text-muted-foreground">
                {api}: {usage.calls} calls {usage.cost > 0 ? `($${usage.cost.toFixed(3)})` : "(free)"}
              </span>
            ))}
          </div>
        )}

        {monitorLastError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-destructive">Latest error</p>
            <p className="text-xs text-foreground">{monitorLastError}</p>
          </div>
        )}

        {(monitorEvents.length > 0 || monitorLastCompletedName) && (
          <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recent activity</p>
              {monitorLastCompletedName && (
                <p className="text-[10px] text-muted-foreground">
                  Last finished <span className="text-foreground">{monitorLastCompletedName}</span>
                </p>
              )}
            </div>
            {monitorEvents.length > 0 ? (
              <div className="space-y-1.5">
                {monitorEvents.map((event) => (
                  <div key={`${event.type}-${event.at}`} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-foreground">{event.message}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{formatRelativeTime(event.at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No audit events yet.</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onReviewAnalyzed?.()}
            disabled={!analyzedCount}
            className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary/80 transition-colors"
          >
            View Analyzed
          </button>
          <button
            onClick={() => onReviewEmails?.()}
            disabled={!withAnyEmailCount}
            className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary/80 transition-colors"
          >
            View Emails
          </button>
          <button
            onClick={() => onReviewSms?.()}
            disabled={!smsReadyCount}
            className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary/80 transition-colors"
          >
            View SMS OK
          </button>
        </div>

        {!batchProgress.isRunning && unanalyzedCount > 0 && (
          <p className="text-[10px] text-muted-foreground">
            Estimated remaining enrichment cost is ~${(unanalyzedCount * 0.025).toFixed(2)} at about $0.025 per prospect.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{prospects.length} prospects · Page {safePage}/{totalPages}</p>
          <ScoringLegend />
        </div>
        <div className="flex items-center gap-2">
          {unanalyzedCount > 0 && !batchProgress.isRunning && (
            <button
              onClick={() => confirmAndAnalyze("all")}
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
            <button onClick={() => confirmAndAnalyze("selected")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
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
            <button
              onClick={() => onCampaign?.(sorted.filter((p) => selectedIds.has(p.place_id)))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
            >
              <Zap className="w-3 h-3" /> Build Campaign
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
                <Link to={`/demo?url=${encodeURIComponent(p.website_url || "")}&name=${encodeURIComponent(p.business_name)}&niche=${encodeURIComponent(p.niche || "")}&prospectId=${encodeURIComponent(p.id || "")}&returnTo=${returnTo}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"><Zap className="w-3 h-3" /> Generate Demo</Link>
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

      {/* Cost Estimate Confirmation Dialog */}
      <Dialog open={showAnalyzeConfirm} onOpenChange={setShowAnalyzeConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" />Confirm Enrichment</DialogTitle>
            <DialogDescription>Review the estimated cost before starting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-lg px-3 py-3 border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prospects</p>
                <p className="text-2xl font-bold text-foreground">{getAnalyzeCount()}</p>
                <p className="text-[10px] text-muted-foreground">with websites to analyze</p>
              </div>
              <div className="bg-primary/5 rounded-lg px-3 py-3 border border-primary/20">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Est. Cost</p>
                <p className="text-2xl font-bold text-primary">${(getAnalyzeCount() * 0.025).toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">~$0.02–0.03 per prospect</p>
              </div>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border space-y-1.5">
              <p className="text-xs font-semibold text-foreground">What enrichment does:</p>
              <ul className="text-[11px] text-muted-foreground space-y-1">
                <li className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-emerald-400 shrink-0" /><strong>Hunter.io</strong> — Finds owner/business emails</li>
                <li className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-blue-400 shrink-0" /><strong>Twilio</strong> — Classifies phone type & SMS capability</li>
                <li className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-orange-400 shrink-0" /><strong>Firecrawl</strong> — Scrapes website content & screenshots</li>
                <li className="flex items-center gap-1.5"><Brain className="w-3 h-3 text-primary shrink-0" /><strong>AI</strong> — Sales assessment & lead scoring</li>
              </ul>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
              <p className="text-xs text-amber-200"><strong>Est. time:</strong> ~{Math.ceil(getAnalyzeCount() * 10 / 60)} min. You can pause or stop anytime.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAnalyzeConfirm(false)}>Cancel</Button>
            <Button onClick={startConfirmedAnalysis} className="gap-2"><Brain className="w-4 h-4" />Start Enrichment (${(getAnalyzeCount() * 0.025).toFixed(2)})</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProspectTable;
