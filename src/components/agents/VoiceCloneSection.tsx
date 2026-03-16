import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Play, Pause, RotateCcw, Check, Loader2, Lock } from "lucide-react";

const SAMPLE_SCRIPT = `"Hi, thank you for calling Benefits First Insurance Group. My name is Tanner and I'm here to help you with your benefits and coverage options. Whether you're looking at Medicare Advantage, a supplement plan, or prescription drug coverage, I can walk you through everything and help you find the best fit. I look forward to speaking with you."`;

const MIN_DURATION = 20;
const TARGET_DURATION = 30;

type CloneStatus = "idle" | "recording" | "recorded" | "processing" | "ready" | "error";

interface VoiceCloneSectionProps {
  voiceSource: "preset" | "cloned";
  onVoiceSourceChange: (source: "preset" | "cloned") => void;
  clonedVoiceId: string | null;
  onClonedVoiceId: (id: string) => void;
  cloneStatus: string | null;
  agentId?: string;
  plan?: string;
}

export function VoiceCloneSection({
  voiceSource,
  onVoiceSourceChange,
  clonedVoiceId,
  onClonedVoiceId,
  cloneStatus: initialCloneStatus,
  agentId,
  plan = "voice_ai_starter",
}: VoiceCloneSectionProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<CloneStatus>(
    initialCloneStatus === "ready" && clonedVoiceId ? "ready" : "idle"
  );
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isEnterprise = plan === "enterprise" || plan === "voice_ai_pro" || plan === "voice_ai_enterprise";

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
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
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

      // Set up analyser for waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };

      mediaRecorder.start(250);
      setStatus("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          if (next >= TARGET_DURATION) {
            stopRecording();
          }
          return next;
        });
      }, 1000);

      drawWaveform();
    } catch (err) {
      toast({
        title: "Microphone access required",
        description: "Please allow microphone access to record your voice.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setStatus("recorded");
  };

  const playAudio = () => {
    if (!audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  };

  const pauseAudio = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const reRecord = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setStatus("idle");
    setProcessingProgress(0);
  };

  const submitVoiceClone = async () => {
    if (!audioBlob) return;

    setStatus("processing");
    setProcessingProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice-sample.webm");
      formData.append("voice_name", "My Voice Clone");
      if (agentId && agentId !== "new") {
        formData.append("agent_id", agentId);
      }

      const { data, error } = await supabase.functions.invoke("clone-voice", {
        body: formData,
      });

      clearInterval(progressInterval);

      if (error) throw error;

      setProcessingProgress(100);
      onClonedVoiceId(data.voice_id);
      onVoiceSourceChange("cloned");
      setStatus("ready");

      toast({ title: "Voice clone created!", description: "Your AI agent will now sound like you." });
    } catch (err) {
      clearInterval(progressInterval);
      setStatus("error");
      toast({
        title: "Voice cloning failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      {/* Voice source toggle */}
      <div className="space-y-2">
        <button
          onClick={() => onVoiceSourceChange("cloned")}
          disabled={!isEnterprise}
          className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
            voiceSource === "cloned"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/30"
          } ${!isEnterprise ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <Mic className={`h-5 w-5 shrink-0 ${voiceSource === "cloned" ? "text-primary" : "text-muted-foreground"}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">Use my own voice</p>
              {!isEnterprise && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <Lock className="h-3 w-3" /> Enterprise
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Record a short sample and the AI will sound like you.</p>
          </div>
          {voiceSource === "cloned" && <Check className="h-4 w-4 text-primary" />}
        </button>

        <button
          onClick={() => onVoiceSourceChange("preset")}
          className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
            voiceSource === "preset"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/30"
          }`}
        >
          <div className="h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${voiceSource === 'preset' ? 'border-primary' : 'border-muted-foreground'}">
            {voiceSource === "preset" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Choose a preset voice</p>
            <p className="text-xs text-muted-foreground">Pick from our library of professional AI voices.</p>
          </div>
          {voiceSource === "preset" && <Check className="h-4 w-4 text-primary" />}
        </button>
      </div>

      {/* Voice cloning UI */}
      {voiceSource === "cloned" && isEnterprise && (
        <Card className="border-primary/20">
          <CardContent className="p-6">
            {/* IDLE STATE */}
            {status === "idle" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Record Your Voice</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Read the following script out loud in your normal speaking voice. Speak naturally — this is how your AI agent will sound on calls.
                </p>
                <div className="p-4 rounded-lg bg-secondary border border-border">
                  <p className="text-sm text-foreground italic leading-relaxed">{SAMPLE_SCRIPT}</p>
                </div>
                <Button onClick={startRecording} className="w-full gap-2" size="lg">
                  <Mic className="h-4 w-4" /> Start Recording
                </Button>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Tips for a great recording:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                    <li>Use a quiet room with no background noise</li>
                    <li>Hold your phone or sit near your microphone</li>
                    <li>Speak at your normal pace — don't rush</li>
                    <li>Smile while you speak — it comes through in your voice</li>
                  </ul>
                </div>
              </div>
            )}

            {/* RECORDING STATE */}
            {status === "recording" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                    </span>
                    <span className="text-sm font-medium text-foreground">Recording...</span>
                  </div>
                  <span className="text-lg font-mono text-foreground">{formatTime(duration)}</span>
                </div>

                <canvas ref={canvasRef} width={500} height={80} className="w-full h-20 rounded-lg" />

                {duration < MIN_DURATION && (
                  <p className="text-xs text-muted-foreground">
                    Keep going — need at least {MIN_DURATION - duration}s more
                  </p>
                )}

                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={duration < MIN_DURATION}
                >
                  <Square className="h-4 w-4" /> Stop Recording
                </Button>
              </div>
            )}

            {/* RECORDED STATE */}
            {status === "recorded" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-success" />
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

                <p className="text-sm text-muted-foreground">
                  Sound good? Your voice clone will be ready in about 2 minutes.
                </p>

                <Button onClick={submitVoiceClone} className="w-full gap-2" size="lg">
                  <Mic className="h-4 w-4" /> Submit & Create My Voice
                </Button>
              </div>
            )}

            {/* PROCESSING STATE */}
            {status === "processing" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <h3 className="font-semibold text-foreground">Creating your voice clone...</h3>
                </div>
                <Progress value={processingProgress} className="h-3" />
                <p className="text-sm text-muted-foreground">
                  This usually takes 1-2 minutes. You can leave this page and we'll notify you when it's ready.
                </p>
              </div>
            )}

            {/* READY STATE */}
            {status === "ready" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                    <Check className="h-5 w-5 text-success" />
                  </div>
                  <h3 className="font-semibold text-foreground">Your voice clone is ready!</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your AI agent will now use your cloned voice on all calls.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={reRecord} className="gap-1">
                    <RotateCcw className="h-3 w-3" /> Re-record
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onVoiceSourceChange("preset")} className="gap-1">
                    Switch to Preset Voice
                  </Button>
                </div>
              </div>
            )}

            {/* ERROR STATE */}
            {status === "error" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <span className="text-destructive font-bold">!</span>
                  </div>
                  <h3 className="font-semibold text-foreground">Voice cloning failed</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Something went wrong. Please try recording again.
                </p>
                <Button variant="outline" onClick={reRecord} className="gap-1">
                  <RotateCcw className="h-3 w-3" /> Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
