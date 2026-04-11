import { useState, useCallback, useRef, useEffect } from "react";
import { X, Mic, MicOff, Phone, PhoneOff, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import realisticAvatar from "@/assets/sample_realistic_avatar.jpg";

type WidgetState = "collapsed" | "expanded";
type CallStatus = "idle" | "connecting" | "active" | "ending";

const AVATAR_MODEL_URL = "/aspen-brunette.glb";
const LIPSYNC_KEYS = [
  "viseme_aa",
  "viseme_E",
  "viseme_I",
  "viseme_O",
  "viseme_U",
  "viseme_PP",
  "mouthOpen",
  "jawOpen",
  "headRotateX",
  "headRotateY",
  "bodyRotateX",
  "bodyRotateY",
] as const;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const averageRange = (values: Uint8Array, start: number, end: number) => {
  const safeEnd = Math.min(values.length, end);
  const safeStart = Math.min(start, safeEnd);
  const sliceLength = safeEnd - safeStart;

  if (sliceLength <= 0) return 0;

  let total = 0;
  for (let index = safeStart; index < safeEnd; index += 1) {
    total += values[index];
  }

  return total / sliceLength;
};

const setMorphRealtime = (head: any, morphName: string, value: number | null) => {
  const morph = head?.mtAvatar?.[morphName];
  if (!morph) return;
  morph.realtime = value;
  morph.needsUpdate = true;
};

const TalkingAvatarWidget = () => {
  const [widgetState, setWidgetState] = useState<WidgetState>("collapsed");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [avatarState, setAvatarState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const retellClientRef = useRef<any>(null);
  const talkingHeadRef = useRef<any>(null);
  const avatarContainerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const avatarAnimationFrameRef = useRef<number | null>(null);
  const motionTickRef = useRef(0);

  const resetAvatarMotion = useCallback(() => {
    const head = talkingHeadRef.current;
    if (!head) return;

    LIPSYNC_KEYS.forEach((morphName) => setMorphRealtime(head, morphName, null));
  }, []);

  const cleanupAvatar = useCallback(() => {
    resetAvatarMotion();

    if (avatarAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(avatarAnimationFrameRef.current);
      avatarAnimationFrameRef.current = null;
    }

    try {
      talkingHeadRef.current?.stop?.();
    } catch {
      // noop
    }

    talkingHeadRef.current = null;

    if (avatarContainerRef.current) {
      avatarContainerRef.current.replaceChildren();
    }

    setAvatarState("idle");
  }, [resetAvatarMotion]);

  useEffect(() => {
    if (widgetState !== "expanded" || !avatarContainerRef.current || talkingHeadRef.current) {
      return;
    }

    let cancelled = false;

    const initializeAvatar = async () => {
      try {
        setAvatarState("loading");
        const { TalkingHead } = await import("@met4citizen/talkinghead");

        if (cancelled || !avatarContainerRef.current) return;

        avatarContainerRef.current.replaceChildren();

        const head = new TalkingHead(avatarContainerRef.current, {
          cameraView: "head",
          cameraRotateEnable: false,
          cameraPanEnable: false,
          cameraZoomEnable: false,
          modelPixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
          modelFPS: 48,
          lightAmbientIntensity: 2.6,
          lightDirectIntensity: 10,
          lightDirectPhi: 0.85,
          lightDirectTheta: 2.2,
          lipsyncModules: ["en"],
          avatarIdleEyeContact: 0.8,
          avatarIdleHeadMove: 0.18,
          avatarSpeakingEyeContact: 1,
          avatarSpeakingHeadMove: 0.95,
        });

        await head.showAvatar({
          url: AVATAR_MODEL_URL,
          body: "F",
          lipsyncLang: "en",
          avatarMood: "neutral",
          avatarIdleEyeContact: 0.8,
          avatarIdleHeadMove: 0.18,
          avatarSpeakingEyeContact: 1,
          avatarSpeakingHeadMove: 0.95,
        });

        head.setView?.("head", {
          cameraDistance: 0.2,
          cameraY: 0.02,
          cameraRotateX: 0.02,
        });
        head.lookAtCamera?.(300000);
        head.makeEyeContact?.(300000);
        head.start?.();

        if (cancelled) {
          head.stop?.();
          return;
        }

        talkingHeadRef.current = head;
        setAvatarState("ready");
      } catch (error) {
        console.error("Failed to initialize TalkingHead avatar:", error);
        if (!cancelled) {
          setAvatarState("error");
        }
      }
    };

    void initializeAvatar();

    return () => {
      cancelled = true;
    };
  }, [widgetState]);

  useEffect(() => {
    if (callStatus !== "active") {
      resetAvatarMotion();
      if (avatarAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(avatarAnimationFrameRef.current);
        avatarAnimationFrameRef.current = null;
      }
      return;
    }

    const animateAvatar = () => {
      const head = talkingHeadRef.current;
      const analyser = retellClientRef.current?.analyzerComponent?.analyser as AnalyserNode | undefined;

      if (head?.lookAtCamera) {
        head.lookAtCamera(250);
      }

      if (head?.makeEyeContact) {
        head.makeEyeContact(250);
      }

      if (head?.mtAvatar && analyser) {
        const timeData = new Float32Array(analyser.fftSize);
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);

        analyser.getFloatTimeDomainData(timeData);
        analyser.getByteFrequencyData(frequencyData);

        let sumSquares = 0;
        let zeroCrossings = 0;

        for (let index = 0; index < timeData.length; index += 1) {
          const sample = timeData[index];
          sumSquares += sample * sample;

          if (index > 0) {
            const previous = timeData[index - 1];
            if ((previous >= 0 && sample < 0) || (previous < 0 && sample >= 0)) {
              zeroCrossings += 1;
            }
          }
        }

        const rms = Math.sqrt(sumSquares / timeData.length);
        const low = averageRange(frequencyData, 0, 12) / 255;
        const mid = averageRange(frequencyData, 12, 36) / 255;
        const high = averageRange(frequencyData, 36, 84) / 255;
        const energy = clamp(rms * 5.5 + (low + mid + high) / 3);
        const active = isAgentSpeaking || energy > 0.05;

        if (active) {
          motionTickRef.current += 1;

          const brightness = clamp((high + mid * 0.6) / Math.max(low + mid + high, 0.001));
          const roundness = clamp(low / Math.max(mid + high + 0.15, 0.001));
          const plosive = clamp(0.22 - energy + (zeroCrossings / timeData.length) * 1.4);

          const aa = energy * clamp(1 - Math.abs(brightness - 0.32) * 2.4);
          const eh = energy * clamp(1 - Math.abs(brightness - 0.52) * 2.8);
          const ih = energy * clamp((brightness - 0.46) * 2.2);
          const oh = energy * clamp(roundness * 1.2);
          const uh = energy * clamp((roundness - 0.22) * 1.8);
          const phase = motionTickRef.current / 7;
          const motionScale = energy * (isAgentSpeaking ? 1 : 0.55);

          setMorphRealtime(head, "mouthOpen", energy * 0.75);
          setMorphRealtime(head, "jawOpen", energy * 0.55);
          setMorphRealtime(head, "viseme_aa", aa);
          setMorphRealtime(head, "viseme_E", eh * 0.85);
          setMorphRealtime(head, "viseme_I", ih * 0.78);
          setMorphRealtime(head, "viseme_O", oh * 0.9);
          setMorphRealtime(head, "viseme_U", uh * 0.85);
          setMorphRealtime(head, "viseme_PP", plosive * 0.35);
          setMorphRealtime(head, "headRotateY", Math.sin(phase) * 0.12 * motionScale);
          setMorphRealtime(head, "headRotateX", (Math.cos(phase * 0.7) * 0.07 - 0.015) * motionScale);
          setMorphRealtime(head, "bodyRotateY", Math.sin(phase * 0.58) * 0.06 * motionScale);
          setMorphRealtime(head, "bodyRotateX", Math.cos(phase * 0.5) * 0.04 * motionScale);
        } else {
          resetAvatarMotion();
        }
      }

      avatarAnimationFrameRef.current = window.requestAnimationFrame(animateAvatar);
    };

    avatarAnimationFrameRef.current = window.requestAnimationFrame(animateAvatar);

    return () => {
      if (avatarAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(avatarAnimationFrameRef.current);
        avatarAnimationFrameRef.current = null;
      }
      resetAvatarMotion();
    };
  }, [callStatus, isAgentSpeaking, resetAvatarMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanupAvatar();
      try {
        retellClientRef.current?.stopCall();
      } catch { /* noop */ }
    };
  }, [cleanupAvatar]);

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
        resetAvatarMotion();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      });

      retellClient.on("call_ready", () => {
        talkingHeadRef.current?.lookAtCamera?.(300000);
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
        resetAvatarMotion();
      });

      await retellClient.startCall({
        accessToken: data.access_token,
        sampleRate: 24000,
        emitRawAudioSamples: true,
      });
      await retellClient.startAudioPlayback?.().catch(() => {});
    } catch (err) {
      console.error("Failed to start spokesperson call:", err);
      setCallStatus("idle");
    }
  }, [resetAvatarMotion]);

  const endCall = useCallback(() => {
    try {
      retellClientRef.current?.stopCall();
    } catch { /* noop */ }
    setCallStatus("idle");
    setIsAgentSpeaking(false);
    setIsMuted(false);
    resetAvatarMotion();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [resetAvatarMotion]);

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
    cleanupAvatar();
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
          <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-primary shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl">
            <img
              src={realisticAvatar}
              alt="Aspen AI Assistant"
              className="h-full w-full object-cover"
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
    <div className="fixed bottom-4 left-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-[22rem] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-scale-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30">
            <img src={realisticAvatar} alt="Aspen" className="w-full h-full object-cover" />
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

      {/* Avatar Display with real 3D head */}
      <div className="relative overflow-hidden bg-gradient-to-b from-muted/40 via-background to-muted/20">
        <div className="pointer-events-none absolute inset-x-10 top-4 h-24 rounded-full bg-primary/10 blur-3xl" />

        <div ref={avatarContainerRef} className="relative h-[250px] w-full [&>canvas]:!h-full [&>canvas]:!w-full" />

        {avatarState !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="relative h-40 w-40 overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl">
              <img src={realisticAvatar} alt="Aspen preview" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 text-center">
                {avatarState === "loading" ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : null}
                <p className="max-w-[10rem] text-xs font-medium text-foreground">
                  {avatarState === "error" ? "3D avatar failed to load." : "Loading Aspen’s live 3D head…"}
                </p>
              </div>
            </div>
          </div>
        )}

        {avatarState === "ready" && isAgentSpeaking && (
          <div className="pointer-events-none absolute inset-x-16 bottom-6 h-16 rounded-full bg-primary/15 blur-2xl animate-pulse" />
        )}

        {callStatus === "active" && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-border bg-card/80 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
            {isAgentSpeaking ? "Aspen is talking" : isMuted ? "Mic muted" : "Listening live"}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="px-4 py-3">
        {callStatus === "idle" && (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Hey! I’m <span className="font-bold text-foreground">Aspen</span> from <span className="font-bold text-primary">A-I Hidden Leads</span>. Tap below and I’ll show you how we stop missed calls, revive stale leads, and turn traffic into revenue.
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
                className={`rounded-full p-2.5 transition-all ${
                  isMuted
                    ? "bg-destructive/15 text-destructive hover:bg-destructive/20"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <button
                onClick={endCall}
                className="rounded-full bg-destructive p-3 text-destructive-foreground transition-all hover:scale-110 hover:bg-destructive/90 active:scale-95"
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
