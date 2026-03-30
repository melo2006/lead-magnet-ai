import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink, ChevronDown, ChevronUp, Flame, Thermometer, Snowflake,
  MessageSquare, UserPlus, Mail, User, Clock, Globe, Tag
} from "lucide-react";
import { IntentLead } from "./types";
import { formatDistanceToNow } from "date-fns";

function TemperatureBadge({ temp }: { temp: string }) {
  if (temp === "hot") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><Flame className="w-3 h-3 mr-1" />Hot</Badge>;
  if (temp === "warm") return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><Thermometer className="w-3 h-3 mr-1" />Warm</Badge>;
  return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Snowflake className="w-3 h-3 mr-1" />Cold</Badge>;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-red-500" : score >= 50 ? "bg-orange-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold">{score}/100</span>
    </div>
  );
}

function getPlatformIcon(platform: string) {
  const map: Record<string, string> = {
    reddit: "🟠", google_reviews: "⭐", yelp: "🔴",
    facebook: "🔵", nextdoor: "🟢", forums: "🌐",
  };
  return map[platform] || "🌐";
}

export default function IntentLeadCard({ lead, index }: { lead: IntentLead; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const services = lead.ai_recommended_services
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) || [];

  const postPreview = lead.post_content
    ? lead.post_content.substring(0, 200) + (lead.post_content.length > 200 ? "..." : "")
    : lead.ai_summary;

  const timeAgo = lead.created_at
    ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })
    : null;

  return (
    <Card className={`border-l-4 ${
      lead.lead_temperature === "hot" ? "border-l-red-500" :
      lead.lead_temperature === "warm" ? "border-l-orange-500" : "border-l-blue-500"
    }`}>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
              <TemperatureBadge temp={lead.lead_temperature} />
              <Badge variant="outline" className="text-[10px]">
                {getPlatformIcon(lead.source_platform)} {lead.source_platform.replace("_", " ")}
              </Badge>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {lead.intent_category?.replace("_", " ")}
              </Badge>
              {timeAgo && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> Found {timeAgo}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold truncate">
              {lead.post_title || "Untitled Post"}
            </h3>
          </div>
          <ScoreBar score={lead.intent_score} />
        </div>

        {/* Author info */}
        {lead.author_name && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span>Posted by <strong className="text-foreground">{lead.author_name}</strong></span>
            {lead.author_profile_url && (
              <a href={lead.author_profile_url} target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline">(view profile)</a>
            )}
          </div>
        )}

        {/* AI Summary */}
        <div className="bg-muted/50 rounded-md p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">💡 AI Summary</p>
          <p className="text-sm">{lead.ai_summary}</p>
        </div>

        {/* Post preview (always visible) */}
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1 flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Post Preview
          </p>
          <p className="whitespace-pre-wrap leading-relaxed">{postPreview}</p>
        </div>

        {/* Recommended services */}
        {services.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Services to Pitch
            </p>
            <div className="flex flex-wrap gap-1.5">
              {services.map((s, i) => (
                <Badge key={i} className="bg-primary/10 text-primary border-primary/20 text-[11px]">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <Button size="sm" variant="outline" asChild>
            <a href={lead.source_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3 mr-1" />Reply on Source
            </a>
          </Button>
          <Button size="sm" variant="outline" disabled>
            <UserPlus className="w-3 h-3 mr-1" />Add to CRM
          </Button>
          <Button size="sm" variant="outline" disabled>
            <Mail className="w-3 h-3 mr-1" />Draft Outreach
          </Button>
          <Button
            size="sm" variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="ml-auto"
          >
            {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {expanded ? "Less" : "Full Post"}
          </Button>
        </div>

        {/* Expanded: full post content */}
        {expanded && lead.post_content && (
          <div className="border-t pt-3 mt-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">📄 Full Original Post</p>
            <div className="bg-muted/30 rounded-md p-3 max-h-64 overflow-y-auto">
              <p className="text-xs whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {lead.post_content}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
              <Globe className="w-3 h-3" />
              <a href={lead.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                {lead.source_url}
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
