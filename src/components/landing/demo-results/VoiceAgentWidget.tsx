import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const RETELL_AGENT_ID = "agent_ea256ca8441689051b9aa2b183";

interface VoiceAgentWidgetProps {
  businessName: string;
  businessNiche: string;
  ownerName: string;
  ownerPhone?: string;
  websiteUrl: string;
  businessInfo: string;
}

type CallStatus = "idle" | "connecting" | "active" | "ending";

const VoiceAgentWidget = ({
  businessName,
  businessNiche,
  ownerName,
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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (retellClientRef.current) {
        try { retellClientRef.current.stopCall(); } catch {}
      }
    };
  }, []);

  const startCall = useCallback(async () => {
    setCallStatus("connecting");

    try {
      // Get web call access token from our edge function
      const { data, error } = await supabase.functions.invoke("retell-web-call", {
        body: {
          agentId: RETELL_AGENT_ID,
          businessName,
          businessNiche,
          ownerName,
          websiteUrl,
          businessInfo: businessInfo?.substring(0, 3000) || "",
        },
      });

      if (error || !data?.access_token) {
        throw new Error(error?.message || data?.error || "Failed to create web call");
      }

      // Dynamically import Retell SDK
      const { RetellWebClient } = await import("retell-client-js-sdk");

      const retellClient = new RetellWebClient();
      retellClientRef.current = retellClient;

      retellClient.on("call_started", () => {
        console.log("Retell call started");
        setCallStatus("active");
        setDuration(0);
        timerRef.current = setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      });

      retellClient.on("call_ended", () => {
        console.log("Retell call ended");
        setCallStatus("idle");
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      });

      retellClient.on("error", (err: any) => {
        console.error("Retell error:", err);
        toast({
          title: "Call error",
          description: "Something went wrong with the voice call.",
          variant: "destructive",
        });
        setCallStatus("idle");
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
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
    }
  }, [businessName, businessNiche, ownerName, websiteUrl, businessInfo, toast]);

  const endCall = useCallback(() => {
    setCallStatus("ending");
    try {
      retellClientRef.current?.stopCall();
    } catch {}
    setTimeout(() => setCallStatus("idle"), 500);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Mic className="h-4 w-4 text-primary" />
            </div>
            {callStatus === "active" && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card" />
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
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 px-4 text-sm font-semibold hover:bg-primary/90 transition-colors"
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
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary/20 text-primary py-3 px-4 text-sm font-semibold"
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
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-colors ${
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
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive text-destructive-foreground py-3 px-4 text-sm font-semibold hover:bg-destructive/90 transition-colors"
            >
              <PhoneOff className="h-4 w-4" />
              End
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {callStatus === "active" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[11px] text-center text-muted-foreground mt-2"
        >
          Aspen is listening... ask about {businessName || "the business"}
        </motion.p>
      )}
    </div>
  );
};

export default VoiceAgentWidget;
