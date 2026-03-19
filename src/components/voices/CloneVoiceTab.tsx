import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, Square, RotateCcw, Check, Loader2, Lock } from "lucide-react";
import { TtsTestBox } from "./TtsTestBox";

const MIN_DURATION = 15;
const MAX_DURATION = 60;
const MIN_RECORDING_SIZE_BYTES = 10 * 1024;

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

  const agentName = user?.email?.split("@")[0]?.replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Tanner";
  const companyName = user?.tenant?.company_name || "Benefits First Insurance Group";

  const script = useMemo(() =>
    `Hi, thank you for calling ${companyName}. My name is ${agentName} and I'm here to help you with your benefits and coverage options. Whether you're looking at Medicare Advantage, a supplement plan, or prescription drug coverage, I can walk you through everything and help you find the best fit. I look forward to speaking with you.`,
    [agentName, companyName]
  );

  const [status, setStatus] = useState<CloneStatus>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [clonedVoice, setClonedVoice] = useState<ClonedVoiceInfo | null>(null);
  const [isFinalizingRecording, setIsFinalizingRecording] = useState(false);
  const [recordedDurationSeconds, setRecordedDurationSeconds] = useState<number | null>(null);
  const [recordingSizeBytes, setRecordingSizeBytes] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mimeTypeRef = useRef<string>("");

  // Check for existing cloned voice
  useEffect(() => {
    const checkExisting = async () => {
      const { data } = await supabase
        .from("voices")
        .select("*")
        .eq("type", "cloned")
        .limit(1);
      if (data && data.length > 0) {
        const v = data[0];
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
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close();
      }
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
      ctx.fillStyle = "hsl(var(--secondary))";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "hsl(var(--primary))";
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
  const validateRecordedAudio = useCallback((blob: Blob) => new Promise<{ url: string; duration: number }>((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = document.createElement("audio");

    // WebM blobs from MediaRecorder often report Infinity or 0 for duration
    // in loadedmetadata. We rely on blob size (≥10KB) as the primary validation
    // and treat duration as best-effort metadata.
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      audio.onloadedmetadata = null;
      audio.onerror = null;
      const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      resolve({ url, duration: dur });
    };

    audio.preload = "metadata";
    audio.src = url;
    audio.onloadedmetadata = finish;
    audio.onerror = finish;
    audio.load();

    // Fallback timeout — some browsers never fire loadedmetadata for webm
    setTimeout(finish, 2000);
  }), []);


  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone recording is not supported in this browser.");
      }

      if (typeof MediaRecorder === "undefined") {
        throw new Error("Audio recording is not supported in this browser.");
      }

      chunksRef.current = [];

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setAudioBlob(null);
      setRecordedDurationSeconds(null);
      setRecordingSizeBytes(null);
      setProcessingProgress(0);
      setIsFinalizingRecording(false);
      setStatus("idle");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const audioTracks = stream.getAudioTracks();
      console.log("Microphone access granted, tracks:", audioTracks.map((track) => ({
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
      })));

      if (audioTracks.length === 0) {
        throw new Error("No audio tracks found in the microphone stream.");
      }

      audioTracks.forEach((track) => {
        track.onmute = () => console.warn("Microphone track muted", track.label);
        track.onunmute = () => console.log("Microphone track unmuted", track.label);
        track.onended = () => console.warn("Microphone track ended", track.label);
      });

      // AudioContext only for waveform visualization
      const audioCtx = new AudioContext({ sampleRate: 44100 });
      audioCtxRef.current = audioCtx;
      if (audioCtx.state === "suspended") await audioCtx.resume();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const candidateMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType = candidateMimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      mimeTypeRef.current = mimeType || "audio/webm";
      console.log("Using MIME type:", mimeTypeRef.current);

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })
        : new MediaRecorder(stream, { audioBitsPerSecond: 128000 });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.onstart = () => {
        console.log("MediaRecorder started, state:", mediaRecorder.state);
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };

      mediaRecorder.ondataavailable = (e) => {
        console.log("Audio chunk received, size:", e.data.size, "bytes");
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        try {
          const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          console.log("MediaRecorder stopped, total chunks:", chunksRef.current.length);
          console.log("Total audio data size:", totalSize, "bytes");

          if (totalSize === 0) {
            chunksRef.current = [];
            setStatus("idle");
            toast({ title: "Recording failed", description: "No audio was captured. Please check your microphone and try again.", variant: "destructive" });
            return;
          }

          const recordedBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || mimeTypeRef.current || "audio/webm" });
          chunksRef.current = [];
          console.log("Final audio blob size:", recordedBlob.size, "bytes, type:", recordedBlob.type);

          if (recordedBlob.size < MIN_RECORDING_SIZE_BYTES) {
            setStatus("idle");
            toast({ title: "Recording too small", description: "The recording was too short or empty. Please try again and speak clearly into your microphone.", variant: "destructive" });
            return;
          }

          const { url, duration: detectedDuration } = await validateRecordedAudio(recordedBlob);
          setAudioBlob(recordedBlob);
          setRecordedDurationSeconds(detectedDuration);
          setRecordingSizeBytes(recordedBlob.size);
          setAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
          setStatus("recorded");
          console.log("Audio is playable, duration:", detectedDuration, "seconds");
        } catch (error) {
          console.error("Recorded audio validation failed", error);
          setStatus("idle");
          toast({
            title: "Recording failed",
            description: error instanceof Error ? error.message : "The recording could not be validated. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsFinalizingRecording(false);
          stream.getTracks().forEach((t) => t.stop());
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
          if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
            await audioCtxRef.current.close();
          }
        }
      };

      mediaRecorder.start(1000);
      console.log("Recording started successfully");
      setStatus("recording");
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          if (next >= MAX_DURATION) stopRecording();
          return next;
        });
      }, 1000);
      drawWaveform();
    } catch (error) {
      console.error("Voice recording failed to start", error);
      setStatus("idle");
      setIsFinalizingRecording(false);
      toast({
        title: "Microphone access required",
        description: error instanceof Error ? error.message : "Please allow microphone access in your browser settings.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsFinalizingRecording(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
  };

  const reRecord = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setStatus("idle");
    setProcessingProgress(0);
    setClonedVoice(null);
    setIsFinalizingRecording(false);
    setRecordedDurationSeconds(null);
    setRecordingSizeBytes(null);
  };

  const submitVoiceClone = async () => {
    if (!audioBlob) return;
    if (audioBlob.size < MIN_RECORDING_SIZE_BYTES) {
      toast({ title: "Recording too small", description: "Please record a longer sample before submitting.", variant: "destructive" });
      return;
    }
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
      const fileExtension = audioBlob.type.includes("wav") ? "wav" : audioBlob.type.includes("mp4") ? "m4a" : audioBlob.type.includes("ogg") ? "ogg" : "webm";
      console.log("Submitting audio for cloning, blob size:", audioBlob.size, "type:", audioBlob.type);
      formData.append("audio", audioBlob, `voice-sample.${fileExtension}`);
      formData.append("voice_name", companyName ? `${companyName} Voice` : "My Voice Clone");

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clone-voice`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: formData,
        }
      );

      clearInterval(progressInterval);
      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(errBody || `Clone failed (${response.status})`);
      }

      const data = await response.json();
      console.log("Clone response:", data);
      setProcessingProgress(100);

      const { data: voiceRow, error: insertError } = await supabase
        .from("voices")
        .insert({
          tenant_id: user!.tenant.id,
          name: companyName ? `${companyName} Voice` : "My Voice",
          type: "cloned",
          provider: "eleven_labs",
          provider_voice_id: data.voice_id,
          clone_status: "ready",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setClonedVoice({ id: voiceRow!.id, name: voiceRow!.name, provider_voice_id: voiceRow!.provider_voice_id, created_at: voiceRow!.created_at });
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
    await supabase.from("voices").delete().eq("id", clonedVoice.id);
    setClonedVoice(null);
    setStatus("idle");
    queryClient.invalidateQueries({ queryKey: ["voices"] });
    toast({ title: "Voice clone deleted" });
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const formatBytes = (bytes: number) => bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    : `${Math.round(bytes / 1024)} KB`;

  // ── Gate: Enterprise only ──
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

  // ── Existing clone: show test interface ──
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
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Mic className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Clone Your Voice</h3>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-1">
              <p className="text-sm text-foreground font-medium">
                Read the script below in your normal speaking voice (~20-30 seconds).
              </p>
              <p className="text-sm text-muted-foreground">
                Speak naturally, like you would on a real phone call with a client.
              </p>
            </div>

            {/* Script */}
            <div className="p-5 rounded-lg bg-secondary border border-border">
              <p className="text-foreground leading-relaxed" style={{ fontSize: "18px", lineHeight: 1.7 }}>
                "{script}"
              </p>
            </div>

            {/* Recording tips */}
            <div className="space-y-3 p-4 rounded-lg border border-border bg-secondary/30">
              <p className="text-sm font-semibold text-foreground">📋 Quick Tips</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">✅ DO:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                    <li>Record in the quietest room available</li>
                    <li>Use earbuds with a mic or sit close to your laptop</li>
                    <li>Speak at a normal conversational volume</li>
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">❌ DON'T:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                    <li>Record in a noisy environment</li>
                    <li>Use speakerphone</li>
                    <li>Whisper or rush through the script</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button onClick={startRecording} className="w-full gap-2" size="lg">
              <Mic className="h-4 w-4" /> I'm Ready — Start Recording
            </Button>
          </div>
        )}

        {/* RECORDING */}
        {status === "recording" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                </span>
                <span className="text-sm font-medium text-destructive">
                  {isFinalizingRecording ? "Saving recording..." : "Recording..."}
                </span>
              </div>
              <span className="text-lg font-mono text-foreground">{formatTime(duration)}</span>
            </div>

            {/* Script visible while recording */}
            <div className="p-5 rounded-lg bg-primary/5 border border-primary/30">
              <p className="text-foreground leading-relaxed" style={{ fontSize: "18px", lineHeight: 1.7 }}>
                "{script}"
              </p>
            </div>

            <canvas ref={canvasRef} width={500} height={60} className="w-full h-14 rounded-lg" />

            {!isFinalizingRecording && duration < MIN_DURATION && (
              <p className="text-xs text-muted-foreground">Keep going — need at least {MIN_DURATION - duration}s more</p>
            )}

            <Button onClick={stopRecording} variant="destructive" className="w-full gap-2" disabled={duration < MIN_DURATION || isFinalizingRecording}>
              <Square className="h-4 w-4" /> {isFinalizingRecording ? "Saving recording..." : "Stop Recording"}
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
            {audioUrl && (
              <audio controls src={audioUrl} className="w-full" preload="metadata" />
            )}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {recordedDurationSeconds !== null && <span>Detected length: {recordedDurationSeconds.toFixed(1)}s</span>}
              {recordingSizeBytes !== null && <span>File size: {formatBytes(recordingSizeBytes)}</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reRecord} className="gap-1">
                <RotateCcw className="h-3 w-3" /> Re-record
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Listen to the recording first. If it sounds wrong or silent, re-record before creating the clone.</p>
            <Button onClick={submitVoiceClone} className="w-full gap-2" size="lg" disabled={!audioBlob || audioBlob.size < MIN_RECORDING_SIZE_BYTES}>
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
              This takes 1-2 minutes. You can leave this page and come back.
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
