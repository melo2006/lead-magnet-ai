import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2, Bot, User } from "lucide-react";
import { motion } from "framer-motion";

interface ChatWidgetProps {
  businessName: string;
  businessNiche: string;
  websiteUrl: string;
  businessInfo: string;
}

interface Message {
  role: "assistant" | "user";
  content: string;
}

const ChatWidget = ({ businessName, businessNiche, websiteUrl, businessInfo }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `${getGreeting()}! 👋 I'm Aspen, the AI assistant for ${businessName}. How can I help you today? I can answer questions about our services, help you book an appointment, or connect you with the owner.`,
        },
      ]);
    }
  }, [isOpen, businessName, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    // Simulate AI response based on context
    setTimeout(() => {
      const responses = [
        `Great question! At ${businessName}, we pride ourselves on providing top-notch service. Would you like me to book a time for you to speak with Ron Melo, the owner? He'd love to discuss how we can help.`,
        `I'd be happy to help with that! ${businessName} specializes in exactly what you're looking for. Want me to set up a quick 15-minute consultation?`,
        `Thanks for your interest! Based on what I know about ${businessName}, I think we can definitely assist you. Shall I schedule an appointment or connect you with Ron directly?`,
      ];
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: responses[Math.floor(Math.random() * responses.length)] },
      ]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
            <MessageSquare className="h-5 w-5 text-accent" />
          </div>
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card" />
        </div>
        <div>
          <p className="text-sm font-bold">Chat with Aspen</p>
          <p className="text-xs text-muted-foreground">AI Chat Assistant • Online now</p>
        </div>
      </div>

      {!isOpen ? (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
        >
          <MessageSquare className="h-4 w-4" />
          Start Chat
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-3"
        >
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border bg-background/50 p-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "assistant" ? "bg-accent/20" : "bg-primary/20"
                }`}>
                  {msg.role === "assistant" ? (
                    <Bot className="h-3.5 w-3.5 text-accent" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-accent/10 text-foreground"
                    : "bg-primary/10 text-foreground"
                }`}>
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

          <div className="flex gap-2">
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
        </motion.div>
      )}

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Aspen can answer questions about {businessName} and book appointments.
      </p>
    </div>
  );
};

export default ChatWidget;
