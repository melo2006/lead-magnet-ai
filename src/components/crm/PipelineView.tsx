import { useState } from "react";
import { motion } from "framer-motion";
import {
  Flame, Thermometer, Snowflake, Star, ExternalLink, Zap,
  Mail, Phone, Eye, MousePointerClick, ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Prospect } from "@/hooks/useProspectSearch";

interface Props {
  prospects: Prospect[];
  onRefetch?: () => void;
}

const STAGES = [
  { key: "new", label: "New Leads", color: "border-blue-500/40 bg-blue-500/5", badge: "bg-blue-500/20 text-blue-400" },
  { key: "qualified", label: "Qualified", color: "border-amber-500/40 bg-amber-500/5", badge: "bg-amber-500/20 text-amber-400" },
  { key: "contacted", label: "Contacted", color: "border-purple-500/40 bg-purple-500/5", badge: "bg-purple-500/20 text-purple-400" },
  { key: "demo_sent", label: "Demo Sent", color: "border-cyan-500/40 bg-cyan-500/5", badge: "bg-cyan-500/20 text-cyan-400" },
  { key: "demo_viewed", label: "Demo Viewed", color: "border-emerald-500/40 bg-emerald-500/5", badge: "bg-emerald-500/20 text-emerald-400" },
  { key: "interested", label: "Interested", color: "border-primary/40 bg-primary/5", badge: "bg-primary/20 text-primary" },
  { key: "closed_won", label: "Closed Won", color: "border-green-500/40 bg-green-500/5", badge: "bg-green-500/20 text-green-400" },
  { key: "closed_lost", label: "Lost", color: "border-red-500/40 bg-red-500/5", badge: "bg-red-500/20 text-red-400" },
] as const;

const tempIcons: Record<string, any> = { hot: Flame, warm: Thermometer, cold: Snowflake };
const tempColors: Record<string, string> = {
  hot: "text-red-400", warm: "text-amber-400", cold: "text-blue-400",
};

const PipelineView = ({ prospects, onRefetch }: Props) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const getProspectsForStage = (stage: string) => {
    return prospects.filter((p) => {
      const ps = (p as any).pipeline_stage || "new";
      return ps === stage;
    });
  };

  const moveToStage = async (prospectId: string, newStage: string) => {
    const { error } = await supabase
      .from("prospects")
      .update({ pipeline_stage: newStage } as any)
      .eq("id", prospectId);
    if (error) { toast.error("Failed to move prospect"); return; }
    toast.success(`Moved to ${STAGES.find(s => s.key === newStage)?.label}`);
    onRefetch?.();
  };

  const handleDragStart = (e: React.DragEvent, prospectId: string) => {
    setDraggingId(prospectId);
    e.dataTransfer.setData("text/plain", prospectId);
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const prospectId = e.dataTransfer.getData("text/plain");
    if (prospectId) moveToStage(prospectId, stage);
    setDraggingId(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-[1200px]">
        {STAGES.map((stage) => {
          const stageProspects = getProspectsForStage(stage.key);
          return (
            <div
              key={stage.key}
              className={`flex-1 min-w-[170px] rounded-xl border ${stage.color} p-3`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{stage.label}</h3>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${stage.badge}`}>
                  {stageProspects.length}
                </span>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {stageProspects.map((p) => {
                  const TempIcon = tempIcons[p.lead_temperature] || Snowflake;
                  const emailSent = !!(p as any).email_sent_at;
                  const emailOpened = !!(p as any).email_opened_at;
                  const demoViewed = !!(p as any).demo_viewed_at;

                  return (
                    <motion.div
                      key={p.place_id}
                      draggable
                      onDragStart={(e: any) => handleDragStart(e, p.id || "")}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card border border-border rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <h4 className="text-xs font-semibold text-foreground truncate flex-1">{p.business_name}</h4>
                        <TempIcon className={`w-3 h-3 flex-shrink-0 ${tempColors[p.lead_temperature]}`} />
                      </div>

                      {p.niche && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground mb-1.5 inline-block">
                          {p.niche}
                        </span>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                        {p.rating && (
                          <span className="flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />{p.rating}
                          </span>
                        )}
                        <span className="font-bold text-foreground">Score: {p.lead_score}</span>
                      </div>

                      {/* Campaign tracking indicators */}
                      <div className="flex items-center gap-1 mb-2">
                        {emailSent && (
                          <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Mail className="w-2.5 h-2.5" />Sent
                          </span>
                        )}
                        {emailOpened && (
                          <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Eye className="w-2.5 h-2.5" />Opened
                          </span>
                        )}
                        {demoViewed && (
                          <span className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            <MousePointerClick className="w-2.5 h-2.5" />Demo
                          </span>
                        )}
                      </div>

                      {/* Quick actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {p.website_url && (
                          <a href={p.website_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <Link to={`/demo?url=${encodeURIComponent(p.website_url || "")}&name=${encodeURIComponent(p.business_name)}&niche=${encodeURIComponent(p.niche || "")}`} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
                          <Zap className="w-3 h-3" />
                        </Link>
                        {p.phone && (
                          <a href={`tel:${p.phone}`} className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Move to next stage button */}
                      {stage.key !== "closed_won" && stage.key !== "closed_lost" && (
                        <button
                          onClick={() => {
                            const idx = STAGES.findIndex(s => s.key === stage.key);
                            if (idx < STAGES.length - 2) moveToStage(p.id || "", STAGES[idx + 1].key);
                          }}
                          className="mt-1 w-full flex items-center justify-center gap-1 text-[9px] font-medium text-muted-foreground hover:text-primary py-1 rounded hover:bg-primary/10 transition-colors"
                        >
                          Next <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}

                {stageProspects.length === 0 && (
                  <div className="text-center py-6 text-[10px] text-muted-foreground">
                    Drag prospects here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineView;
