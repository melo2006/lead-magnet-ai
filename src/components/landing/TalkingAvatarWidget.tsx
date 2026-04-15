import { useState, useCallback, useRef, useEffect } from "react";
import { X, Mic, MicOff, Phone, PhoneOff, ExternalLink, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import realisticAvatar from "@/assets/aspen_blonde_avatar.jpg";
import DraggableFloating from "@/components/landing/demo-results/DraggableFloating";

type WidgetState = "collapsed" | "expanded" | "minimized";
type CallStatus = "idle" | "connecting" | "active" | "ending";

const AVATAR_MODEL_URL = "/aspen-brunette.glb";
const AUTO_MINIMIZE_DELAY = 25000; // 25 seconds

const BLUE_EYE_COLOR = { r: 88, g: 153, b: 232 };

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const lerp = (start: number, end: number, alpha: number) => start + (end - start) * alpha;

const toMaterialList = (material: any) => (Array.isArray(material) ? material : [material]).filter(Boolean);

const replaceTextureImage = (
  texture: any,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number, source: CanvasImageSource | null) => void,
) => {
  if (!texture) return;

  const source = texture.image ?? null;
  const width = Math.max(64, source?.width ?? 512);
  const height = Math.max(64, source?.height ?? 512);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  draw(ctx, width, height, source);
  texture.image = canvas;
  texture.needsUpdate = true;
};

const applyBlondeHairMaterial = (material: any) => {
  toMaterialList(material).forEach((mat) => {
    if (mat?.map) {
      replaceTextureImage(mat.map, (ctx, width, height, source) => {
        const fill = ctx.createLinearGradient(0, 0, width, height);
        fill.addColorStop(0, "rgb(251, 240, 194)");
        fill.addColorStop(0.38, "rgb(232, 205, 145)");
        fill.addColorStop(0.72, "rgb(202, 162, 100)");
        fill.addColorStop(1, "rgb(142, 102, 59)");
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, width, height);

        if (source) {
          ctx.globalAlpha = 0.18;
          ctx.drawImage(source, 0, 0, width, height);
          ctx.globalAlpha = 1;
        }

        const highlight = ctx.createLinearGradient(width * 0.08, 0, width * 0.48, height);
        highlight.addColorStop(0, "rgba(255,255,255,0.34)");
        highlight.addColorStop(0.28, "rgba(255,255,255,0.12)");
        highlight.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = highlight;
        ctx.fillRect(0, 0, width, height);
      });
    }

    mat.color?.setRGB(1, 1, 1);
    mat.roughness = 0.78;
    mat.metalness = 0.02;
    mat.needsUpdate = true;
  });
};

const applyBlueEyeMaterial = (material: any) => {
  toMaterialList(material).forEach((mat) => {
    if (mat?.map) {
      replaceTextureImage(mat.map, (ctx, width, height, source) => {
        if (source) {
          ctx.drawImage(source, 0, 0, width, height);
        } else {
          ctx.fillStyle = "rgb(248,250,255)";
          ctx.fillRect(0, 0, width, height);
        }

        const image = ctx.getImageData(0, 0, width, height);
        const { data } = image;

        for (let index = 0; index < data.length; index += 4) {
          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          const alpha = data[index + 3];
          if (alpha < 10) continue;

          const maxChannel = Math.max(red, green, blue);
          const minChannel = Math.min(red, green, blue);
          const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;
          const isBrownIris = red > 42 && green > 22 && blue > 12 && red > green && green >= blue && maxChannel < 220 && saturation > 0.12;

          if (isBrownIris) {
            const detail = maxChannel / 255;
            data[index] = clampByte(BLUE_EYE_COLOR.r * (0.7 + detail * 0.3));
            data[index + 1] = clampByte(BLUE_EYE_COLOR.g * (0.68 + detail * 0.32));
            data[index + 2] = clampByte(BLUE_EYE_COLOR.b * (0.78 + detail * 0.22));
          }
        }

        ctx.putImageData(image, 0, 0);
      });
    }

    mat.color?.setRGB(1, 1, 1);
    mat.needsUpdate = true;
  });
};

