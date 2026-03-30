import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Phone, PhoneOff, Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const RETELL_AGENT_ID = "agent_ea256ca8441689051b9aa2b183";
const DEFAULT_OWNER_NAME = "Business Owner";

interface VoiceAgentWidgetProps {
  businessName: string;
  businessNiche: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  websiteUrl: string;
  businessInfo: string;
  callerName?: string;
  callerEmail?: string;
  onClose?: () => void;
}

type CallStatus = "idle" | "connecting" | "active" | "ending";

const VoiceAgentWidget = ({
  businessName,
  businessNiche,
  ownerName,
  ownerEmail,
  ownerPhone,
  websiteUrl,
  businessInfo,
  callerName,
  callerEmail,
  onClose,
}: VoiceAgentWidgetProps) => {
  const { toast } = useToast();
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [duration, setDuration] = useState(0);
  const retellClientRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callIdRef = useRef<string | null>(null);
  const summaryQueuedRef = useRef(false);
  const resolvedOwnerName = ownerName || DEFAULT_OWNER_NAME;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const queueCallSummary = useCallback(async () => {
    const callId = callIdRef.current;
    if (!callId || summaryQueuedRef.current) return;

    summaryQueuedRef.current = true;

    try {
      const { data, error } = await supabase.functions.invoke("retell-web-call", {
        body: {
          action: "email-call-summary",
          callId,
          businessName,
          ownerName: resolvedOwnerName,
          ownerEmail,
          ownerPhone: ownerPhone || "",
          websiteUrl,
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Couldn't finish the call recap.");
      }

      const appointmentBooked = Boolean(data.calendarEventId);

      const headline = data.appointmentRequested
        ? appointmentBooked
          ? "Appointment confirmed"
          : "Appointment requested"
        : data.transferRequested
          ? "Live handoff requested"
          : data.callbackRequested
            ? "Callback request captured"
            : "Call summary sent";

      const detailLine = data.appointmentRequested
        ? appointmentBooked && data.appointmentScheduledFor
          ? `Confirmed for ${data.appointmentScheduledFor}.`
          : `Aspen captured appointment intent and flagged it for ${resolvedOwnerName}.`
        : data.transferRequested
          ? `Aspen marked this for an immediate follow-up with ${resolvedOwnerName}.`
          : data.callbackRequested
            ? `${resolvedOwnerName} now has the callback request details.`
            : null;

      const calendarLine = data.calendarWarning
        ? data.calendarWarning
        : data.appointmentRequested && !appointmentBooked
          ? "Calendar booking could not be completed automatically."
          : null;

      const deliveryLine = data.emailWarning
        ? data.emailWarning
        : Array.isArray(data.emailDeliveredTo) && data.emailDeliveredTo.length > 0
          ? `Recap sent to ${data.emailDeliveredTo.join(", ")}.`
          : `Recap prepared for ${ownerEmail}.`;

      toast({
        title: headline,
        description: [detailLine, calendarLine, deliveryLine].filter(Boolean).join(" "),
      });
    } catch (err) {
      console.error("Failed to email call summary:", err);
      summaryQueuedRef.current = false;
      toast({
        title: "Call recap failed",
        description: err instanceof Error ? err.message : "Couldn't send the recap email.",
        variant: "destructive",
      });
    }
  }, [businessName, ownerEmail, ownerPhone, resolvedOwnerName, toast, websiteUrl]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (retellClientRef.current) {
        try {
          retellClientRef.current.stopCall();
        } catch {
          /* noop */
        }
      }
    };
  }, [clearTimer]);

  const startCall = useCallback(async () => {
    setCallStatus("connecting");
    setIsMinimized(false);
    callIdRef.current = null;
    summaryQueuedRef.current = false;

    try {
      const { data, error } = await supabase.functions.invoke("retell-web-call", {
        body: {
          agentId: RETELL_AGENT_ID,
          businessName,
          businessNiche,
          ownerName: resolvedOwnerName,
          ownerEmail: ownerEmail || "",
          ownerPhone: ownerPhone || "",
          websiteUrl,
          businessInfo: businessInfo?.substring(0, 6000) || "",
          callerName: callerName || "",
          callerEmail: callerEmail || "",
        },
      });

      if (error || !data?.access_token) {
        throw new Error(error?.message || data?.error || "Failed to create web call");
      }

      callIdRef.current = data.call_id;
      const { RetellWebClient } = await import("retell-client-js-sdk");
      const retellClient = new RetellWebClient();
      retellClientRef.current = retellClient;

      retellClient.on("call_started", () => {
        setCallStatus("active");
        setDuration(0);
        setIsMuted(false);
        clearTimer();
        timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
      });

      retellClient.on("call_ended", () => {
        setCallStatus("idle");
        setIsMuted(false);
        clearTimer();
        void queueCallSummary();
      });

      retellClient.on("error", (err: any) => {
        console.error("Retell error:", err);
        clearTimer();
        setIsMuted(false);
        setCallStatus("idle");
        toast({ title: "Call error", description: "Something went wrong.", variant: "destructive" });
      });

      await retellClient.startCall({ accessToken: data.access_token, sampleRate: 24000, emitRawAudioSamples: false });
    } catch (err) {
      console.error("Failed to start call:", err);
      toast({ title: "Could not start call", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
      setCallStatus("idle");
      clearTimer();
    }
  }, [businessInfo, businessName, businessNiche, callerName, callerEmail, clearTimer, ownerEmail, ownerPhone, resolvedOwnerName, toast, websiteUrl, queueCallSummary]);

  const endCall = useCallback(() => {
    setCallStatus("ending");
    try {
      retellClientRef.current?.stopCall();
    } catch {
      /* noop */
    }
    window.setTimeout(() => setCallStatus((c) => (c === "ending" ? "idle" : c)), 1500);
  }, []);

  const toggleMute = useCallback(() => {
    if (retellClientRef.current) {
      const newMuted = !isMuted;
      retellClientRef.current.toggleMicrophone?.(!newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const callIsLive = callStatus === "active" || callStatus === "ending";

  return (
    <div className="rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-primary/20">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <Mic className="h-4 w-4 text-primary" />
            </div>
            {callStatus === "active" && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold">Talk to Aspen</p>
            <p className="text-[10px] text-muted-foreground">AI Voice Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {callStatus === "active" && (
            <span className="text-xs font-mono text-primary">{formatDuration(duration)}</span>
          )}
          <button
            onClick={() => setIsMinimized((prev) => !prev)}
            className="rounded-md bg-foreground/10 p-1 text-foreground transition-colors hover:bg-foreground/20"
            aria-label={isMinimized ? "Expand voice widget" : "Minimize voice widget"}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          {onClose && callStatus === "idle" && (
            <button
              onClick={onClose}
              className="rounded-md bg-foreground/10 p-1 text-foreground transition-colors hover:bg-foreground/20"
              aria-label="Close voice widget"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isMinimized ? (
        <div className="flex items-center gap-2 p-3">
          <p className="text-xs text-muted-foreground">
            {callIsLive ? "Call in progress" : "Ready to start"}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {callIsLive && (
              <>
                <button
                  onClick={toggleMute}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isMuted ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {isMuted ? "Unmute" : "Mute"}
                </button>
                <button
                  onClick={endCall}
                  className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
                >
                  End
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4">
        <p className="text-xs text-muted-foreground mb-3">
          {callStatus === "active"
            ? `Ask about ${businessName}, request a callback from ${resolvedOwnerName}, or book a 15-minute appointment.`
            : `This is a live demo of AI voice for ${businessName}. Aspen can answer questions, capture handoff requests, and schedule appointments.`}
        </p>

        {callStatus === "idle" && (
          <button
            onClick={startCall}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Phone className="h-4 w-4" />
            Start Voice Call
          </button>
        )}

        {callStatus === "connecting" && (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/20 px-4 py-3 text-sm font-semibold text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </div>
        )}

        {(callStatus === "active" || callStatus === "ending") && (
          <div className="flex gap-2">
            <button
              onClick={toggleMute}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                isMuted ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={endCall}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
            >
              <PhoneOff className="h-4 w-4" />
              End
            </button>
          </div>
        )}
        </div>
      )}
    </div>
  );
};

export default VoiceAgentWidget;
