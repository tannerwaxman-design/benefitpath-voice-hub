import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Send, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useCreateAgent } from "@/hooks/use-agents";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const TEMPLATES = [
  { label: "📞 Medicare AEP Caller", prompt: "I want to build a Medicare AEP outbound caller that books appointments during the Annual Enrollment Period." },
  { label: "🔄 Enrollment Follow-Up", prompt: "I want to build an agent that follows up with people who started enrollment but didn't finish." },
  { label: "📋 Policy Renewal Reminder", prompt: "I want to build an agent that calls existing clients to remind them about upcoming policy renewals." },
  { label: "📞 Inbound Receptionist", prompt: "I want to build an inbound receptionist that answers calls to my office and routes them appropriately." },
  { label: "✏️ Something else", prompt: "I want to build a custom voice agent. Let me describe what I need." },
];

const FORGE_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/forge-chat`;

export default function Forge() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isForging, setIsForging] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const createAgent = useCreateAgent();

  // Restore from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("forgeMessages");
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Persist to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("forgeMessages", JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleReset = () => {
    if (messages.length > 0) {
      setShowResetDialog(true);
    }
  };

  const confirmReset = () => {
    setMessages([]);
    sessionStorage.removeItem("forgeMessages");
    setShowResetDialog(false);
    setInput("");
  };

  const extractAndCreateAgent = useCallback(async (fullContent: string) => {
    const jsonMatch = fullContent.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) return;

    try {
      const config = JSON.parse(jsonMatch[1]);
      setIsForging(true);

      // Add forging message
      setMessages(prev => [...prev, { role: "assistant", content: "🔥 Forging your agent..." }]);

      await new Promise(r => setTimeout(r, 2000));

      createAgent.mutate(config, {
        onSuccess: (data) => {
          setIsForging(false);
          const agentName = config.agent_name || "Your agent";
          setMessages(prev => {
            // Remove the "forging" message and add success
            const filtered = prev.filter(m => m.content !== "🔥 Forging your agent...");
            return [...filtered, {
              role: "assistant",
              content: `✅ **${agentName} is forged and ready!**\n\nYour agent is live and can start making calls right now. What do you want to do next?\n\n[📞 Test call — call my phone]\n[📋 Start a campaign]\n[✏️ Fine-tune in editor]\n[🔥 Forge another agent]`,
            }];
          });
        },
        onError: (err) => {
          setIsForging(false);
          setMessages(prev => {
            const filtered = prev.filter(m => m.content !== "🔥 Forging your agent...");
            return [...filtered, {
              role: "assistant",
              content: `Something went wrong while forging: ${err.message}\n\nWant me to try again?\n\n[Try again]\n[Open manual editor]`,
            }];
          });
        },
      });
    } catch (e) {
      console.error("Failed to parse agent config:", e);
    }
  }, [createAgent]);

  const streamChat = useCallback(async (allMessages: ChatMessage[]) => {
    setIsStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const resp = await fetch(FORGE_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && !last.content.startsWith("✅") && !last.content.startsWith("🔥 Forging")) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                return prev.map((m, i) => i === prev.length - 1 && m.role === "assistant" ? { ...m, content: assistantContent } : m);
              });
            }
          } catch { /* ignore */ }
        }
      }

      // Check for agent config JSON in the response
      // Clean the JSON block from displayed message
      const cleanContent = assistantContent.replace(/```json\n[\s\S]*?\n```/, "").trim();
      if (cleanContent !== assistantContent) {
        setMessages(prev => prev.map((m, i) => i === prev.length - 1 && m.role === "assistant" ? { ...m, content: cleanContent } : m));
      }

      // Extract and create agent if JSON found
      await extractAndCreateAgent(assistantContent);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      toast({ title: "Forge error", description: errorMessage, variant: "destructive" });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Something went wrong. Let me try that again. Can you repeat what you said?",
      }]);
    }

    setIsStreaming(false);
  }, [toast, extractAndCreateAgent]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming || isForging) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");

    // Handle post-creation navigation actions
    const lower = text.trim().toLowerCase();
    if (lower.includes("start a campaign")) {
      navigate("/campaigns/new");
      return;
    }
    if (lower.includes("fine-tune in editor") || lower.includes("open manual editor")) {
      navigate("/agents");
      return;
    }
    if (lower.includes("forge another agent")) {
      confirmReset();
      return;
    }

    await streamChat(updated);
  }, [messages, isStreaming, isForging, streamChat, navigate]);

  const playVoiceSample = async (voiceName: string) => {
    const voiceMap: Record<string, string> = {
      aria: "9BWtsMINqrJLrRacOk9x",
      marcus: "CwhRBWXzGAHq8TQ4Fs17",
      elena: "EXAVITQu4vr4xnSDxMaL",
      devon: "IKne3meq5aSn9XLyUdCD",
      nina: "XB0fDUnXU5powFXDhCwa",
      carter: "SAz9YHcvj6GT2YYXdXww",
    };

    const key = voiceName.toLowerCase().split("—")[0].trim().split(" ").pop() || "";
    const voiceId = voiceMap[key.toLowerCase()];
    if (!voiceId) return;

    setPlayingVoice(key);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke("tts-preview", {
        body: { text: "Hi, this is a quick preview of how I sound. I look forward to helping your clients!", voice_id: voiceId },
      });

      if (resp.error) throw resp.error;

      const blob = new Blob([resp.data], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      if (audioRef.current) { audioRef.current.pause(); }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingVoice(null);
      audio.play();
    } catch {
      toast({ title: "Couldn't play voice sample", variant: "destructive" });
      setPlayingVoice(null);
    }
  };

  const renderContent = (content: string) => {
    // Split content into text parts and button parts
    const parts = content.split(/(\[.+?\])/g);

    const textParts: string[] = [];
    const buttons: string[] = [];

    parts.forEach(part => {
      const btnMatch = part.match(/^\[(.+?)\]$/);
      if (btnMatch) {
        buttons.push(btnMatch[1]);
      } else {
        textParts.push(part);
      }
    });

    const textContent = textParts.join("").trim();

    return (
      <div>
        {textContent && (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2">
            <ReactMarkdown>{textContent}</ReactMarkdown>
          </div>
        )}
        {buttons.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {buttons.map((label, i) => {
              const hasPlay = label.startsWith("▶");
              const cleanLabel = label.replace("▶ ", "");

              return (
                <button
                  key={i}
                  onClick={() => sendMessage(cleanLabel)}
                  disabled={isStreaming || isForging}
                  className="inline-flex items-center px-4 py-2 bg-card border border-border rounded-full text-sm font-medium text-foreground hover:bg-forge/10 hover:border-forge transition-all disabled:opacity-50"
                >
                  {hasPlay && (
                    <Volume2
                      className="mr-2 h-4 w-4 text-forge cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        playVoiceSample(cleanLabel);
                      }}
                    />
                  )}
                  {cleanLabel}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-8 -my-6">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-forge to-forge-glow flex items-center justify-center">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Forge</h1>
            <p className="text-xs text-muted-foreground">Build your AI agent through conversation</p>
          </div>
        </div>
        {hasMessages && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Start Over
          </Button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-muted/30">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto px-8 py-6"
        >
          <div className="max-w-3xl mx-auto space-y-4">
            {!hasMessages && (
              /* Welcome screen */
              <div className="flex flex-col items-center text-center pt-12 pb-8">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-forge to-forge-glow flex items-center justify-center mb-6 shadow-lg shadow-forge/20">
                  <Flame className="h-9 w-9 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to Forge</h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  I'll build your AI calling agent in about 2 minutes. Just answer a few questions about your business and what you want your agent to do.
                </p>
                <p className="text-sm font-medium text-foreground mb-4">
                  Pick a starting point, or just tell me what you need:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => sendMessage(t.prompt)}
                      className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl text-left text-sm font-medium text-foreground hover:border-forge hover:shadow-md hover:shadow-forge/10 transition-all"
                    >
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-forge to-forge-glow flex items-center justify-center mr-3 mt-1 shrink-0">
                    <Flame className="h-4 w-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-forge/5 border border-forge/10 text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? renderContent(msg.content) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isStreaming && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-forge to-forge-glow flex items-center justify-center mr-3 mt-1 shrink-0">
                  <Flame className="h-4 w-4 text-white" />
                </div>
                <div className="bg-forge/5 border border-forge/10 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 bg-forge/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 bg-forge/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 bg-forge/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Forging animation */}
            {isForging && (
              <div className="flex justify-start">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-forge to-forge-glow flex items-center justify-center mr-3 mt-1 shrink-0 animate-pulse">
                  <Flame className="h-4 w-4 text-white" />
                </div>
                <div className="bg-forge/5 border border-forge/10 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-32 bg-forge/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-forge to-forge-glow rounded-full animate-forge-progress" />
                    </div>
                    <span className="text-sm text-forge font-medium">Forging...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-8 py-4 border-t border-border bg-card">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Describe what you want to build..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-forge/50 focus:border-forge min-h-[44px] max-h-[120px]"
              disabled={isStreaming || isForging}
            />
            <Button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming || isForging}
              className="h-11 w-11 rounded-xl bg-gradient-to-r from-forge to-forge-glow hover:opacity-90 shrink-0"
              size="icon"
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Reset confirmation */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current progress will be lost. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset} className="bg-forge hover:bg-forge/90">
              Start Over
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