const restyleAspenAvatar = (head: any) => {
  const armature = head?.armature;
  if (!armature?.traverse) return;

  armature.traverse((child: any) => {
    if (!child?.isMesh) return;

    const meshName = (child.name || "").toLowerCase();
    const materialName = (child.material?.name || "").toLowerCase();

    if (meshName.includes("glasses") || materialName.includes("glasses")) {
      child.visible = false;
      return;
    }

    if (meshName.includes("hair") || materialName.includes("hair")) {
      applyBlondeHairMaterial(child.material);
    }

    if (meshName.includes("eye") || materialName.includes("eye")) {
      applyBlueEyeMaterial(child.material);
    }
  });
};

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

const LIPSYNC_KEYS = [
  "viseme_aa", "viseme_E", "viseme_I", "viseme_O", "viseme_U", "viseme_PP",
  "mouthOpen", "jawOpen", "headRotateX", "headRotateY", "bodyRotateX", "bodyRotateY",
] as const;

type LipSyncMorphName = typeof LIPSYNC_KEYS[number];

const NEUTRAL_MORPHS: Record<LipSyncMorphName, number> = {
  viseme_aa: 0,
  viseme_E: 0,
  viseme_I: 0,
  viseme_O: 0,
  viseme_U: 0,
  viseme_PP: 0,
  mouthOpen: 0,
  jawOpen: 0,
  headRotateX: 0,
  headRotateY: 0,
  bodyRotateX: 0,
  bodyRotateY: 0,
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
  const autoMinimizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const morphStateRef = useRef<Record<LipSyncMorphName, number>>({ ...NEUTRAL_MORPHS });

  const focusAvatarOnViewer = useCallback((duration = 300000) => {
    const head = talkingHeadRef.current;
    if (!head) return;
    head.lookAhead?.(duration);
    head.makeEyeContact?.(duration);
    head.setMood?.("neutral");
  }, []);

  const applyMorphTarget = useCallback((head: any, morphName: LipSyncMorphName, target: number, alpha: number) => {
    const next = lerp(morphStateRef.current[morphName] ?? 0, target, alpha);
    morphStateRef.current[morphName] = next;
    setMorphRealtime(head, morphName, next);
  }, []);

  const resetAvatarMotion = useCallback((mode: "neutral" | "release" = "neutral") => {
    const head = talkingHeadRef.current;
    if (!head) return;
    motionTickRef.current = 0;
    const release = mode === "release";
    LIPSYNC_KEYS.forEach((morphName) => {
      morphStateRef.current[morphName] = NEUTRAL_MORPHS[morphName];
      setMorphRealtime(head, morphName, release ? null : NEUTRAL_MORPHS[morphName]);
    });
    if (!release) {
      focusAvatarOnViewer(300000);
    }
  }, [focusAvatarOnViewer]);

  const cleanupAvatar = useCallback(() => {
    resetAvatarMotion("release");
    if (avatarAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(avatarAnimationFrameRef.current);
      avatarAnimationFrameRef.current = null;
    }
    try { talkingHeadRef.current?.stop?.(); } catch { /* noop */ }
    talkingHeadRef.current = null;
    if (avatarContainerRef.current) avatarContainerRef.current.replaceChildren();
    setAvatarState("idle");
  }, [resetAvatarMotion]);

  // Auto-minimize after delay when expanded and call is active
  useEffect(() => {
    if (widgetState === "expanded" && callStatus === "active") {
      autoMinimizeTimerRef.current = setTimeout(() => {
        setWidgetState("minimized");
      }, AUTO_MINIMIZE_DELAY);
      return () => {
        if (autoMinimizeTimerRef.current) clearTimeout(autoMinimizeTimerRef.current);
      };
    }
  }, [widgetState, callStatus]);

  // Initialize 3D avatar
  useEffect(() => {
    if ((widgetState !== "expanded" && widgetState !== "minimized") || !avatarContainerRef.current || talkingHeadRef.current) {
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
          cameraDistance: 0.12,
          cameraY: 0.01,
          cameraRotateX: 0,
          cameraRotateY: 0,
          cameraRotateEnable: false,
          cameraPanEnable: false,
          cameraZoomEnable: false,
          lipsyncModules: [],
          modelPixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
          modelFPS: 48,
          lightAmbientIntensity: 3.2,
          lightDirectIntensity: 12,
          lightDirectPhi: 0.85,
          lightDirectTheta: 2.2,
          avatarIdleEyeContact: 1,
          avatarIdleHeadMove: 0.04,
          avatarSpeakingEyeContact: 1,
          avatarSpeakingHeadMove: 0.22,
        });

        await head.showAvatar({
          url: AVATAR_MODEL_URL,
          body: "F",
          lipsyncLang: "en",
          avatarMood: "neutral",
          avatarIdleEyeContact: 1,
          avatarIdleHeadMove: 0.04,
          avatarSpeakingEyeContact: 1,
          avatarSpeakingHeadMove: 0.22,
        });

        restyleAspenAvatar(head);

        head.setView?.("head", { cameraDistance: 0.12, cameraY: 0.01, cameraRotateX: 0, cameraRotateY: 0 });
        resetAvatarMotion();
        focusAvatarOnViewer(300000);
        head.start?.();

        if (cancelled) { head.stop?.(); return; }
        talkingHeadRef.current = head;
        setAvatarState("ready");
      } catch (error) {
        console.error("Failed to initialize TalkingHead avatar:", error);
        if (!cancelled) setAvatarState("error");
      }
    };

    void initializeAvatar();
    return () => { cancelled = true; };
  }, [focusAvatarOnViewer, resetAvatarMotion, widgetState]);

  // Animate lip-sync with SUBTLE mouth movements
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

      if (head && callStatus === "active") {
        focusAvatarOnViewer(300);
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
            if ((previous >= 0 && sample < 0) || (previous < 0 && sample >= 0)) zeroCrossings += 1;
          }
        }

        const rms = Math.sqrt(sumSquares / timeData.length);
        const low = averageRange(frequencyData, 0, 12) / 255;
        const mid = averageRange(frequencyData, 12, 36) / 255;
        const high = averageRange(frequencyData, 36, 84) / 255;
        const energy = clamp(rms * 4.8 + low * 0.35 + mid * 0.7 + high * 0.5);
        const active = isAgentSpeaking && energy > 0.018;
        const targetMorphs: Record<LipSyncMorphName, number> = { ...NEUTRAL_MORPHS };

        if (active) {
          motionTickRef.current += 1;
          const brightness = clamp((high + mid * 0.6) / Math.max(low + mid + high, 0.001));
          const roundness = clamp(low / Math.max(mid + high + 0.15, 0.001));
          const plosive = clamp(0.18 - energy + (zeroCrossings / timeData.length) * 1.3);
          const subtlety = 0.28;
          const aa = energy * clamp(1 - Math.abs(brightness - 0.32) * 2.3) * subtlety;
          const eh = energy * clamp(1 - Math.abs(brightness - 0.5) * 2.5) * subtlety;
          const ih = energy * clamp((brightness - 0.44) * 2.1) * subtlety;
          const oh = energy * clamp(roundness * 1.15) * subtlety;
          const uh = energy * clamp((roundness - 0.2) * 1.7) * subtlety;
          const phase = motionTickRef.current / 10;
          const motionScale = clamp(energy * 0.75, 0.08, 0.2);

          targetMorphs.mouthOpen = energy * 0.18;
          targetMorphs.jawOpen = energy * 0.11;
          targetMorphs.viseme_aa = aa * 0.95;
          targetMorphs.viseme_E = eh * 0.56;
          targetMorphs.viseme_I = ih * 0.5;
          targetMorphs.viseme_O = oh * 0.6;
          targetMorphs.viseme_U = uh * 0.56;
          targetMorphs.viseme_PP = plosive * 0.16;
          targetMorphs.headRotateY = Math.sin(phase) * 0.03 * motionScale;
          targetMorphs.headRotateX = Math.cos(phase * 0.7) * 0.018 * motionScale;
          targetMorphs.bodyRotateY = Math.sin(phase * 0.58) * 0.012 * motionScale;
          targetMorphs.bodyRotateX = Math.cos(phase * 0.5) * 0.008 * motionScale;
        } else if (head) {
          focusAvatarOnViewer(400);
        }

        LIPSYNC_KEYS.forEach((morphName) => {
          const isRotation = morphName.includes("Rotate");
          const smoothing = active ? (isRotation ? 0.18 : 0.55) : (isRotation ? 0.14 : 0.35);
          applyMorphTarget(head, morphName, targetMorphs[morphName], smoothing);
        });
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
  }, [applyMorphTarget, callStatus, focusAvatarOnViewer, isAgentSpeaking, resetAvatarMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoMinimizeTimerRef.current) clearTimeout(autoMinimizeTimerRef.current);
      cleanupAvatar();
      try { retellClientRef.current?.stopCall(); } catch { /* noop */ }
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
        resetAvatarMotion();
        focusAvatarOnViewer(300000);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setDuration((prev) => prev + 1), 1000);
      });

      retellClient.on("call_ended", () => {
        setCallStatus("idle");
        setIsAgentSpeaking(false);
        setIsMuted(false);
        resetAvatarMotion();
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      });

      retellClient.on("call_ready", () => {
        resetAvatarMotion();
        focusAvatarOnViewer(300000);
      });

      retellClient.on("agent_start_talking", () => setIsAgentSpeaking(true));
      retellClient.on("agent_stop_talking", () => setIsAgentSpeaking(false));

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

      const analyser = retellClient.analyzerComponent?.analyser as AnalyserNode | undefined;
      if (analyser) {
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.18;
      }

      // Audio output follows active device (Bluetooth, speaker, etc.)
      // The Retell SDK uses an <audio> element under the hood; find it and
      // keep its sinkId in sync with the OS default output.
      try {
        const syncAudioOutput = () => {
          const audioEls = document.querySelectorAll("audio");
          audioEls.forEach((el: any) => {
            if (typeof el.setSinkId === "function" && navigator.mediaDevices) {
              // Use default device (empty string = system default, follows OS routing)
              el.setSinkId("").catch(() => {});
            }
          });
        };
        syncAudioOutput();
        // Re-sync whenever the user changes audio devices
        const handleDeviceChange = () => syncAudioOutput();
        navigator.mediaDevices?.addEventListener("devicechange", handleDeviceChange);
        retellClient.on("call_ended", () => {
          navigator.mediaDevices?.removeEventListener("devicechange", handleDeviceChange);
        });
      } catch { /* audio routing not supported in this browser */ }
    } catch (err) {
      console.error("Failed to start spokesperson call:", err);
      setCallStatus("idle");
    }
  }, [focusAvatarOnViewer, resetAvatarMotion]);

  const endCall = useCallback(() => {
    try { retellClientRef.current?.stopCall(); } catch { /* noop */ }
    setCallStatus("idle");
    setIsAgentSpeaking(false);
    setIsMuted(false);
    resetAvatarMotion();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, [resetAvatarMotion]);

  const toggleMute = useCallback(() => {
    try {
      if (isMuted) retellClientRef.current?.unmute();
      else retellClientRef.current?.mute();
      setIsMuted((prev) => !prev);
    } catch { /* noop */ }
  }, [isMuted]);

  const handleExpand = () => setWidgetState("expanded");
  const handleMinimize = () => setWidgetState("minimized");
  const handleMaximize = () => {
    setWidgetState("expanded");
    if (autoMinimizeTimerRef.current) {
      clearTimeout(autoMinimizeTimerRef.current);
      autoMinimizeTimerRef.current = null;
    }
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

  // ── COLLAPSED: small floating face button ──
  if (widgetState === "collapsed") {
    return (
      <button
        onClick={handleExpand}
        className="fixed bottom-24 right-4 z-50 group"
        aria-label="Talk to Aspen - AI Assistant"
      >
        <div className="relative">
          <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-primary shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl">
            <img src={realisticAvatar} alt="Aspen AI Assistant" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md">
            Talk to Aspen 🎙️
          </div>
        </div>
      </button>
    );
  }

  // ── MINIMIZED: small floating face with controls ──
  if (widgetState === "minimized") {
    return (
      <div className="fixed bottom-6 right-4 z-50 flex items-center gap-2 animate-scale-in">
        {/* Face bubble */}
        <button onClick={handleMaximize} className="relative group" aria-label="Expand Aspen">
          <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-primary shadow-lg bg-card">
            {/* Hidden container keeps 3D avatar alive */}
            <div ref={widgetState === "minimized" && !avatarContainerRef.current ? undefined : undefined} />
            <img src={realisticAvatar} alt="Aspen" className="h-full w-full object-cover" />
          </div>
          {isAgentSpeaking && (
            <div className="absolute inset-0 rounded-full border-2 border-primary/60 animate-ping" />
          )}
        </button>

        {/* Mini controls pill */}
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-2 py-1 shadow-lg">
          {callStatus === "active" && (
            <>
              <span className="text-[10px] font-semibold text-foreground px-1">
                {formatDuration(duration)}
              </span>
              <button
                onClick={toggleMute}
                className={`rounded-full p-1.5 transition-all ${
                  isMuted ? "bg-destructive/15 text-destructive" : "bg-muted text-foreground"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </button>
              <button
                onClick={endCall}
                className="rounded-full bg-destructive p-1.5 text-destructive-foreground"
                title="End call"
              >
                <PhoneOff className="h-3 w-3" />
              </button>
            </>
          )}
          <button
            onClick={handleMaximize}
            className="rounded-full p-1.5 bg-muted text-foreground hover:bg-muted/80"
            title="Expand"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 hover:bg-muted text-muted-foreground"
            title="Close"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  // ── EXPANDED: smaller widget with 3D avatar ──
  return (
    <DraggableFloating initialX={window.innerWidth - 300} initialY={window.innerHeight - 500} dragLabel="Move Aspen">
    <div className="flex w-72 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-scale-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-white/30">
            <img src={realisticAvatar} alt="Aspen" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-primary-foreground text-xs font-bold">Aspen</h3>
            <p className="text-primary-foreground/70 text-[9px]">
              {callStatus === "active"
                ? `Live • ${formatDuration(duration)}`
                : callStatus === "connecting"
                  ? "Connecting..."
                  : "AI Hidden Leads"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {callStatus === "active" && (
            <button onClick={handleMinimize} className="p-1 rounded-full hover:bg-white/20 transition-colors" title="Minimize">
              <Minimize2 className="h-3 w-3 text-primary-foreground" />
            </button>
          )}
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X className="h-3 w-3 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* 3D Avatar — smaller */}
      <div className="relative overflow-hidden bg-gradient-to-b from-muted/40 via-background to-muted/20">
        <div ref={avatarContainerRef} className="relative h-[180px] w-full [&>canvas]:!h-full [&>canvas]:!w-full" />

        {avatarState !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="relative h-28 w-28 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <img src={realisticAvatar} alt="Aspen preview" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/70 text-center">
                {avatarState === "loading" ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : null}
                <p className="max-w-[8rem] text-[10px] font-medium text-foreground">
                  {avatarState === "error" ? "3D avatar failed to load." : "Loading Aspen…"}
                </p>
              </div>
            </div>
          </div>
        )}

        {avatarState === "ready" && isAgentSpeaking && (
          <div className="pointer-events-none absolute inset-x-12 bottom-4 h-10 rounded-full bg-primary/15 blur-2xl animate-pulse" />
        )}

        {callStatus === "active" && (
          <div className="pointer-events-none absolute right-2 top-2 rounded-full border border-border bg-card/80 px-2 py-0.5 text-[9px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
            {isAgentSpeaking ? "Speaking" : isMuted ? "Muted" : "Listening"}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        {callStatus === "idle" && (
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hey! I'm <span className="font-bold text-foreground">Aspen</span> from <span className="font-bold text-primary">A-I Hidden Leads</span>. Let me show you how we help businesses stop losing leads and make more money!
            </p>
            <button
              onClick={startCall}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 mx-auto transition-all hover:scale-105 active:scale-95"
            >
              <Phone className="h-3.5 w-3.5" /> Talk to Aspen
            </button>
          </div>
        )}

        {callStatus === "connecting" && (
          <div className="text-center py-1.5">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Connecting…
            </div>
          </div>
        )}

        {callStatus === "active" && (
          <div className="space-y-2">
            <p className="text-[10px] text-center text-muted-foreground">
              {isAgentSpeaking ? "🗣️ Aspen is speaking — jump in anytime!" : "🎙️ Listening..."}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={toggleMute}
                className={`rounded-full p-2 transition-all ${
                  isMuted ? "bg-destructive/15 text-destructive" : "bg-muted text-foreground hover:bg-muted/80"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={handleMinimize}
                className="rounded-full bg-muted p-2 text-foreground hover:bg-muted/80"
                title="Minimize"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={endCall}
                className="rounded-full bg-destructive p-2.5 text-destructive-foreground transition-all hover:scale-110 active:scale-95"
                title="End call"
              >
                <PhoneOff className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CTA Footer */}
      <div className="px-2 py-1.5 border-t border-border bg-gradient-to-r from-primary/10 to-primary/5">
        <a
          href="#lead-capture"
          className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          🚀 Try Our Free Demo — Scroll Down!
        </a>
      </div>
    </div>
    </DraggableFloating>
  );
};

export default TalkingAvatarWidget;
