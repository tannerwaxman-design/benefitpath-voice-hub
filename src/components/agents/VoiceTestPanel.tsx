import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mic, MicOff, Phone, PhoneOff, Bot, User, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TranscriptEntry {
  role: "assistant" | "user";
  content: string;
  timestamp?: number;
}

interface VoiceTestPanelProps {
  agentId: string;
  agentName: string;
  onClose?: () => void;
}

type CallStatus = "idle" | "connecting" | "active" | "ended";

interface StartWebTestCallResponse {
  vapi_assistant_id?: string;
  vapi_public_key?: string;
  greeting?: string;
  metadata?: Record<string, unknown>;
  webCallUrl?: string;
  web_call_url?: string;
}

export function VoiceTestPanel({ agentId, agentName, onClose }: VoiceTestPanelProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [contactName, setContactName] = useState("John Martinez");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [micAccessGranted, setMicAccessGranted] = useState<boolean | null>(null);
  const vapiRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new transcript entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (vapiRef.current) {
        try { vapiRef.current.stop(); } catch {}
      }
    };
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const checkMicAccess = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicAccessGranted(true);
      return true;
    } catch {
      setMicAccessGranted(false);
      return false;
    }
  }, []);

  const startCall = useCallback(async () => {
    const hasMic = await checkMicAccess();
    if (!hasMic) return;

    setStatus("connecting");
    setTranscript([]);
    setDuration(0);
    setMuted(false);
    setAgentSpeaking(false);

    try {
      // Get voice test session details from the backend
      const { data, error } = await supabase.functions.invoke("start-web-test-call", {
        body: { agent_id: agentId, contact_name: contactName },
      });

      if (error) throw error;
      const response = (data ?? {}) as StartWebTestCallResponse;
      const legacyWebCallUrl = response.webCallUrl || response.web_call_url;

      // Dynamically import VAPI Web SDK
      const VapiModule = await import("@vapi-ai/web");
      const Vapi = VapiModule.default;

      const publicKey = response.vapi_public_key;
      const assistantId = response.vapi_assistant_id;

      if (!publicKey && !legacyWebCallUrl) {
        throw new Error("Voice test is missing the public key from the backend.");
      }

      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      // Set up event listeners
      vapi.on("speech-start", () => setAgentSpeaking(true));
      vapi.on("speech-end", () => setAgentSpeaking(false));

      vapi.on("message", (message: any) => {
        if (message.type === "transcript" && message.transcriptType === "final") {
          setTranscript(prev => [
            ...prev,
            {
              role: message.role === "assistant" ? "assistant" : "user",
              content: message.transcript,
              timestamp: Math.floor((Date.now() - callStartTime) / 1000),
            },
          ]);
        }
      });

      vapi.on("call-end", () => {
        setStatus("ended");
        setAgentSpeaking(false);
        if (timerRef.current) clearInterval(timerRef.current);
      });

      vapi.on("error", (err: any) => {
        console.error("VAPI call error:", err);
        toast({ title: "Call error", description: "The voice call encountered an issue.", variant: "destructive" });
        setStatus("ended");
        if (timerRef.current) clearInterval(timerRef.current);
      });

      // Start the call — VAPI Web SDK creates and joins the web call client-side
      const callStartTime = Date.now();

      if (assistantId) {
        await vapi.start(assistantId, {
          firstMessage: response.greeting,
          metadata: response.metadata,
        });
      } else if (legacyWebCallUrl) {
        await vapi.start(legacyWebCallUrl);
      } else {
        throw new Error("Voice test configuration is incomplete.");
      }

      setStatus("active");

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - callStartTime) / 1000));
      }, 1000);

    } catch (err: any) {
      console.error("Failed to start voice test:", err);
      toast({
        title: "Could not start voice test",
        description: err.message || "Please ensure the agent is saved and synced.",
        variant: "destructive",
      });
      setStatus("idle");
    }
  }, [agentId, contactName, checkMicAccess, toast]);

  const endCall = useCallback(() => {
    if (vapiRef.current) {
      try { vapiRef.current.stop(); } catch {}
      vapiRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus("ended");
    setAgentSpeaking(false);
    setMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (vapiRef.current) {
      try {
        if (muted) {
          vapiRef.current.setMuted(false);
        } else {
          vapiRef.current.setMuted(true);
        }
        setMuted(!muted);
      } catch {}
    }
  }, [muted]);

  // Idle / Mic permission screen
  if (status === "idle") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Voice Test</span>
            <Badge variant="secondary" className="text-[10px]">WebRTC</Badge>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          {micAccessGranted === false && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm font-medium text-destructive">Microphone Access Denied</p>
              <p className="text-xs text-muted-foreground">
                Please allow microphone access in your browser settings to use voice testing.
              </p>
            </div>
          )}

          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold">Voice Call Test</h3>
            <p className="text-xs text-muted-foreground max-w-[260px]">
              Talk to your AI agent in real-time using your browser's microphone. 
              The agent will use its configured voice and scripts.
            </p>
          </div>

          <div className="w-full space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Your name (as the caller)</Label>
              <Input
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                className="h-8 text-xs"
                placeholder="John Martinez"
              />
            </div>
          </div>

          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-center">
            <p className="text-[11px] text-warning font-medium">
              ⚠️ Voice test calls use your balance at $0.18/min
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Chat testing is free and unlimited
            </p>
          </div>

          <Button className="w-full gap-2" onClick={startCall}>
            <Mic className="h-4 w-4" />
            Allow Microphone & Start Call
          </Button>
        </div>
      </div>
    );
  }

  // Active call / connecting / ended
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Voice Test</span>
          {status === "connecting" && (
            <Badge variant="secondary" className="text-[10px]">Connecting...</Badge>
          )}
          {status === "active" && (
            <Badge className="bg-success/20 text-success border-0 text-[10px]">
              🔴 LIVE
            </Badge>
          )}
          {status === "ended" && (
            <Badge variant="secondary" className="text-[10px]">Call Ended</Badge>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Call Info */}
      <div className="p-4 border-b text-center space-y-3">
        <p className="text-xs text-muted-foreground">
          {status === "connecting" ? "Connecting to" : "Talking to"} <span className="font-medium text-foreground">{agentName}</span>
        </p>

        {/* Waveform / Timer */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center relative">
            {status === "connecting" ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <>
                <Mic className="h-6 w-6 text-primary" />
                {agentSpeaking && (
                  <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
                )}
              </>
            )}
          </div>
          <span className="text-2xl font-mono font-semibold tabular-nums">
            {formatDuration(duration)}
          </span>
          {agentSpeaking && (
            <p className="text-xs text-primary animate-pulse">🤖 {agentName} is speaking...</p>
          )}
        </div>
      </div>

      {/* Live Transcript */}
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="p-4 space-y-3">
          {transcript.length === 0 && status === "active" && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Listening for conversation...
            </p>
          )}
          {transcript.map((entry, i) => (
            <div key={i} className={`flex gap-2 ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
              {entry.role === "assistant" && (
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              )}
              <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                entry.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>
                {entry.content}
              </div>
              {entry.role === "user" && (
                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Call Controls */}
      <div className="p-4 border-t flex justify-center gap-4">
        {status === "active" && (
          <>
            <Button
              variant={muted ? "destructive" : "outline"}
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={toggleMute}
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={endCall}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </>
        )}
        {status === "connecting" && (
          <Button variant="destructive" size="sm" onClick={endCall} className="gap-2">
            <PhoneOff className="h-4 w-4" />
            Cancel
          </Button>
        )}
        {status === "ended" && (
          <div className="text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              Call ended • {formatDuration(duration)} • {transcript.length} messages
            </p>
            <Button variant="outline" size="sm" onClick={() => { setStatus("idle"); setTranscript([]); setDuration(0); }}>
              Start New Call
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
