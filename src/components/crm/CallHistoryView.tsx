import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Phone, PhoneForwarded, Clock, User, Mail, Globe, ChevronDown, ChevronUp, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface CallRecord {
  id: string;
  retell_call_id: string;
  business_name: string;
  website_url: string | null;
  owner_name: string | null;
  owner_email: string | null;
  caller_name: string | null;
  caller_email: string | null;
  caller_phone: string | null;
  call_status: string;
  transfer_requested: boolean;
  transfer_status: string;
  transfer_target_phone: string | null;
  transfer_error: string | null;
  summary: string | null;
  transcript: string | null;
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

const statusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-500/20 text-green-400";
    case "joined": return "bg-green-500/20 text-green-400";
    case "failed": return "bg-destructive/20 text-destructive";
    case "dialing_caller": case "dialing_owner": case "awaiting_owner": return "bg-amber-500/20 text-amber-400";
    default: return "bg-muted text-muted-foreground";
  }
};

const formatDuration = (s: number | null) => {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const CallRow = ({ call }: { call: CallRecord }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const handleRedemo = (e: React.MouseEvent) => {
    e.stopPropagation();
    const params = new URLSearchParams();
    if (call.website_url) params.set("url", call.website_url);
    params.set("name", call.business_name);
    navigate(`/demo?${params.toString()}`);
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
          {call.transfer_requested ? (
            <PhoneForwarded className="h-4 w-4 text-primary" />
          ) : (
            <Phone className="h-4 w-4 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{call.business_name}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {call.caller_name || "Unknown caller"}
            {call.caller_phone ? ` · ${call.caller_phone}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {call.transfer_requested && (
            <Badge variant="outline" className={`text-[10px] ${statusColor(call.transfer_status)}`}>
              {call.transfer_status.replace(/_/g, " ")}
            </Badge>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(call.duration_seconds)}
          </div>
          <span className="text-[11px] text-muted-foreground">{formatDate(call.created_at)}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* Summary */}
          {call.summary && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Summary</p>
              <p className="text-sm text-foreground">{call.summary}</p>
            </div>
          )}

          {/* Contact details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Caller</p>
              <div className="space-y-0.5 text-xs">
                {call.caller_name && <p className="flex items-center gap-1"><User className="h-3 w-3" />{call.caller_name}</p>}
                {call.caller_phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{call.caller_phone}</p>}
                {call.caller_email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{call.caller_email}</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Business Owner</p>
              <div className="space-y-0.5 text-xs">
                {call.owner_name && <p className="flex items-center gap-1"><User className="h-3 w-3" />{call.owner_name}</p>}
                {call.owner_email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{call.owner_email}</p>}
                {call.website_url && <p className="flex items-center gap-1"><Globe className="h-3 w-3" /><a href={call.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{call.website_url}</a></p>}
              </div>
            </div>
          </div>

          {/* Transfer details */}
          {call.transfer_requested && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Transfer Details</p>
              <div className="text-xs space-y-0.5">
                <p>Status: <span className="font-medium">{call.transfer_status.replace(/_/g, " ")}</span></p>
                {call.transfer_target_phone && <p>Target: {call.transfer_target_phone}</p>}
                {call.transfer_error && <p className="text-destructive">Error: {call.transfer_error}</p>}
              </div>
            </div>
          )}

          {/* Transcript */}
          {call.transcript && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Transcript</p>
              <div className="bg-muted/30 rounded-lg p-3 max-h-60 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-sans text-foreground/80">{call.transcript}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CallHistoryView = () => {
  const { data: calls, isLoading } = useQuery({
    queryKey: ["call-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as CallRecord[];
    },
  });

  const totalCalls = calls?.length || 0;
  const transferCalls = calls?.filter(c => c.transfer_requested).length || 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Call History</h2>
        <p className="text-xs text-muted-foreground">
          {totalCalls} call{totalCalls !== 1 ? "s" : ""} · {transferCalls} transfer{transferCalls !== 1 ? "s" : ""} attempted
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading calls...</div>
      ) : !calls?.length ? (
        <div className="text-sm text-muted-foreground py-8 text-center">No calls recorded yet.</div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <CallRow key={call.id} call={call} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CallHistoryView;
