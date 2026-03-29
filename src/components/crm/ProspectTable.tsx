import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe, Phone, MapPin, Star, ExternalLink, Zap, MessageSquare,
  ChevronDown, ChevronUp, Flame, Thermometer, Snowflake
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Prospect } from "@/hooks/useProspectSearch";

interface Props {
  prospects: Prospect[];
  isLoading: boolean;
}

const tempIcons: Record<string, any> = {
  hot: Flame,
  warm: Thermometer,
  cold: Snowflake,
};
const tempColors: Record<string, string> = {
  hot: "text-red-400 bg-red-400/10 border-red-400/30",
  warm: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  cold: "text-blue-400 bg-blue-400/10 border-blue-400/30",
};

const ProspectTable = ({ prospects, isLoading }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"lead_score" | "rating" | "review_count">("lead_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = [...prospects].sort((a, b) => {
    const aVal = a[sortBy] ?? 0;
    const bVal = b[sortBy] ?? 0;
    return sortDir === "desc" ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal);
  });

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
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

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_80px_80px_90px_80px] sm:grid-cols-[2fr_1fr_80px_80px_90px_80px] gap-2 px-4 py-2.5 bg-secondary/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Business</span>
        <span className="hidden sm:block">Location</span>
        <button onClick={() => toggleSort("rating")} className="flex items-center gap-0.5 hover:text-foreground">
          Rating {sortBy === "rating" && (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
        </button>
        <button onClick={() => toggleSort("review_count")} className="flex items-center gap-0.5 hover:text-foreground">
          Reviews {sortBy === "review_count" && (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
        </button>
        <button onClick={() => toggleSort("lead_score")} className="flex items-center gap-0.5 hover:text-foreground">
          Score {sortBy === "lead_score" && (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
        </button>
        <span>Actions</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {sorted.map((p, i) => {
          const TempIcon = tempIcons[p.lead_temperature] || Snowflake;
          const isExpanded = expandedId === p.place_id;

          return (
            <motion.div
              key={p.place_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              {/* Main Row */}
              <div
                className="grid grid-cols-[1fr_80px_80px_90px_80px] sm:grid-cols-[2fr_1fr_80px_80px_90px_80px] gap-2 px-4 py-3 items-center hover:bg-secondary/30 cursor-pointer transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : p.place_id)}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${tempColors[p.lead_temperature]}`}>
                      <TempIcon className="w-2.5 h-2.5" />
                      {p.lead_temperature.toUpperCase()}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground truncate">{p.business_name}</h3>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {p.phone && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{p.phone}</span>}
                    {p.has_website ? (
                      <span className="text-[10px] text-primary flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" />Website</span>
                    ) : (
                      <span className="text-[10px] text-red-400 flex items-center gap-0.5"><Globe className="w-2.5 h-2.5" />No Website</span>
                    )}
                  </div>
                </div>

                <span className="text-xs text-muted-foreground truncate hidden sm:block">
                  {p.city}{p.state ? `, ${p.state}` : ""}
                </span>

                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-medium text-foreground">{p.rating || "—"}</span>
                </div>

                <span className="text-xs text-muted-foreground">{p.review_count}</span>

                <div className="flex items-center gap-1">
                  <div
                    className="h-1.5 rounded-full bg-secondary flex-1 overflow-hidden"
                    style={{ maxWidth: 50 }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${p.lead_score}%`,
                        backgroundColor: p.lead_score >= 75 ? "hsl(0, 84%, 60%)" : p.lead_score >= 50 ? "hsl(38, 92%, 50%)" : "hsl(210, 80%, 60%)",
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground">{p.lead_score}</span>
                </div>

                <div className="flex items-center gap-1">
                  {p.website_url && (
                    <a
                      href={p.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                      title="Visit website"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {p.google_maps_url && (
                    <a
                      href={p.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                      title="View on Google Maps"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <Link
                    to={`/demo?url=${encodeURIComponent(p.website_url || "")}&name=${encodeURIComponent(p.business_name)}&niche=${encodeURIComponent(p.niche || "")}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                    title="Generate Demo"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 bg-secondary/20"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">Full Address</h4>
                      <p className="text-sm text-foreground">{p.formatted_address}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">Business Type</h4>
                      <p className="text-sm text-foreground">{p.primary_type || "N/A"}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(p.business_types || []).slice(0, 5).map((t: string) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">AI Opportunity Score</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Has Website</span>
                          <span className={p.has_website ? "text-primary" : "text-red-400"}>{p.has_website ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Has Chat Widget</span>
                          <span className={p.has_chat_widget ? "text-primary" : "text-red-400"}>{p.has_chat_widget ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Has Voice AI</span>
                          <span className={p.has_voice_ai ? "text-primary" : "text-red-400"}>{p.has_voice_ai ? "Yes" : "No"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Online Booking</span>
                          <span className={p.has_online_booking ? "text-primary" : "text-red-400"}>{p.has_online_booking ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/50">
                    <Link
                      to={`/demo?url=${encodeURIComponent(p.website_url || "")}&name=${encodeURIComponent(p.business_name)}&niche=${encodeURIComponent(p.niche || "")}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                    >
                      <Zap className="w-3 h-3" />
                      Generate Demo
                    </Link>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/30 text-accent-foreground text-xs font-medium hover:bg-accent/30 transition-colors">
                      <MessageSquare className="w-3 h-3" />
                      Send Outreach
                    </button>
                    {p.phone && (
                      <a
                        href={`tel:${p.phone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        Call
                      </a>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ProspectTable;
