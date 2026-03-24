import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, RotateCcw, Bot, User, FlaskConical, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AgentTestPanelProps {
  agentId: string;
  agentName: string;
  greetingScript: string;
  onClose?: () => void;
  /** Pre-fill a user message to send right after the greeting */
  autoSendMessage?: string;
}

const QUICK_TESTS = [
  "I'm not interested",
  "I already have coverage",
  "Is this a scam?",
  "I'm busy right now",
  "Yes, tell me more",
  "Can I book an appointment?",
];

const MOODS = [
  { value: "neutral", label: "Neutral" },
  { value: "interested", label: "Interested" },
  { value: "skeptical", label: "Skeptical" },
  { value: "busy", label: "Busy" },
  { value: "hostile", label: "Hostile" },
];

export function AgentTestPanel({ agentId, agentName, greetingScript, onClose, autoSendMessage }: AgentTestPanelProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contactName, setContactName] = useState("John Martinez");
  const [mood, setMood] = useState("neutral");
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSendDone = useRef(false);

  // Auto-start: send greeting on mount
  useEffect(() => {
    if (!initialized && agentId && agentId !== "new") {
      const greeting = greetingScript
        .replace(/\[Contact Name\]/gi, contactName)
        .replace(/\[Agent Name\]/gi, agentName)
        .replace(/\[Company\]/gi, "");
      setMessages([{ role: "assistant", content: greeting }]);
      setInitialized(true);
    }
  }, [agentId, initialized, greetingScript, contactName, agentName]);

  // Auto-send message (for "Test This Objection" flow)
  useEffect(() => {
    if (initialized && autoSendMessage && !autoSendDone.current && messages.length === 1) {
      autoSendDone.current = true;
      sendMessage(autoSendMessage);
    }
  }, [initialized, autoSendMessage, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("test-agent-chat", {
        body: {
          agent_id: agentId,
          messages: updated.map(m => ({ role: m.role, content: m.content })),
          simulate_as: { name: contactName, mood },
        },
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      toast({ title: "Test failed", description: err.message || "Could not get agent response", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    autoSendDone.current = false;
    setInitialized(false);
    setMessages([]);
    setTimeout(() => {
      const greeting = greetingScript
        .replace(/\[Contact Name\]/gi, contactName)
        .replace(/\[Agent Name\]/gi, agentName)
        .replace(/\[Company\]/gi, "");
      setMessages([{ role: "assistant", content: greeting }]);
      setInitialized(true);
    }, 0);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Test Agent</span>
          <Badge variant="secondary" className="text-[10px]">Chat</Badge>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Simulate As */}
      <div className="p-3 border-b space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Caller name</Label>
            <Input
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              className="h-8 text-xs"
              placeholder="John Martinez"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Mood</Label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOODS.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              )}
              <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 items-center">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-3 w-3 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Tests */}
      <div className="px-3 py-2 border-t">
        <p className="text-[10px] text-muted-foreground mb-1.5">Quick tests</p>
        <div className="flex flex-wrap gap-1">
          {QUICK_TESTS.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="text-[10px] px-2 py-1 rounded-full border bg-background hover:bg-secondary text-muted-foreground transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Type as the caller..."
          className="h-9 text-sm"
          disabled={loading}
        />
        <Button size="sm" className="h-9 px-3" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 flex justify-between items-center">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetChat}>
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
        <span className="text-[10px] text-muted-foreground">Free • Unlimited</span>
      </div>
    </div>
  );
}
