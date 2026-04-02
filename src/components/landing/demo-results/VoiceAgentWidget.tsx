import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Phone, PhoneOff, Loader2, Maximize2, Minimize2, X, Volume2, VolumeX, Bluetooth, Speaker, Smartphone, Pause, Play, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

const RETELL_AGENT_ID = "agent_ea256ca8441689051b9aa2b183";
const DEFAULT_OWNER_NAME = "Ron Melo";
const LIVE_TRANSFER_READY_PHRASE = "i'm starting the live transfer now. please stay on the line while i connect you.";

interface VoiceAgentWidgetProps {
  leadId?: string;
  prospectId?: string;
  businessName: string;
  businessNiche: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  websiteUrl: string;
  businessInfo: string;
  callerName?: string;
  callerEmail?: string;
  callerPhone?: string;
  onClose?: () => void;
}

type CallStatus = "idle" | "connecting" | "active" | "ending";

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: "speaker" | "bluetooth" | "earpiece";
}

const classifyDevice = (device: MediaDeviceInfo): AudioDevice["kind"] => {
  const label = device.label.toLowerCase();
  if (label.includes("bluetooth") || label.includes("airpod") || label.includes("beats")) return "bluetooth";
  if (label.includes("speaker") || label.includes("external")) return "speaker";
  return "earpiece";
};

const deviceIcon = (kind: AudioDevice["kind"]) => {
  switch (kind) {
    case "bluetooth": return <Bluetooth className="h-3.5 w-3.5" />;
    case "speaker": return <Speaker className="h-3.5 w-3.5" />;
    default: return <Smartphone className="h-3.5 w-3.5" />;
  }
};

const normalizePhoneNumber = (value?: string | null) => {
  if (!value) return "";

  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+")) return value.trim();
  return "";
};

const normalizeEmailCandidate = (value?: string | null) => {
  if (!value) return "";

  const normalized = value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\(at\)|\[at\]/g, "@")
    .replace(/\(dot\)|\[dot\]/g, ".")
    .replace(/@+/g, "@");

  const match = normalized.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return match ? match[0] : "";
};

const extractCallerPhoneFromText = (value: string) => {
  const matches = Array.from(value.matchAll(/(?:\+?\d[\d\s().-]{8,}\d)/g))
    .map((match) => normalizePhoneNumber(match[0]))
    .filter(Boolean);

  return matches.length > 0 ? matches[matches.length - 1] : "";
};

const extractCallerEmailFromText = (value: string) => {
  const directMatches = Array.from(value.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi))
    .map((match) => normalizeEmailCandidate(match[0]))
    .filter(Boolean);

  if (directMatches.length > 0) return directMatches[directMatches.length - 1];

  const flattened = value
    .toLowerCase()
    .replace(/\bg\s*mail\b/g, "gmail")
    .replace(/\s+at\s+/g, "@")
    .replace(/\s+dot\s+/g, ".")
    .replace(/[^a-z0-9@._%+-]/g, " ")
    .replace(/\s+/g, "");

  return normalizeEmailCandidate(flattened);
};

const extractCallerNameFromText = (value: string) => {
  const matches = Array.from(
    value.matchAll(/(?:my name is|this is|i am|i'm)\s+([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*)?)/gi),
  );

  return matches.length > 0 ? matches[matches.length - 1][1].trim() : "";
};

const collectTextFragments = (value: unknown, fragments: string[] = []) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) fragments.push(trimmed);
    return fragments;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectTextFragments(item, fragments));
    return fragments;
  }

  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectTextFragments(item, fragments));
  }

  return fragments;
};

const extractEventText = (event: unknown) => collectTextFragments(event).join(" ");

