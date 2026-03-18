import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Send, RotateCcw, Phone as PhoneIcon, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const WELCOME_TEMPLATES = [
  { emoji: "📞", title: "Medicare AEP", subtitle: "Caller" },
  { emoji: "🔄", title: "Enrollment", subtitle: "Follow-Up" },
  { emoji: "📋", title: "Policy Renewal", subtitle: "Reminder" },
  { emoji: "📞", title: "Inbound", subtitle: "Receptionist" },
  { emoji: "✏️", title: "Something", subtitle: "else" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forge-chat`;

const FORGE_ALLOWED_PLANS = ["voice_ai_enterprise", "voice_ai_agency"];

export default function Forge() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isForging, setIsForging] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Restore from session
  useEffect(() => {
    const saved = sessionStorage.getItem("forgeMessages");
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("forgeMessages", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const streamChat = useCallback(async (allMessages: ChatMessage[]) => {
    setIsThinking(true);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        if (resp.status === 429) toast.error("Rate limit reached. Wait a moment and try again.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Please add credits.");
        else toast.error(err.error || "Something went wrong");
        setIsThinking(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {}
        }
      }

      // Check for agent config JSON in the final content
      const jsonMatch = assistantContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const config = JSON.parse(jsonMatch[1]);
          const cleanContent = assistantContent.replace(/```json\n[\s\S]*?\n```/, "").trim();
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: cleanContent } : m
            )
          );
          await forgeAgent(config);
        } catch (e) {
          console.error("Failed to parse agent config:", e);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Can you try that again?" },
      ]);
    }
    setIsThinking(false);
  }, []);

  const forgeAgent = async (config: Record<string, unknown>) => {
    setIsForging(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-agent", {
        body: config,
      });
      if (error) throw error;
      toast.success(`${config.agent_name} has been forged!`);
    } catch (err: any) {
      toast.error("Failed to forge agent: " + (err.message || "Unknown error"));
    }
    setIsForging(false);
  };

  const sendMessage = (text: string) => {
    if (!text.trim() || isThinking) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    streamChat(updated);
  };

  const handleTemplate = (template: typeof WELCOME_TEMPLATES[0]) => {
    const text =
      template.title === "Something"
        ? "I want to build something custom"
        : `${template.title} ${template.subtitle}`;
    sendMessage(text);
  };

  const handleStartOver = () => {
    setMessages([]);
    sessionStorage.removeItem("forgeMessages");
  };

  const handleQuickReply = (label: string) => {
    // Handle navigation quick replies
    if (label.includes("Start a campaign")) {
      navigate("/campaigns/new");
      return;
    }
    if (label.includes("Fine-tune in editor") || label.includes("Fine-tune")) {
      navigate("/agents");
      return;
    }
    sendMessage(label);
  };

  const showWelcome = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-amber-50/30">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Forge</h1>
            <p className="text-xs text-muted-foreground">
              Build your AI agent through conversation
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <RotateCcw className="h-3.5 w-3.5" />
                Start Over
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start a new conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your current progress will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleStartOver}>
                  Start Over
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {showWelcome && <WelcomeScreen onTemplate={handleTemplate} />}

          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              onQuickReply={handleQuickReply}
              isLast={i === messages.length - 1}
            />
          ))}

          {isThinking && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex items-start gap-3">
              <ForgeAvatar />
              <div className="bg-amber-50 border border-amber-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {isForging && <ForgingAnimation />}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Describe what you want to build..."
            disabled={isThinking || isForging}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isThinking || isForging}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ForgeAvatar() {
  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
      <Flame className="h-4 w-4 text-white" />
    </div>
  );
}

function WelcomeScreen({ onTemplate }: { onTemplate: (t: typeof WELCOME_TEMPLATES[0]) => void }) {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-amber-200/50">
        <Flame className="h-9 w-9 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to Forge</h2>
      <p className="text-muted-foreground mb-1">
        I'll build your AI calling agent in about 2 minutes.
      </p>
      <p className="text-muted-foreground mb-8">
        Just answer a few questions about your business and what you want your agent to do.
      </p>
      <p className="text-sm font-medium text-foreground mb-4">
        Pick a starting point, or just tell me what you need:
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {WELCOME_TEMPLATES.map((t) => (
          <button
            key={t.title}
            onClick={() => onTemplate(t)}
            className={`flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl text-left hover:border-amber-300 hover:shadow-md hover:shadow-amber-100/50 transition-all ${
              t.title === "Something" ? "col-span-2 justify-center" : ""
            }`}
          >
            <span className="text-xl">{t.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.subtitle}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onQuickReply,
  isLast,
}: {
  message: ChatMessage;
  onQuickReply: (label: string) => void;
  isLast: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  // Parse content: extract quick replies and summary cards
  const { textParts, quickReplies, summaryCard } = parseForgeMessage(message.content);

  return (
    <div className="flex items-start gap-3">
      <ForgeAvatar />
      <div className="max-w-[80%] space-y-3">
        {summaryCard && <SummaryCard content={summaryCard} />}
        {textParts && (
          <div className="bg-amber-50/80 border border-amber-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground whitespace-pre-wrap">
            {textParts}
          </div>
        )}
        {isLast && quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((label, i) => (
              <button
                key={i}
                onClick={() => onQuickReply(label)}
                className="inline-flex items-center px-3.5 py-2 bg-card border border-border rounded-full text-sm font-medium text-foreground hover:bg-amber-50 hover:border-amber-300 hover:shadow-sm transition-all"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ content }: { content: string }) {
  const lines = content.split("\n").filter(Boolean);
  return (
    <div className="bg-card border border-amber-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 flex items-center gap-2">
        <Flame className="h-4 w-4 text-white" />
        <span className="text-sm font-bold text-white">FORGE — AGENT SUMMARY</span>
      </div>
      <div className="px-4 py-3 space-y-1">
        {lines.map((line, i) => {
          const colonIdx = line.indexOf(":");
          if (colonIdx > 0 && colonIdx < 20) {
            const label = line.slice(0, colonIdx).trim();
            const value = line.slice(colonIdx + 1).trim();
            return (
              <div key={i} className="flex gap-2 text-sm">
                <span className="font-semibold text-muted-foreground min-w-[90px]">{label}:</span>
                <span className="text-foreground">{value}</span>
              </div>
            );
          }
          return (
            <p key={i} className="text-sm text-foreground">{line}</p>
          );
        })}
      </div>
    </div>
  );
}

function ForgingAnimation() {
  return (
    <div className="flex items-start gap-3">
      <ForgeAvatar />
      <div className="bg-amber-50/80 border border-amber-100 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <Flame className="h-5 w-5 text-amber-500 animate-pulse" />
          <span className="text-sm font-medium text-foreground">Forging your agent...</span>
        </div>
      </div>
    </div>
  );
}

function parseForgeMessage(content: string) {
  const quickReplies: string[] = [];
  let summaryCard: string | null = null;

  // Extract summary card
  const summaryMatch = content.match(/---SUMMARY---([\s\S]*?)---END SUMMARY---/);
  if (summaryMatch) {
    summaryCard = summaryMatch[1].trim();
    content = content.replace(/---SUMMARY---[\s\S]*?---END SUMMARY---/, "").trim();
  }

  // Extract quick replies [like this]
  const parts = content.split(/(\[.+?\])/g);
  const textChunks: string[] = [];

  parts.forEach((part) => {
    const btnMatch = part.match(/^\[(.+?)\]$/);
    if (btnMatch) {
      quickReplies.push(btnMatch[1]);
    } else {
      textChunks.push(part);
    }
  });

  const textParts = textChunks.join("").trim();

  return { textParts: textParts || null, quickReplies, summaryCard };
}
