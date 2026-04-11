import { useState, useCallback, useRef, useEffect } from "react";
import { X, Mic, MicOff, Phone, PhoneOff, ExternalLink } from "lucide-react";
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
  const [headTilt, setHeadTilt] = useState({ x: 0, y: 0 });
  const [eyeBlink, setEyeBlink] = useState(false);
  const [headNod, setHeadNod] = useState(0);

  const retellClientRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mouthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const headIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Smooth mouth animation driven by speaking state
  useEffect(() => {
    if (isAgentSpeaking) {
      let frame = 0;
      mouthIntervalRef.current = setInterval(() => {
        // More natural mouth shapes — sinusoidal with random variation
        const base = Math.sin(frame * 0.3) * 0.4 + 0.4;
        const variation = (Math.random() - 0.5) * 0.3;
        setMouthOpen(Math.max(0.1, Math.min(1, base + variation)));
        frame++;
      }, 80);
    } else {
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
      mouthIntervalRef.current = null;
      setMouthOpen(0);
    }
    return () => {
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
    };
  }, [isAgentSpeaking]);

  // Head movement — subtle tilts and nods when speaking
  useEffect(() => {
    if (callStatus === "active") {
      headIntervalRef.current = setInterval(() => {
        if (isAgentSpeaking) {
          // More animated head movement while speaking
          setHeadTilt({
            x: (Math.random() - 0.5) * 6,
            y: (Math.random() - 0.5) * 4,
          });
          setHeadNod(Math.sin(Date.now() * 0.003) * 2);
        } else {
          // Gentle idle movement while listening
          setHeadTilt({
            x: Math.sin(Date.now() * 0.001) * 2,
            y: Math.cos(Date.now() * 0.0008) * 1.5,
          });
          setHeadNod(0);
        }
      }, 150);
    } else {
      if (headIntervalRef.current) clearInterval(headIntervalRef.current);
      setHeadTilt({ x: 0, y: 0 });
      setHeadNod(0);
    }
    return () => {
      if (headIntervalRef.current) clearInterval(headIntervalRef.current);
    };
  }, [callStatus, isAgentSpeaking]);

  // Natural eye blinking
  useEffect(() => {
    if (callStatus === "active") {
      const scheduleNextBlink = () => {
        const delay = 2000 + Math.random() * 4000; // Blink every 2-6 seconds
        blinkIntervalRef.current = setTimeout(() => {
          setEyeBlink(true);
          setTimeout(() => setEyeBlink(false), 150);
          scheduleNextBlink();
        }, delay) as unknown as ReturnType<typeof setInterval>;
      };
      scheduleNextBlink();
    } else {
      if (blinkIntervalRef.current) clearTimeout(blinkIntervalRef.current as unknown as number);
      setEyeBlink(false);
    }
    return () => {
      if (blinkIntervalRef.current) clearTimeout(blinkIntervalRef.current as unknown as number);
    };
  }, [callStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
      if (headIntervalRef.current) clearInterval(headIntervalRef.current);
      if (blinkIntervalRef.current) clearTimeout(blinkIntervalRef.current as unknown as number);
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

  // Collapsed state — floating avatar button with idle animation
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
              className="w-full h-full object-cover animate-[float_3s_ease-in-out_infinite]"
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
                  : "AI Spokesperson • AI Hidden Leads"}
            </p>
          </div>
        </div>
        <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
          <X className="h-3.5 w-3.5 text-primary-foreground" />
        </button>
      </div>

      {/* Avatar Display with head movement */}
      <div className="relative bg-gradient-to-b from-muted/50 to-muted flex items-center justify-center py-6 overflow-hidden">
        <div
          className="relative w-32 h-32 transition-transform duration-150 ease-out"
          style={{
            transform: `rotate(${headTilt.x}deg) translateY(${headNod}px) translateX(${headTilt.y}px)`,
          }}
        >
          {/* Speaking glow ring */}
          {isAgentSpeaking && (
            <div className="absolute -inset-2 rounded-full bg-primary/20 animate-pulse" />
          )}

          {/* Avatar */}
          <div
            className={`w-full h-full rounded-full overflow-hidden border-3 transition-all duration-200 ${
              isAgentSpeaking
                ? "border-primary shadow-[0_0_30px_rgba(var(--primary),0.4)] scale-105"
                : callStatus === "active"
                  ? "border-green-400/60 shadow-[0_0_15px_rgba(74,222,128,0.2)]"
                  : "border-border"
            }`}
          >
            <img
              src={cartoonAvatar}
              alt="Aspen AI"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Eye blink overlay */}
          {eyeBlink && (
            <div className="absolute top-[30%] left-[25%] right-[25%] flex justify-between pointer-events-none">
              <div className="w-[18px] h-[3px] bg-[#8B6D5C] rounded-full" />
              <div className="w-[18px] h-[3px] bg-[#8B6D5C] rounded-full" />
            </div>
          )}

          {/* Mouth animation overlay — more natural shape */}
          {isAgentSpeaking && (
            <div
              className="absolute bottom-[22%] left-1/2 -translate-x-1/2 rounded-[50%] transition-all duration-75 pointer-events-none"
              style={{
                width: `${16 + mouthOpen * 16}px`,
                height: `${3 + mouthOpen * 14}px`,
                backgroundColor: mouthOpen > 0.5 ? '#b85c57' : '#c4736e',
                opacity: 0.9,
                boxShadow: mouthOpen > 0.6 ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'none',
              }}
            />
          )}

          {/* Audio waveform indicator */}
          {isAgentSpeaking && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-[2px]">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="w-[2.5px] bg-primary rounded-full"
                  style={{
                    height: `${3 + Math.random() * 14}px`,
                    animation: `pulse 0.3s ease-in-out ${i * 60}ms infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Mic listening indicator */}
          {callStatus === "active" && !isMuted && !isAgentSpeaking && (
            <div className="absolute inset-0 rounded-full border-2 border-green-400/40 animate-pulse" />
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="px-4 py-3">
        {callStatus === "idle" && (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Hey! I'm <span className="font-bold text-foreground">Aspen</span> from <span className="font-bold text-primary">AI Hidden Leads</span>. Tap below and I'll show you how we help businesses like yours make more money! 🚀
            </p>
            <button
              onClick={startCall}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold flex items-center gap-2 mx-auto transition-all hover:scale-105 active:scale-95"
            >
              <Phone className="h-4 w-4" /> Talk to Aspen
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
              {isAgentSpeaking ? "🗣️ Aspen is speaking — jump in anytime!" : "🎙️ Listening... ask me anything!"}
            </p>

            {/* Call controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={toggleMute}
                className={`p-2.5 rounded-full transition-all ${
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
                className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all hover:scale-110 active:scale-95"
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
          href="#lead-capture"
          className="flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1"
        >
          <ExternalLink className="h-3 w-3" />
          🚀 Try Our Free Demo — Scroll Down!
        </a>
      </div>
    </div>
  );
};

export default TalkingAvatarWidget;
