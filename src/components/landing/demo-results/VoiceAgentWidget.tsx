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

const isLikelyCallablePhoneNumber = (value?: string | null) => {
  const normalized = normalizePhoneNumber(value);
  if (!/^\+\d{11,15}$/.test(normalized)) return false;

  if (!normalized.startsWith("+1")) return true;

  const digits = normalized.slice(2);
  if (digits.length !== 10) return false;

  const areaCode = digits.slice(0, 3);
  const exchange = digits.slice(3, 6);
  return /^[2-9]\d{2}$/.test(areaCode) && /^[2-9]\d{2}$/.test(exchange);
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

const getInvokeErrorMessage = async (error: unknown) => {
  const fallbackMessage = error instanceof Error ? error.message : "";
  const response =
    typeof error === "object" && error !== null && "context" in error
      ? (error as { context?: Response }).context
      : undefined;

  if (!response) return fallbackMessage;

  try {
    const clone = typeof response.clone === "function" ? response.clone() : response;
    const text = await clone.text().catch(() => "");
    if (!text) return fallbackMessage;

    let payload: Record<string, unknown> | null = null;
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      payload = { error: text };
    }

    if (payload && typeof payload === "object") {
      if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
      if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
    }
  } catch {
    return fallbackMessage;
  }

  return fallbackMessage;
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

const extractLatestAgentUtterance = (event: unknown) => {
  const raw = event as Record<string, unknown> | null;

  if (raw?.role === "agent" && typeof raw.content === "string") {
    return raw.content.trim();
  }

  if (typeof raw?.transcript === "string") {
    const agentSegments = Array.from(raw.transcript.matchAll(/agent:\s*(.+?)(?=\n(?:user:|agent:)|$)/gis));
    if (agentSegments.length > 0) {
      return agentSegments[agentSegments.length - 1][1].trim();
    }
  }

  return "";
};

const isTransferStartUtterance = (value: string) => {
  const normalized = value.toLowerCase().trim();
  if (!normalized) return false;
  if (normalized.includes(LIVE_TRANSFER_READY_PHRASE)) return true;

  const transferCommitment = /(?:connecting you|let me connect you|i(?:'m| am) connecting you|i(?:'ll| will) connect you|transferring you|putting you through|bringing .* on the line)/.test(normalized);
  const transferTiming = /(?:stay on the line|one moment|please hold|right away|right now|just a moment|\bnow\b)/.test(normalized);

  return transferCommitment && transferTiming;
};

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
  const transferAttemptedRef = useRef(false);
  const transferTriggeredRef = useRef(false);
  const transferInProgressRef = useRef(false);
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
      callerName: callerName?.trim() || "a caller",
      callerEmail: normalizeEmailCandidate(callerEmail || ""),
      callerPhone: isLikelyCallablePhoneNumber(callerPhone) ? normalizePhoneNumber(callerPhone || "") : "",
    };

    const optimisticCallerPhone = normalizePhoneNumber(capturedContact?.callerPhone || "");

    const optimisticContact = {
      callerName: capturedContact?.callerName?.trim() || fallbackContact.callerName,
      callerEmail: normalizeEmailCandidate(capturedContact?.callerEmail || fallbackContact.callerEmail),
      callerPhone: isLikelyCallablePhoneNumber(optimisticCallerPhone) ? optimisticCallerPhone : fallbackContact.callerPhone,
    };

    if (!callId || (optimisticContact.callerPhone && optimisticContact.callerEmail)) {
      return optimisticContact;
    }

    try {
      const { data, error } = await supabase.functions.invoke("retell-web-call", {
        body: {
          action: "get-call-transfer-context",
          callId,
          callerName: optimisticContact.callerName,
          callerEmail: optimisticContact.callerEmail,
          callerPhone: optimisticContact.callerPhone,
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Unable to read live call details");
      }

      return {
        callerName:
          typeof data.callerName === "string" && data.callerName.trim()
            ? data.callerName.trim()
            : optimisticContact.callerName,
        callerEmail: normalizeEmailCandidate(
          typeof data.callerEmail === "string" ? data.callerEmail : optimisticContact.callerEmail,
        ),
        callerPhone: (() => {
          const transcriptPhone = normalizePhoneNumber(
            typeof data.callerPhone === "string" ? data.callerPhone : "",
          );
          return isLikelyCallablePhoneNumber(transcriptPhone)
            ? transcriptPhone
            : optimisticContact.callerPhone;
        })(),
      };
    } catch (error) {
      console.warn("Could not resolve live transfer contact:", error);
      return optimisticContact;
    }
  }, [callerEmail, callerName, callerPhone]);

  const initiateLiveTransfer = useCallback(async (capturedContact?: { callerName?: string; callerEmail?: string; callerPhone?: string }) => {
    const callId = callIdRef.current;
    if (!callId || transferInProgressRef.current) return;

    transferTriggeredRef.current = true;
    const resolvedContact = await resolveTransferContact(capturedContact);

    if (!isLikelyCallablePhoneNumber(resolvedContact.callerPhone)) {
      console.warn("[VoiceWidget] Transfer blocked — no valid caller phone captured");
      transferTriggeredRef.current = false;
      setTransferState(false);
      toast({
        title: "Live transfer unavailable",
        description: "Aspen couldn't confirm a valid callback phone number clearly enough to place the transfer call.",
        variant: "destructive",
      });
      return;
    }

    setTransferState(true);
    console.log("[VoiceWidget] Initiating live transfer bridge", {
      callId,
      callerPhone: `***${resolvedContact.callerPhone.slice(-4)}`,
      ownerPhone: ownerPhone ? `***${ownerPhone.slice(-4)}` : "DEFAULT",
    });

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

      const invokeErrorMessage = error ? await getInvokeErrorMessage(error) : "";
      if (error || !data?.success) {
        throw new Error(invokeErrorMessage || data?.error || "Transfer failed");
      }

      console.log("[VoiceWidget] Transfer bridge created successfully", {
        conferenceName: data.conferenceName,
        callerCallSid: data.callerCallSid,
        ownerCallSid: data.ownerCallSid,
      });

      toast({
        title: `Live transfer initiated`,
        description: `Connecting ${resolvedOwnerName} now. Your phone will ring shortly — please answer it to join the call.`,
      });

      try {
        retellClientRef.current?.stopCall();
      } catch (stopError) {
        console.warn("[VoiceWidget] Could not stop Retell call after transfer started:", stopError);
      }
    } catch (err) {
      console.error("[VoiceWidget] Live transfer failed:", err);
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
    if (transferTriggeredRef.current || transferAttemptedRef.current) return;

    const eventText = extractEventText(event);
    if (!eventText) return;

    // Capture last agent message for replay — agent role is typically in "agent" field
    // or the event contains the agent response text as the main content
    const agentUtterance = extractLatestAgentUtterance(event);
    if (agentUtterance) {
      setLastAgentMessage(agentUtterance);
    }

    const looksLikeTransferStart = isTransferStartUtterance(agentUtterance || eventText);

    if (!looksLikeTransferStart) return;

    transferAttemptedRef.current = true;
    void initiateLiveTransfer();
  }, [initiateLiveTransfer]);

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
          callerName: callerName || "",
          callerEmail: callerEmail || "",
          callerPhone: isLikelyCallablePhoneNumber(callerPhone) ? normalizePhoneNumber(callerPhone || "") : "",
          transferAlreadyStarted: transferTriggeredRef.current,
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Couldn't finish the call recap.");
      }

      const transferWasAttempted = Boolean(data.transferRequested && (transferTriggeredRef.current || data.liveTransferStarted));

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
    transferAttemptedRef.current = false;
    transferTriggeredRef.current = false;
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
          callerPhone: isLikelyCallablePhoneNumber(callerPhone) ? normalizePhoneNumber(callerPhone || "") : "",
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
        setIsMuted(false);
        clearTimer();

        // If a live transfer is in progress, keep the widget in "active" state
        // so the user doesn't think the call dropped. The conference bridge
        // is handling the rest via PSTN.
        if (transferTriggeredRef.current || transferInProgressRef.current) {
          console.log("[VoiceWidget] Retell call ended but transfer is active — keeping widget alive");
          // Queue summary but do NOT reset the UI to idle
          void queueCallSummary();
          return;
        }

        setTransferState(false);
        setCallStatus("idle");
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
        setIsMuted(false);

        // If a live transfer is in progress, keep the widget alive —
        // the PSTN conference bridge is handling the call now.
        if (transferTriggeredRef.current || transferInProgressRef.current) {
          console.log("[VoiceWidget] Retell error during active transfer — keeping widget alive for PSTN bridge");
          return;
        }

        setTransferState(false);
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
              <div className="mb-3 grid grid-cols-[minmax(0,1fr)_2.75rem_2.75rem_2.75rem_minmax(0,1fr)] gap-1.5 sm:grid-cols-[minmax(0,1fr)_3rem_3rem_3rem_minmax(0,1fr)] sm:gap-2">
                <button
                  onClick={toggleMute}
                  className={`min-w-0 flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-3 text-xs font-semibold transition-colors sm:gap-2 sm:px-3 sm:text-sm ${
                    isMuted ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  <span className="hidden min-[360px]:inline">{isMuted ? "Unmute" : "Mute"}</span>
                </button>
                <button
                  onClick={togglePause}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors sm:h-12 sm:w-12 ${
                    isPaused ? "bg-amber-500/20 text-amber-400" : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                  aria-label={isPaused ? "Resume Aspen" : "Pause Aspen"}
                  title={isPaused ? "Resume audio" : "Pause agent audio"}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button
                  onClick={replayLastMessage}
                  disabled={!lastAgentMessage || isReplaying}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors sm:h-12 sm:w-12 ${
                    isReplaying
                      ? "bg-primary/20 text-primary"
                      : lastAgentMessage
                        ? "bg-secondary text-foreground hover:bg-secondary/80"
                        : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
                  }`}
                  aria-label="Replay last message"
                  title={lastAgentMessage ? "Replay Aspen's last response" : "No message to replay yet"}
                >
                  {isReplaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setShowAudioControls((prev) => !prev)}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors sm:h-12 sm:w-12 ${
                    showAudioControls ? "bg-primary/20 text-primary" : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                  aria-label="Audio controls"
                >
                  {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={endCall}
                  className="min-w-0 flex items-center justify-center gap-1.5 rounded-xl bg-destructive px-2.5 py-3 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 sm:gap-2 sm:px-3 sm:text-sm"
                >
                  <PhoneOff className="h-4 w-4" />
                  <span className="hidden min-[360px]:inline">End</span>
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
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Connecting you with {resolvedOwnerName}... Your phone will ring shortly.
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1">
                    Answer the incoming call to join the live conference. The owner will be connected after a brief whisper.
                  </p>
                  <button
                    onClick={() => {
                      setTransferState(false);
                      setCallStatus("idle");
                    }}
                    className="w-full rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Dismiss
                  </button>
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
