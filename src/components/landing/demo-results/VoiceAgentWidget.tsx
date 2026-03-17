import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const RETELL_AGENT_ID = "agent_ea256ca8441689051b9aa2b183";
const DEFAULT_OWNER_NAME = "Ron Melo";

interface VoiceAgentWidgetProps {
  businessName: string;
  businessNiche: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  websiteUrl: string;
  businessInfo: string;
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
}: VoiceAgentWidgetProps) => {
  const { toast } = useToast();
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
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
    if (!callId || summaryQueuedRef.current || !ownerEmail) return;

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
        throw new Error(error?.message || data?.error || "We couldn't finish the call recap yet.");
      }

      const headline = data.appointmentRequested
        ? "Appointment confirmed"
        : data.transferRequested
          ? "Live handoff requested"
          : data.callbackRequested
            ? "Callback request captured"
            : "Call summary sent";

      const detailLine = data.appointmentScheduledFor
        ? `Confirmed for ${data.appointmentScheduledFor}.`
        : data.transferRequested
          ? `Aspen marked this for an immediate handoff to ${resolvedOwnerName}.`
          : data.callbackRequested
            ? `${resolvedOwnerName} now has the callback request details.`
            : null;

      const deliveryLine = data.emailWarning
        ? data.emailWarning
        : Array.isArray(data.emailDeliveredTo) && data.emailDeliveredTo.length > 0
          ? `Recap sent to ${data.emailDeliveredTo.join(", ")}.`
          : `Recap prepared for ${ownerEmail}.`;

      toast({
        title: headline,
        description: [detailLine, deliveryLine].filter(Boolean).join(" "),
      });
    } catch (err) {
      console.error("Failed to email call summary:", err);
      summaryQueuedRef.current = false;
      toast({
        title: "Call recap failed",
        description: err instanceof Error ? err.message : "We couldn't send the recap email yet.",
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
          // noop
        }
      }
    };
  }, [clearTimer]);

  const startCall = useCallback(async () => {
    setCallStatus("connecting");
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
          businessInfo: businessInfo?.substring(0, 3000) || "",
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
        console.log("Retell call started");
        setCallStatus("active");
        setDuration(0);
        setIsMuted(false);
        clearTimer();
        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      });

      retellClient.on("call_ended", () => {
        console.log("Retell call ended");
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
        toast({
          title: "Call error",
          description: "Something went wrong with the voice call.",
          variant: "destructive",
        });
      });

      await retellClient.startCall({
        accessToken: data.access_token,
        sampleRate: 24000,
        emitRawAudioSamples: false,
      });
    } catch (err) {
      console.error("Failed to start call:", err);
      toast({
        title: "Could not start call",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setCallStatus("idle");
      clearTimer();
    }
  }, [businessInfo, businessName, businessNiche, clearTimer, ownerEmail, ownerPhone, resolvedOwnerName, toast, websiteUrl]);

  const endCall = useCallback(() => {
    setCallStatus("ending");
    try {
      retellClientRef.current?.stopCall();
    } catch {
      // noop
    }

    window.setTimeout(() => {
      setCallStatus((current) => (current === "ending" ? "idle" : current));
    }, 1500);
  }, []);

  const toggleMute = useCallback(() => {
    if (retellClientRef.current) {
      const newMuted = !isMuted;
      retellClientRef.current.toggleMicrophone?.(!newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const helperCopy =
    callStatus === "active"
      ? `Ask about ${businessName || "the business"}, request a live handoff to ${resolvedOwnerName}, or confirm a 15-minute appointment.`
      : `Aspen can answer questions, offer a live handoff to ${resolvedOwnerName}, and confirm a 15-minute appointment.`;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
              <Mic className="h-4 w-4 text-primary" />
            </div>
            {callStatus === "active" && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Ask Aspen</p>
            <p className="text-[11px] text-muted-foreground">AI Voice Assistant</p>
          </div>
        </div>

        {callStatus === "active" && (
          <span className="text-xs font-mono text-primary">{formatDuration(duration)}</span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {callStatus === "idle" && (
          <motion.button
            key="start"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={startCall}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Phone className="h-4 w-4" />
            Talk to Aspen
          </motion.button>
        )}

        {callStatus === "connecting" && (
          <motion.div
            key="connecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/20 px-4 py-3 text-sm font-semibold text-primary"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting...
          </motion.div>
        )}

        {(callStatus === "active" || callStatus === "ending") && (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex gap-2"
          >
            <button
              onClick={toggleMute}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                isMuted
                  ? "bg-destructive/20 text-destructive"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
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
          </motion.div>
        )}
      </AnimatePresence>

      <motion.p
        key={callStatus}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-2 text-center text-[11px] text-muted-foreground"
      >
        {helperCopy}
      </motion.p>
    </div>
  );
};

export default VoiceAgentWidget;
