import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChatWidgetProps {
  businessName: string;
  businessNiche: string;
  websiteUrl: string;
  businessInfo: string;
  callerName?: string;
  callerEmail?: string;
  callerPhone?: string;
  onClose?: () => void;
}

interface Message {
  role: "assistant" | "user";
  content: string;
}

const ChatWidget = ({
  businessName,
  businessNiche,
  websiteUrl,
  businessInfo,
  callerName,
  callerEmail,
  callerPhone,
  onClose,
}: ChatWidgetProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const nameGreet = callerName ? `, ${callerName.split(" ")[0]}` : "";
    setMessages([
      {
        role: "assistant",
        content: `${getGreeting()}${nameGreet}! 👋 I'm Aspen, the AI assistant for ${businessName}. This is a live demonstration of our AI chat capability — imagine this widget right on your website, answering customer questions 24/7, booking appointments, and capturing leads.\n\nHow can I help you today? Feel free to ask about our services, what we can do for your business, or anything else!`,
      },
    ]);
  }, [businessName, callerName]);

  const sendToAI = async (conversationHistory: Message[]) => {
    const systemPrompt = `You are Aspen, the AI chat assistant for ${businessName}. You are warm, witty, personable, and genuinely helpful.

IMPORTANT CONTEXT:
- Business: ${businessName}
- Industry: ${businessNiche}
- Website: ${websiteUrl}
- Caller name: ${callerName || "Unknown"}
- Caller email: ${callerEmail || "Not provided"}
- Caller phone: ${callerPhone || "Not provided"}

BUSINESS KNOWLEDGE:
${businessInfo?.substring(0, 4000) || "A professional business offering quality services."}

PERSONALITY:
- Be friendly, quick, conversational, clever, and fun to talk to.
- Use the caller's first name naturally (not every message).
- Light humor is welcome. Be playful and personable.
- Keep responses concise — 1-3 sentences usually.

DEMO AWARENESS:
- This is a demonstration of our AI chat technology. If asked, explain that this widget can be embedded on any website.
- Mention our services: AI Chat Assistant, AI Voice Assistant, website redesign, and lead capture.
- The owner is Ron Melo. Offer to connect the caller with Ron for a deeper discussion.
- If the caller wants to schedule something, suggest booking a 15-minute demo with Ron.

EMAIL CONFIRMATION:
- You have the caller's email on file: ${callerEmail || "not provided"}.
- If relevant, confirm: "I have your email as ${callerEmail}. Is that the best one to reach you?"
- If they provide a different email, acknowledge it.

Be specific to ${businessName}'s actual industry and services. Never talk about unrelated industries.`;

    try {
      const { data, error } = await supabase.functions.invoke("retell-web-call", {
        body: {
          action: "chat-completion",
          systemPrompt,
          messages: conversationHistory.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (error || !data?.content) {
        throw new Error(error?.message || "No response");
      }

      return data.content as string;
    } catch (err) {
      console.error("Chat AI error:", err);
      // Fallback response
      const fallbacks = [
        `Great question! At ${businessName}, we pride ourselves on providing top-notch service. Would you like me to set up a quick call with Ron Melo to discuss further?`,
        `I'd love to help with that! Based on what I know about ${businessName}, I think we can definitely assist. Want me to schedule a 15-minute demo?`,
        `Thanks for asking${callerName ? `, ${callerName.split(" ")[0]}` : ""}! Let me connect you with Ron Melo — he'd be the best person to walk you through the specifics.`,
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput("");
    const updated = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(updated);
    setIsTyping(true);

    const response = await sendToAI(updated);
    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    setIsTyping(false);
  };

  return (
    <div className="rounded-2xl border border-accent/20 bg-card shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-accent/10 border-b border-accent/20">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
              <Bot className="h-4 w-4 text-accent" />
            </div>
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card" />
          </div>
          <div>
            <p className="text-sm font-bold">Chat with Aspen</p>
            <p className="text-[10px] text-muted-foreground">AI Chat Assistant • Online</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="max-h-80 overflow-y-auto p-3 space-y-2.5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                msg.role === "assistant" ? "bg-accent/20" : "bg-primary/20"
              }`}
            >
              {msg.role === "assistant" ? (
                <Bot className="h-3.5 w-3.5 text-accent" />
              ) : (
                <User className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
                msg.role === "assistant" ? "bg-accent/10 text-foreground" : "bg-primary/10 text-foreground"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20">
              <Bot className="h-3.5 w-3.5 text-accent" />
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-accent/10 px-3 py-2">
              <Loader2 className="h-3 w-3 animate-spin text-accent" />
              <span className="text-xs text-muted-foreground">Aspen is typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t border-border">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:border-accent/50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="flex items-center justify-center rounded-lg bg-accent px-3 py-2 text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default ChatWidget;
