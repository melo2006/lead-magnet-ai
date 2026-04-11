import { useState, useCallback, useRef, useEffect } from "react";
import { X, Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import cartoonAvatar from "@/assets/sample_cartoon_avatar.jpg";

type WidgetState = "collapsed" | "expanded";
type CallStatus = "idle" | "connecting" | "active" | "ending";

const TalkingAvatarWidget = () => {
  const [widgetState, setWidgetState] = useState<WidgetState>("collapsed");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(0);

  const retellClientRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mouthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mouth animation driven by speaking state
  useEffect(() => {
    if (isAgentSpeaking) {
      mouthIntervalRef.current = setInterval(() => {
        setMouthOpen(Math.random() * 0.8 + 0.2);
      }, 100);
    } else {
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
      mouthIntervalRef.current = null;
      setMouthOpen(0);
    }
    return () => {
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
    };
  }, [isAgentSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
      try {
        retellClientRef.current?.stopCall();
      } catch { /* noop */ }
    };
  }, []);

  const startCall = useCallback(async () => {
    setCallStatus("connecting");

    try {
      const { data, error } = await supabase.functions.invoke("avatar-spokesperson-call");

      if (error || !data?.access_token) {
        throw new Error(error?.message || data?.error || "Failed to start voice call");
      }

      const { RetellWebClient } = await import("retell-client-js-sdk");
      const retellClient = new RetellWebClient();
      retellClientRef.current = retellClient;

      retellClient.on("call_started", () => {
        setCallStatus("active");
        setDuration(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
      });

      retellClient.on("call_ended", () => {
        setCallStatus("idle");
        setIsAgentSpeaking(false);
        setIsMuted(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      });

      retellClient.on("agent_start_talking", () => {
        setIsAgentSpeaking(true);
      });

      retellClient.on("agent_stop_talking", () => {
        setIsAgentSpeaking(false);
      });

      retellClient.on("error", (error: unknown) => {
        console.error("Retell error:", error);
        setCallStatus("idle");
        setIsAgentSpeaking(false);
      });

      await retellClient.startCall({
        accessToken: data.access_token,
        sampleRate: 24000,
        emitRawAudioSamples: false,
      });
    } catch (err) {
      console.error("Failed to start spokesperson call:", err);
      setCallStatus("idle");
    }
  }, []);

  const endCall = useCallback(() => {
    try {
      retellClientRef.current?.stopCall();
    } catch { /* noop */ }
    setCallStatus("idle");
    setIsAgentSpeaking(false);
    setIsMuted(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    try {
      if (isMuted) {
        retellClientRef.current?.unmute();
      } else {
        retellClientRef.current?.mute();
      }
      setIsMuted((prev) => !prev);
    } catch {
      // SDK may not support mute/unmute
    }
  }, [isMuted]);

  const handleExpand = () => {
    setWidgetState("expanded");
  };

  const handleClose = () => {
    endCall();
    setWidgetState("collapsed");
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Collapsed state — floating avatar button
  if (widgetState === "collapsed") {
    return (
      <button
        onClick={handleExpand}
        className="fixed bottom-24 left-4 z-50 group"
        aria-label="Talk to Aspen - AI Assistant"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
            <img
              src={cartoonAvatar}
              alt="Aspen AI Assistant"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md">
            Talk to Aspen 🎙️
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[340px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30">
            <img src={cartoonAvatar} alt="Aspen" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-primary-foreground text-sm font-bold">Aspen</h3>
            <p className="text-primary-foreground/70 text-[10px]">
              {callStatus === "active"
                ? `Live • ${formatDuration(duration)}`
                : callStatus === "connecting"
                  ? "Connecting..."
                  : "AI Spokesperson"}
            </p>
          </div>
        </div>
        <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
          <X className="h-3.5 w-3.5 text-primary-foreground" />
        </button>
      </div>

      {/* Avatar Display */}
      <div className="relative bg-gradient-to-b from-muted/50 to-muted flex items-center justify-center py-6">
        <div className="relative w-32 h-32">
          {/* Avatar with speaking glow */}
          <div
            className={`w-full h-full rounded-full overflow-hidden border-3 transition-all duration-200 ${
              isAgentSpeaking
                ? "border-primary shadow-[0_0_25px_rgba(var(--primary),0.5)] scale-105"
                : "border-border"
            }`}
          >
            <img
              src={cartoonAvatar}
              alt="Aspen AI"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Mouth animation overlay */}
          {isAgentSpeaking && (
            <div
              className="absolute bottom-[22%] left-1/2 -translate-x-1/2 bg-[#c4736e] rounded-full transition-all duration-75"
              style={{
                width: `${18 + mouthOpen * 14}px`,
                height: `${4 + mouthOpen * 12}px`,
                opacity: 0.85,
              }}
            />
          )}

          {/* Audio waveform indicator */}
          {isAgentSpeaking && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-[2px]">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-[3px] bg-primary rounded-full"
                  style={{
                    height: `${4 + Math.random() * 12}px`,
                    animation: `pulse 0.4s ease-in-out ${i * 80}ms infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Mic active ring */}
          {callStatus === "active" && !isMuted && (
            <div className="absolute inset-0 rounded-full border-2 border-green-400/40 animate-pulse" />
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="px-4 py-3">
        {callStatus === "idle" && (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Hi! I'm <span className="font-bold text-foreground">Aspen</span>. Tap below to hear how AI Hidden Leads can transform your business — and feel free to jump in anytime!
            </p>
            <button
              onClick={startCall}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 mx-auto transition-colors"
            >
              <Phone className="h-4 w-4" /> Start Conversation
            </button>
          </div>
        )}

        {callStatus === "connecting" && (
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Connecting to Aspen...
            </div>
          </div>
        )}

        {callStatus === "active" && (
          <div className="space-y-3">
            <p className="text-xs text-center text-muted-foreground">
              {isAgentSpeaking ? "🗣️ Aspen is speaking — interrupt anytime!" : "🎙️ Listening... ask anything!"}
            </p>

            {/* Call controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={toggleMute}
                className={`p-2.5 rounded-full transition-colors ${
                  isMuted
                    ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
                    : "bg-muted hover:bg-muted-foreground/10 text-foreground"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                onClick={endCall}
                className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                title="End call"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CTA Footer */}
      <div className="p-2 border-t border-border bg-gradient-to-r from-emerald-500/10 to-primary/10">
        <a
          href="https://aihiddenleads.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1"
        >
          <ExternalLink className="h-3 w-3" />
          🚀 See Our Promo — Visit aihiddenleads.com
        </a>
      </div>
    </div>
  );
};

export default TalkingAvatarWidget;
