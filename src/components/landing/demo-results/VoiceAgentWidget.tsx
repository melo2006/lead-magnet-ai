import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Phone, PhoneOff, Loader2, Maximize2, Minimize2, X, Volume2, VolumeX, Bluetooth, Speaker, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

const RETELL_AGENT_ID = "agent_ea256ca8441689051b9aa2b183";
const DEFAULT_OWNER_NAME = "Ron Melo";

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
  const [isMinimized, setIsMinimized] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [transferInProgress, setTransferInProgress] = useState(false);
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

  // Apply volume changes to all audio/video elements on page
  useEffect(() => {
    const els = document.querySelectorAll("audio, video");
    els.forEach((el) => {
      (el as HTMLMediaElement).volume = volume / 100;
    });
  }, [volume]);

  // Apply audio output device selection
  const switchAudioOutput = useCallback(async (deviceId: string) => {
    setSelectedDevice(deviceId);
    try {
      const els = document.querySelectorAll("audio, video");
      for (const el of els) {
        if (typeof (el as any).setSinkId === "function") {
          await (el as any).setSinkId(deviceId);
        }
      }
    } catch (err) {
      console.warn("Could not switch audio output:", err);
    }
  }, []);

  const initiateLiveTransfer = useCallback(async (capturedContact?: { callerName?: string; callerEmail?: string; callerPhone?: string }) => {
    const callId = callIdRef.current;
    if (!callId) return;

    setTransferInProgress(true);

    try {
      const { data, error } = await supabase.functions.invoke("live-transfer-bridge", {
        body: {
          transferTo: ownerPhone || "",
          callerPhone: capturedContact?.callerPhone || callerPhone || "",
          callerName: capturedContact?.callerName || callerName || "a caller",
          callerEmail: capturedContact?.callerEmail || callerEmail || "",
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
      // Fall back to warm-transfer (callback alert)
      try {
        const { data, error } = await supabase.functions.invoke("retell-web-call", {
          body: {
            action: "warm-transfer",
            callId,
            businessName,
            ownerName: resolvedOwnerName,
            callerName: capturedContact?.callerName || callerName || "a caller",
            callerEmail: capturedContact?.callerEmail || callerEmail || "",
            callerPhone: capturedContact?.callerPhone || callerPhone || "",
            transferTo: ownerPhone || "",
          },
        });
        if (error || !data?.success) throw new Error("Fallback also failed");
        toast({
          title: `Callback alert sent to ${resolvedOwnerName}`,
          description: `${resolvedOwnerName} will call back shortly.`,
        });
      } catch {
        toast({
          title: "Transfer unavailable",
          description: "We'll capture a callback request instead.",
          variant: "destructive",
        });
      }
    } finally {
      setTransferInProgress(false);
    }
  }, [businessName, callerEmail, callerName, callerPhone, ownerPhone, resolvedOwnerName, toast]);

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

      // If a transfer was requested, attempt live transfer
      if (data.transferRequested) {
        await initiateLiveTransfer({
          callerName: data.callerName,
          callerEmail: data.callerEmail,
          callerPhone: data.callerPhone,
        });
      }

      const appointmentBooked = Boolean(data.calendarEventId);

      const headline = data.appointmentRequested
        ? appointmentBooked
          ? "Appointment confirmed"
          : "Appointment requested"
        : data.transferRequested
          ? "Live transfer initiated"
          : data.callbackRequested
            ? "Callback request captured"
            : "Call summary sent";

      const detailLine = data.appointmentRequested
        ? appointmentBooked && data.appointmentScheduledFor
          ? `Confirmed for ${data.appointmentScheduledFor}.`
          : `Aspen captured appointment intent and flagged it for ${resolvedOwnerName}.`
        : data.transferRequested
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
  }, [businessName, leadId, ownerEmail, ownerPhone, prospectId, resolvedOwnerName, toast, websiteUrl, initiateLiveTransfer]);

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
        // Apply current volume and device
        setTimeout(() => {
          const els = document.querySelectorAll("audio, video");
          els.forEach((el) => {
            (el as HTMLMediaElement).volume = volume / 100;
            if (selectedDevice && typeof (el as any).setSinkId === "function") {
              (el as any).setSinkId(selectedDevice).catch(() => {});
            }
          });
        }, 500);
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
  }, [businessInfo, businessName, businessNiche, callerEmail, callerName, callerPhone, clearTimer, ownerEmail, ownerPhone, resolvedOwnerName, toast, websiteUrl, queueCallSummary, volume, selectedDevice]);

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
