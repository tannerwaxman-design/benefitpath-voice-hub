import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, Square, Play, Pause, RotateCcw, Check, Loader2, PartyPopper, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TtsTestBox } from "./TtsTestBox";
import { VoiceWithCollection } from "@/hooks/use-voice-management";

const SAMPLE_SCRIPT = `"Hi, thank you for calling Benefits First Insurance Group. My name is Tanner and I'm here to help you with your benefits and coverage options. Whether you're looking at Medicare Advantage, a supplement plan, or prescription drug coverage, I can walk you through everything and help you find the best fit. I look forward to speaking with you."`;

const MIN_DURATION = 20;
const TARGET_DURATION = 30;

type CloneStatus = "idle" | "recording" | "recorded" | "processing" | "ready" | "error";

interface ClonedVoiceInfo {
  id: string;
  name: string;
  provider_voice_id: string;
  created_at: string;
}

export function CloneVoiceTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const plan = user?.tenant?.plan || "voice_ai_starter";
  const isEnterprise = plan === "enterprise" || plan === "voice_ai_pro" || plan === "voice_ai_enterprise";

  const [status, setStatus] = useState<CloneStatus>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [clonedVoice, setClonedVoice] = useState<ClonedVoiceInfo | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check for existing cloned voice
  useEffect(() => {
    const checkExisting = async () => {
      const { data } = await supabase
        .from("voices" as any)
        .select("*")
        .eq("type", "cloned")
        .limit(1);
      if (data && data.length > 0) {
        const v = data[0] as any;
        setClonedVoice({ id: v.id, name: v.name, provider_voice_id: v.provider_voice_id, created_at: v.created_at });
        setStatus("ready");
      }
    };
    checkExisting();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [audioUrl]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      ctx.fillStyle = "hsl(210, 40%, 98%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "hsl(239, 84%, 67%)";
      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
      mediaRecorder.start(250);
      setStatus("recording");
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          if (next >= TARGET_DURATION) stopRecording();
          return next;
        });
      }, 1000);
      drawWaveform();
    } catch {
      toast({ title: "Microphone access required", description: "Please allow microphone access.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
    setStatus("recorded");
  };

  const playAudio = () => {
    if (!audioUrl) return;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  };

  const pauseAudio = () => { audioRef.current?.pause(); setIsPlaying(false); };

  const reRecord = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setStatus("idle");
    setProcessingProgress(0);
    setClonedVoice(null);
  };

  const submitVoiceClone = async () => {
    if (!audioBlob) return;
    setStatus("processing");
    setProcessingProgress(0);
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice-sample.webm");
      formData.append("voice_name", user?.tenant?.company_name ? `${user.tenant.company_name} Voice` : "My Voice Clone");

      const { data, error } = await supabase.functions.invoke("clone-voice", { body: formData });
      clearInterval(progressInterval);
      if (error) throw error;

      setProcessingProgress(100);

      // Save to voices table
      const { data: voiceRow, error: insertError } = await supabase
        .from("voices" as any)
        .insert({
          tenant_id: user!.tenant.id,
          name: user?.tenant?.company_name ? `${user.tenant.company_name} Voice` : "My Voice",
          type: "cloned",
          provider: "eleven_labs",
          provider_voice_id: data.voice_id,
          clone_status: "ready",
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      const v = voiceRow as any;
      setClonedVoice({ id: v.id, name: v.name, provider_voice_id: v.provider_voice_id, created_at: v.created_at });
      setStatus("ready");
      queryClient.invalidateQueries({ queryKey: ["voices"] });
      toast({ title: "Voice clone created!", description: "Your AI agent will now sound like you." });
    } catch (err) {
      clearInterval(progressInterval);
      setStatus("error");
      toast({ title: "Voice cloning failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    }
  };

  const deleteClone = async () => {
    if (!clonedVoice) return;
    await supabase.from("voices" as any).delete().eq("id", clonedVoice.id);
    setClonedVoice(null);
    setStatus("idle");
    queryClient.invalidateQueries({ queryKey: ["voices"] });
    toast({ title: "Voice clone deleted" });
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (!isEnterprise) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center space-y-4">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold text-foreground">Voice Cloning — Enterprise Feature</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Clone your own voice so your AI agent sounds exactly like you on calls. Available on Enterprise plans.
          </p>
          <Button variant="outline">Upgrade to Enterprise</Button>
        </CardContent>
      </Card>
    );
  }

  // Existing clone — show test interface
  if (status === "ready" && clonedVoice) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/20">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Your Voice Clone: "{clonedVoice.name}"</h3>
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(clonedVoice.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Test your cloned voice:</p>
              <TtsTestBox
                voiceId={clonedVoice.provider_voice_id}
                defaultText="I wanted to follow up about your benefits enrollment."
              />
            </div>

            {/* Quick phrases */}
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-muted-foreground">Try different phrases:</p>
              {[
                { label: "Quick greeting", text: "Hi, this is your agent calling from Benefits First." },
                { label: "Objection handling", text: "I completely understand your concern. A lot of my clients felt the same way, but after we reviewed their options together, they were glad they took the time." },
                { label: "Closing", text: "Thank you so much for your time today. I'll send you a confirmation email with everything we discussed." },
              ].map((phrase) => (
                <div key={phrase.label} className="p-3 rounded-lg bg-secondary/50 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{phrase.label}</p>
                  <TtsTestBox voiceId={clonedVoice.provider_voice_id} defaultText={phrase.text} compact />
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={reRecord} className="gap-1">
                <RotateCcw className="h-3 w-3" /> Re-record My Voice
              </Button>
              <Button variant="outline" size="sm" onClick={deleteClone} className="gap-1 text-destructive hover:text-destructive">
                Delete Clone
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-6">
        {/* IDLE */}
        {status === "idle" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Clone Your Voice</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Record yourself reading the script below. The AI will learn your voice and use it on calls. Takes about 30 seconds.
            </p>
            <div className="p-4 rounded-lg bg-secondary border border-border">
              <p className="text-sm text-foreground italic leading-relaxed">{SAMPLE_SCRIPT}</p>
            </div>
            <Button onClick={startRecording} className="w-full gap-2" size="lg">
              <Mic className="h-4 w-4" /> Start Recording
            </Button>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Tips before you start:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Find a quiet room with no background noise</li>
                <li>Sit close to your microphone</li>
                <li>Speak at your normal pace</li>
                <li>Smile while you speak — it comes through in your voice</li>
              </ul>
            </div>
          </div>
        )}

        {/* RECORDING — script stays visible as teleprompter */}
        {status === "recording" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                </span>
                <span className="text-sm font-medium text-destructive">Recording...</span>
              </div>
              <span className="text-lg font-mono text-foreground">{formatTime(duration)} / {formatTime(TARGET_DURATION)}</span>
            </div>
            <div className="p-5 rounded-lg bg-secondary border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Read this out loud:</p>
              <p className="text-foreground italic" style={{ fontSize: "18px", lineHeight: 1.6 }}>{SAMPLE_SCRIPT}</p>
            </div>
            <canvas ref={canvasRef} width={500} height={60} className="w-full h-14 rounded-lg" />
            {duration < MIN_DURATION && (
              <p className="text-xs text-muted-foreground">Keep going — need at least {MIN_DURATION - duration}s more</p>
            )}
            <Button onClick={stopRecording} variant="destructive" className="w-full gap-2" disabled={duration < MIN_DURATION}>
              <Square className="h-4 w-4" /> Stop Recording
            </Button>
          </div>
        )}

        {/* RECORDED */}
        {status === "recorded" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Recording Complete — {formatTime(duration)}</h3>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={isPlaying ? pauseAudio : playAudio} className="gap-1">
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {isPlaying ? "Pause" : "Play Back"}
              </Button>
              <Button variant="outline" size="sm" onClick={reRecord} className="gap-1">
                <RotateCcw className="h-3 w-3" /> Re-record
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Happy with how it sounds? Your voice clone will be ready in about 2 minutes.</p>
            <Button onClick={submitVoiceClone} className="w-full gap-2" size="lg">
              <Mic className="h-4 w-4" /> Submit & Create My Voice
            </Button>
          </div>
        )}

        {/* PROCESSING */}
        {status === "processing" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <h3 className="font-semibold text-foreground">Creating your voice clone...</h3>
            </div>
            <Progress value={processingProgress} className="h-3" />
            <p className="text-sm text-muted-foreground">
              This takes 1-2 minutes. You can leave this page and come back — we'll notify you when it's ready.
            </p>
          </div>
        )}

        {/* ERROR */}
        {status === "error" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="text-destructive font-bold">!</span>
              </div>
              <h3 className="font-semibold text-foreground">Voice cloning failed</h3>
            </div>
            <p className="text-sm text-muted-foreground">Something went wrong. Please try recording again.</p>
            <Button variant="outline" onClick={reRecord} className="gap-1">
              <RotateCcw className="h-3 w-3" /> Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