const VoiceAgentWidget = ({
  leadId,
  prospectId,
  businessName,
  businessNiche,
  ownerName,
  ownerEmail,
  ownerPhone,
  websiteUrl,
  businessInfo,
  callerName,
  callerEmail,
  callerPhone,
  onClose,
}: VoiceAgentWidgetProps) => {
  const { toast } = useToast();
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [transferInProgress, setTransferInProgress] = useState(false);
  const [lastAgentMessage, setLastAgentMessage] = useState<string>("");
  const [isReplaying, setIsReplaying] = useState(false);
  const retellClientRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callIdRef = useRef<string | null>(null);
  const summaryQueuedRef = useRef(false);
  const transferTriggeredRef = useRef(false);
  const transferInProgressRef = useRef(false);
  const liveTranscriptRef = useRef("");
  const pausedVolumeRef = useRef(100);
  const resolvedOwnerName = ownerName || DEFAULT_OWNER_NAME;

  const setTransferState = useCallback((nextValue: boolean) => {
    transferInProgressRef.current = nextValue;
    setTransferInProgress(nextValue);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const applyLiveCallVolume = useCallback((nextVolume: number) => {
    const normalizedVolume = Math.max(0, Math.min(1, nextVolume / 100));

    // Approach 1: LiveKit track-level volume (used by Retell SDK internally)
    const room = retellClientRef.current?.room;
    if (room?.remoteParticipants instanceof Map) {
      room.remoteParticipants.forEach((participant: any) => {
        try {
          // Iterate audio track publications and set volume on each track
          const pubs = participant.audioTrackPublications ?? participant.audioTracks;
          if (pubs instanceof Map) {
            pubs.forEach((pub: any) => {
              const track = pub.track ?? pub.audioTrack;
              if (track && typeof track.setVolume === "function") {
                track.setVolume(normalizedVolume);
              }
            });
          }
          // Fallback: some SDK versions expose setVolume on participant
          if (typeof participant.setVolume === "function") {
            participant.setVolume(normalizedVolume);
          }
        } catch (error) {
          console.warn("Could not apply live call volume via tracks:", error);
        }
      });
    }

    // Approach 2: Direct DOM audio/video elements
    const elements = document.querySelectorAll("audio, video");
    elements.forEach((element) => {
      (element as HTMLMediaElement).volume = normalizedVolume;
    });

    // Approach 3: Web Audio API gain nodes (Retell may use these)
    try {
      const client = retellClientRef.current;
      if (client?.audioContext && client?.gainNode) {
        client.gainNode.gain.value = normalizedVolume;
      }
    } catch {
      // Not available
    }
  }, []);

  const applyAudioOutputDevice = useCallback(async (deviceId: string) => {
    if (!deviceId) return;

    const room = retellClientRef.current?.room;

    try {
      if (typeof room?.switchActiveDevice === "function") {
        await room.switchActiveDevice("audiooutput", deviceId);
        return;
      }
    } catch (error) {
      console.warn("Could not switch live call audio output:", error);
    }

    try {
      const elements = document.querySelectorAll("audio, video");
      await Promise.all(
        Array.from(elements).map((element) => {
          if (typeof (element as any).setSinkId === "function") {
            return (element as any).setSinkId(deviceId);
          }
          return Promise.resolve();
        }),
      );
    } catch (error) {
      console.warn("Could not switch browser audio output:", error);
    }
  }, []);

  // Enumerate audio output devices
  const refreshAudioDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const outputs = devices
        .filter((d) => d.kind === "audiooutput" && d.deviceId)
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${d.deviceId.slice(0, 6)}`,
          kind: classifyDevice(d),
        }));
      setAudioDevices(outputs);
      if (!selectedDevice && outputs.length > 0) {
        setSelectedDevice(outputs[0].deviceId);
      }
    } catch {
      // Not all browsers support enumerateDevices for output
    }
  }, [selectedDevice]);

  useEffect(() => {
    refreshAudioDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshAudioDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshAudioDevices);
    };
  }, [refreshAudioDevices]);

  useEffect(() => {
    applyLiveCallVolume(volume);
  }, [applyLiveCallVolume, volume]);

  const switchAudioOutput = useCallback(async (deviceId: string) => {
    setSelectedDevice(deviceId);
    await applyAudioOutputDevice(deviceId);
  }, [applyAudioOutputDevice]);

  useEffect(() => {
    if (!selectedDevice) return;
    void applyAudioOutputDevice(selectedDevice);
  }, [applyAudioOutputDevice, selectedDevice]);

  const resolveTransferContact = useCallback(async (capturedContact?: { callerName?: string; callerEmail?: string; callerPhone?: string }) => {
    const callId = callIdRef.current;
    const fallbackContact = {
      callerName: capturedContact?.callerName?.trim() || callerName || "a caller",
      callerEmail: normalizeEmailCandidate(capturedContact?.callerEmail || callerEmail || ""),
      callerPhone: normalizePhoneNumber(capturedContact?.callerPhone || callerPhone || ""),
    };

    if (!callId || (fallbackContact.callerPhone && fallbackContact.callerEmail)) {
      return fallbackContact;
    }

    try {
      const { data, error } = await supabase.functions.invoke("retell-web-call", {
        body: {
          action: "get-call-transfer-context",
          callId,
          callerName: fallbackContact.callerName,
          callerEmail: fallbackContact.callerEmail,
          callerPhone: fallbackContact.callerPhone,
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Unable to read live call details");
      }

      return {
        callerName:
          typeof data.callerName === "string" && data.callerName.trim()
            ? data.callerName.trim()
            : fallbackContact.callerName,
        callerEmail: normalizeEmailCandidate(
          typeof data.callerEmail === "string" ? data.callerEmail : fallbackContact.callerEmail,
        ),
        callerPhone: normalizePhoneNumber(
          typeof data.callerPhone === "string" ? data.callerPhone : fallbackContact.callerPhone,
        ),
      };
    } catch (error) {
      console.warn("Could not resolve live transfer contact:", error);
      return fallbackContact;
    }
  }, [callerEmail, callerName, callerPhone]);

  const initiateLiveTransfer = useCallback(async (capturedContact?: { callerName?: string; callerEmail?: string; callerPhone?: string }) => {
    const callId = callIdRef.current;
    if (!callId || transferInProgressRef.current) return;

    const resolvedContact = await resolveTransferContact(capturedContact);
    if (!resolvedContact.callerPhone) {
      toast({
        title: "Need caller phone first",
        description: "Aspen needs the caller's confirmed phone number before starting the live transfer.",
        variant: "destructive",
      });
      return;
    }

    transferTriggeredRef.current = true;
    setTransferState(true);

    try {
      const { data, error } = await supabase.functions.invoke("live-transfer-bridge", {
        body: {
          transferTo: ownerPhone || "",
          callerPhone: resolvedContact.callerPhone,
          callerName: resolvedContact.callerName,
          callerEmail: resolvedContact.callerEmail,
          businessName,
          ownerName: resolvedOwnerName,
          callId,
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Transfer failed");
      }

      toast({
        title: `Live transfer initiated`,
        description: `Connecting ${resolvedOwnerName} now. Stay on the line.`,
      });
    } catch (err) {
      console.error("Live transfer failed:", err);
      transferTriggeredRef.current = false;
      setTransferState(false);
      toast({
        title: "Live transfer failed",
        description: err instanceof Error ? err.message : "Aspen couldn't complete the live transfer yet.",
        variant: "destructive",
      });
    }
  }, [businessName, ownerPhone, resolvedOwnerName, resolveTransferContact, setTransferState, toast]);

  const maybeStartTransferFromLiveCall = useCallback((event: unknown) => {
    if (transferTriggeredRef.current) return;

    const eventText = extractEventText(event);
    if (!eventText) return;

    liveTranscriptRef.current = `${liveTranscriptRef.current}\n${eventText}`.slice(-16000);

    // Capture last agent message for replay — agent role is typically in "agent" field
    // or the event contains the agent response text as the main content
    const raw = event as any;
    if (raw?.role === "agent" && typeof raw?.content === "string" && raw.content.trim()) {
      setLastAgentMessage(raw.content.trim());
    } else if (typeof raw?.transcript === "string" && raw.transcript.trim()) {
      // Some Retell events send full transcript; extract last agent segment
      const agentSegments = raw.transcript.match(/agent:\s*(.+?)(?=\n(?:user:|agent:)|$)/gis);
      if (agentSegments?.length) {
        const lastSeg = agentSegments[agentSegments.length - 1].replace(/^agent:\s*/i, "").trim();
        if (lastSeg) setLastAgentMessage(lastSeg);
      }
    }

    const normalizedEventText = eventText.toLowerCase();
    const looksLikeTransferStart =
      normalizedEventText.includes(LIVE_TRANSFER_READY_PHRASE) ||
      (normalizedEventText.includes("stay on the line") &&
        (normalizedEventText.includes("connect you") || normalizedEventText.includes("connecting you")));

    if (!looksLikeTransferStart) return;

    void initiateLiveTransfer({
      callerName: extractCallerNameFromText(liveTranscriptRef.current) || callerName || "a caller",
      callerEmail: extractCallerEmailFromText(liveTranscriptRef.current) || callerEmail || "",
      callerPhone: extractCallerPhoneFromText(liveTranscriptRef.current) || callerPhone || "",
    });
  }, [callerEmail, callerName, callerPhone, initiateLiveTransfer]);

  const queueCallSummary = useCallback(async () => {
    const callId = callIdRef.current;
    if (!callId || summaryQueuedRef.current) return;

    summaryQueuedRef.current = true;

    try {
      const { data, error } = await supabase.functions.invoke("retell-web-call", {
        body: {
          action: "email-call-summary",
          callId,
          leadId,
          prospectId,
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

      const transferWasAttempted = Boolean(data.transferRequested && transferTriggeredRef.current);

      const appointmentBooked = Boolean(data.calendarEventId);

      const headline = data.appointmentRequested
        ? appointmentBooked
          ? "Appointment confirmed"
          : "Appointment requested"
        : transferWasAttempted
          ? "Live transfer initiated"
          : data.callbackRequested
            ? "Callback request captured"
            : "Call summary sent";

      const detailLine = data.appointmentRequested
        ? appointmentBooked && data.appointmentScheduledFor
          ? `Confirmed for ${data.appointmentScheduledFor}.`
          : `Aspen captured appointment intent and flagged it for ${resolvedOwnerName}.`
        : transferWasAttempted
          ? `${resolvedOwnerName} is being connected to you now.`
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
  }, [businessName, leadId, ownerEmail, ownerPhone, prospectId, resolvedOwnerName, toast, websiteUrl]);

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
    transferTriggeredRef.current = false;
    liveTranscriptRef.current = "";
    setTransferInProgress(false);

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
          callerPhone: callerPhone || "",
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
        setTimeout(() => {
          applyLiveCallVolume(volume);
          if (selectedDevice) {
            void applyAudioOutputDevice(selectedDevice);
          }
        }, 250);
      });

      retellClient.on("call_ready", () => {
        applyLiveCallVolume(volume);
        if (selectedDevice) {
          void applyAudioOutputDevice(selectedDevice);
        }
      });

      retellClient.on("call_ended", () => {
        setTransferState(false);
        setCallStatus("idle");
        setIsMuted(false);
        clearTimer();
        void queueCallSummary();
      });

      retellClient.on("update", (event: unknown) => {
        maybeStartTransferFromLiveCall(event);
      });

      retellClient.on("node_transition", (event: unknown) => {
        maybeStartTransferFromLiveCall(event);
      });

      retellClient.on("error", (err: any) => {
        console.error("Retell error:", err);
        clearTimer();
        setTransferState(false);
        setIsMuted(false);
        setCallStatus("idle");
        toast({ title: "Call error", description: "Something went wrong.", variant: "destructive" });
      });

      await retellClient.startCall({
        accessToken: data.access_token,
        sampleRate: 24000,
        emitRawAudioSamples: false,
        playbackDeviceId: selectedDevice || undefined,
      });
      await retellClient.startAudioPlayback?.().catch(() => {});
    } catch (err) {
      console.error("Failed to start call:", err);
      toast({ title: "Could not start call", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
      setCallStatus("idle");
      setTransferState(false);
      clearTimer();
    }
  }, [applyAudioOutputDevice, applyLiveCallVolume, businessInfo, businessName, businessNiche, callerEmail, callerName, callerPhone, clearTimer, ownerEmail, ownerPhone, resolvedOwnerName, toast, websiteUrl, queueCallSummary, volume, selectedDevice, maybeStartTransferFromLiveCall, setTransferState]);

  const endCall = useCallback(() => {
    setCallStatus("ending");
    setTransferState(false);
    try {
      retellClientRef.current?.stopCall();
    } catch {
      /* noop */
    }
    window.setTimeout(() => setCallStatus((c) => (c === "ending" ? "idle" : c)), 1500);
  }, [setTransferState]);

  const toggleMute = useCallback(() => {
    const client = retellClientRef.current;
    if (!client) return;

    const nextMuted = !isMuted;

    try {
      if (nextMuted) {
        client.mute?.();
      } else {
        client.unmute?.();
      }

      setIsMuted(nextMuted);
    } catch (error) {
      console.error("Failed to toggle mute:", error);
      toast({
        title: "Mute unavailable",
        description: "We couldn't update the microphone state. Please try again.",
        variant: "destructive",
      });
    }
  }, [isMuted, toast]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      // Resume: restore saved volume
      setVolume(pausedVolumeRef.current);
      applyLiveCallVolume(pausedVolumeRef.current);
      setIsPaused(false);
    } else {
      // Pause: save current volume, set to 0
      pausedVolumeRef.current = volume;
      setVolume(0);
      applyLiveCallVolume(0);
      setIsPaused(true);
    }
  }, [applyLiveCallVolume, isPaused, volume]);

  const replayLastMessage = useCallback(() => {
    if (!lastAgentMessage || isReplaying) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    setIsReplaying(true);
    const utterance = new SpeechSynthesisUtterance(lastAgentMessage);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Try to pick a good voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Samantha") || v.name.includes("Google US English") || (v.lang === "en-US" && v.localService),
    );
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setIsReplaying(false);
    utterance.onerror = () => setIsReplaying(false);

    // Pause agent audio while replaying so they don't overlap
    const prevVolume = volume;
    applyLiveCallVolume(0);
    utterance.onend = () => {
      setIsReplaying(false);
      applyLiveCallVolume(prevVolume);
    };
    utterance.onerror = () => {
      setIsReplaying(false);
      applyLiveCallVolume(prevVolume);
    };

    window.speechSynthesis.speak(utterance);
  }, [applyLiveCallVolume, isReplaying, lastAgentMessage, volume]);

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const callIsLive = callStatus === "active" || callStatus === "ending";

  return (
    <div className="rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">
      {/* Header */}
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
            <p className="text-[10px] text-muted-foreground">
              {transferInProgress ? "Connecting transfer..." : "AI Voice Assistant"}
            </p>
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
              ? `Ask about ${businessName}, request a live transfer to ${resolvedOwnerName}, or book a 15-minute appointment.`
              : `This is a live demo of AI voice for ${businessName}. Aspen can answer questions, transfer you live to the owner, or book an appointment.`}
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
            <>
              {/* Main call controls */}
              <div className="flex gap-2 mb-3">
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
                  onClick={() => setShowAudioControls((prev) => !prev)}
                  className={`flex items-center justify-center rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${
                    showAudioControls ? "bg-primary/20 text-primary" : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                  aria-label="Audio controls"
                >
                  {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={endCall}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
                >
                  <PhoneOff className="h-4 w-4" />
                  End
                </button>
              </div>

              {/* Audio controls panel */}
              {showAudioControls && (
                <div className="rounded-xl bg-secondary/50 p-3 space-y-3 border border-primary/10">
                  {/* Volume slider */}
                  <div className="flex items-center gap-3">
                    <VolumeX className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Slider
                      value={[volume]}
                      onValueChange={([v]) => setVolume(v)}
                      min={0}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground w-8 text-right font-mono">{volume}%</span>
                  </div>

                  {/* Audio output device selector */}
                  {audioDevices.length > 1 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Audio Output</p>
                      <div className="flex flex-wrap gap-1.5">
                        {audioDevices.map((device) => (
                          <button
                            key={device.deviceId}
                            onClick={() => switchAudioOutput(device.deviceId)}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                              selectedDevice === device.deviceId
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-foreground hover:bg-accent"
                            }`}
                          >
                            {deviceIcon(device.kind)}
                            <span className="max-w-[100px] truncate">{device.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Transfer status */}
              {transferInProgress && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Connecting you with {resolvedOwnerName}...
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceAgentWidget;
