import { useState, useCallback, useRef, useEffect } from "react";
import { X, Send, Play, Pause, Volume2, VolumeX, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { salesPitchSegments } from "./avatarSalesPitch";
import cartoonAvatar from "@/assets/sample_cartoon_avatar.jpg";

type WidgetState = "collapsed" | "expanded";
type AvatarPhase = "idle" | "pitching" | "qa";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const TalkingAvatarWidget = () => {
  const [widgetState, setWidgetState] = useState<WidgetState>("collapsed");
  const [phase, setPhase] = useState<AvatarPhase>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [subtitleText, setSubtitleText] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [isPitchPaused, setIsPitchPaused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const mouthIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pitchAbortRef = useRef(false);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, subtitleText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
    };
  }, []);

  // Simulate mouth movement while speaking
  const startMouthAnimation = useCallback(() => {
    if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
    mouthIntervalRef.current = setInterval(() => {
      setMouthOpen(Math.random() * 0.7 + 0.3); // Random mouth openness
    }, 120);
  }, []);

  const stopMouthAnimation = useCallback(() => {
    if (mouthIntervalRef.current) clearInterval(mouthIntervalRef.current);
    mouthIntervalRef.current = null;
    setMouthOpen(0);
  }, []);

  // Speak text using Web Speech API
  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (isMuted) {
        // Still show subtitles even if muted
        setSubtitleText(text);
        setTimeout(() => {
          setSubtitleText("");
          resolve();
        }, text.length * 50); // Approximate reading time
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      speechRef.current = utterance;

      // Try to find a good female English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female")
      ) || voices.find(
        (v) => v.lang.startsWith("en-US") && !v.name.toLowerCase().includes("male")
      ) || voices.find(
        (v) => v.lang.startsWith("en")
      );

      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 0.95;
      utterance.pitch = 1.1;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSubtitleText(text);
        startMouthAnimation();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setSubtitleText("");
        stopMouthAnimation();
        resolve();
      };

      utterance.onerror = (e) => {
        setIsSpeaking(false);
        setSubtitleText("");
        stopMouthAnimation();
        if (e.error === "canceled") resolve();
        else reject(e);
      };

      window.speechSynthesis.speak(utterance);
    });
  }, [isMuted, startMouthAnimation, stopMouthAnimation]);

  // Run the sales pitch
  const startPitch = useCallback(async () => {
    setPhase("pitching");
    setCurrentSegment(0);
    pitchAbortRef.current = false;
    setIsPitchPaused(false);

    for (let i = 0; i < salesPitchSegments.length; i++) {
      if (pitchAbortRef.current) break;

      // Wait while paused
      while (isPitchPaused && !pitchAbortRef.current) {
        await new Promise((r) => setTimeout(r, 300));
      }

      setCurrentSegment(i);
      try {
        await speakText(salesPitchSegments[i]);
        // Brief pause between segments
        if (!pitchAbortRef.current) {
          await new Promise((r) => setTimeout(r, 800));
        }
      } catch {
        break;
      }
    }

    if (!pitchAbortRef.current) {
      setPhase("qa");
      setChatMessages([{
        role: "assistant",
        content: "I'm done with my overview! Feel free to ask me anything about our services, pricing, or how AI can help your specific business. 😊"
      }]);
    }
  }, [speakText, isPitchPaused]);

  // Handle Q&A
  const sendQuestion = useCallback(async () => {
    if (!userInput.trim() || isLoading) return;

    const question = userInput.trim();
    setUserInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsLoading(true);

    try {
      const { data } = await supabase.functions.invoke("avatar-qa", {
        body: {
          message: question,
          conversationHistory: chatMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      const reply = data?.reply || "Check out aihiddenleads.com for more details!";
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      // Speak the reply
      await speakText(reply);
    } catch (err) {
      console.error("Q&A error:", err);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having a little trouble. Visit aihiddenleads.com for more info!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [userInput, isLoading, chatMessages, speakText]);

  const handleExpand = () => {
    setWidgetState("expanded");
    // Load voices (needed for some browsers)
    window.speechSynthesis.getVoices();
  };

  const handleClose = () => {
    setWidgetState("collapsed");
    window.speechSynthesis.cancel();
    pitchAbortRef.current = true;
    stopMouthAnimation();
    setIsSpeaking(false);
    setPhase("idle");
    setSubtitleText("");
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      if (!prev) window.speechSynthesis.cancel();
      return !prev;
    });
  };

  const togglePause = () => {
    if (isSpeaking) {
      window.speechSynthesis.pause();
      stopMouthAnimation();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.resume();
      startMouthAnimation();
      setIsSpeaking(true);
    }
    setIsPitchPaused((prev) => !prev);
  };

  const skipToQA = () => {
    window.speechSynthesis.cancel();
    pitchAbortRef.current = true;
    stopMouthAnimation();
    setIsSpeaking(false);
    setPhase("qa");
    setChatMessages([{
      role: "assistant",
      content: "Sure! I'll skip ahead. What questions do you have about AI Hidden Leads? 😊"
    }]);
  };

  // Progress through pitch
  const pitchProgress = phase === "pitching"
    ? ((currentSegment + 1) / salesPitchSegments.length) * 100
    : phase === "qa" ? 100 : 0;

  if (widgetState === "collapsed") {
    return (
      <button
        onClick={handleExpand}
        className="fixed bottom-24 left-4 z-50 group"
        aria-label="Meet Aspen - AI Assistant"
      >
        <div className="relative">
          {/* Avatar circle */}
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
            <img
              src={cartoonAvatar}
              alt="Aspen AI Assistant"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />
          {/* Label */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md">
            Meet Aspen ✨
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 left-4 z-50 w-[340px] max-h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30">
            <img src={cartoonAvatar} alt="Aspen" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-primary-foreground text-sm font-bold">Aspen</h3>
            <p className="text-primary-foreground/70 text-[10px]">AI Sales Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleMute} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-primary-foreground" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-primary-foreground" />
            )}
          </button>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <X className="h-3.5 w-3.5 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Avatar Display */}
      <div className="relative bg-gradient-to-b from-muted/50 to-muted flex items-center justify-center py-4">
        <div className="relative w-28 h-28">
          {/* Avatar image with speaking animation */}
          <div
            className={`w-full h-full rounded-full overflow-hidden border-3 transition-all duration-200 ${
              isSpeaking
                ? "border-primary shadow-[0_0_20px_rgba(var(--primary),0.4)] scale-105"
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
          {isSpeaking && (
            <div
              className="absolute bottom-[22%] left-1/2 -translate-x-1/2 bg-[#c4736e] rounded-full transition-all duration-100"
              style={{
                width: `${16 + mouthOpen * 12}px`,
                height: `${4 + mouthOpen * 10}px`,
                opacity: 0.85,
              }}
            />
          )}

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-primary rounded-full animate-pulse"
                  style={{
                    height: `${6 + Math.random() * 8}px`,
                    animationDelay: `${i * 150}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pitch progress bar */}
        {phase === "pitching" && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/20">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${pitchProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Subtitle / Content Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 min-h-[120px] max-h-[200px]">
        {phase === "idle" && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Hi! I'm <span className="font-bold text-foreground">Aspen</span>, your AI guide.
              Let me show you how AI Hidden Leads can transform your business!
            </p>
            <button
              onClick={startPitch}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-2 mx-auto transition-colors"
            >
              <Play className="h-4 w-4" /> Start Presentation
            </button>
          </div>
        )}

        {phase === "pitching" && (
          <div className="space-y-2">
            {subtitleText && (
              <p className="text-xs text-foreground leading-relaxed animate-fade-in">
                {subtitleText}
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={togglePause}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                {isPitchPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                {isPitchPaused ? "Resume" : "Pause"}
              </button>
              <button
                onClick={skipToQA}
                className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Skip to Q&A →
              </button>
            </div>
          </div>
        )}

        {phase === "qa" && (
          <div className="space-y-2">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`text-xs p-2 rounded-lg ${
                  msg.role === "assistant"
                    ? "bg-muted text-foreground"
                    : "bg-primary/10 text-foreground ml-6"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {subtitleText && (
              <div className="text-xs p-2 rounded-lg bg-muted text-foreground animate-fade-in italic">
                🗣️ {subtitleText}
              </div>
            )}
            {isLoading && (
              <div className="text-xs p-2 rounded-lg bg-muted text-muted-foreground animate-pulse">
                Aspen is thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Q&A Input */}
      {phase === "qa" && (
        <div className="p-2 border-t border-border">
          <div className="flex gap-1.5">
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendQuestion()}
              placeholder="Ask Aspen anything..."
              className="flex-1 text-xs bg-muted rounded-full px-3 py-2 outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
              disabled={isLoading || isSpeaking}
            />
            <button
              onClick={sendQuestion}
              disabled={!userInput.trim() || isLoading || isSpeaking}
              className="p-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

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
