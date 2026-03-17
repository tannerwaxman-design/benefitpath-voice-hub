import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Mic, Square, Play, Pause, RotateCcw, Check, Loader2, Lock, ChevronRight, ChevronLeft, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TtsTestBox } from "./TtsTestBox";

// ── Script sections ──────────────────────────────────────────────
interface ScriptSection {
  id: number;
  title: string;
  text: string;
}

const buildDefaultSections = (agentName: string, companyName: string): ScriptSection[] => [
  {
    id: 1,
    title: "Warm Greeting",
    text: `Hi there, thank you so much for taking my call today. My name is ${agentName}, and I'm calling from ${companyName}. I'm reaching out because the annual enrollment period is right around the corner, and I wanted to make sure you have everything you need to make the best decision for your coverage this year. Do you have just a couple of minutes to chat?`,
  },
  {
    id: 2,
    title: "Explaining Value",
    text: `Perfect, I really appreciate that. So here's why I'm calling. A lot of folks don't realize that their plan options can change quite a bit from year to year. Premiums go up, benefits shift around, and sometimes there are brand new plans available that weren't there before. What I do is help people like you compare all the available options side by side, completely free of charge, so you can feel confident you're getting the absolute best value for your situation.`,
  },
  {
    id: 3,
    title: "Handling Pushback",
    text: `Oh, I completely understand. You know, a lot of my clients felt the exact same way at first. They figured, why fix something that isn't broken, right? But when we actually sat down and looked at the numbers together, most of them were pretty surprised to find they could save a few hundred dollars a year, or pick up benefits they didn't even know were available to them. There's really no downside to just taking a quick look. Would you be open to that?`,
  },
  {
    id: 4,
    title: "Questions & Details",
    text: `Great, that's wonderful. Let me ask you just a few quick questions so I can point you in the right direction. First off, are you currently enrolled in a Medicare Advantage plan, or are you on Original Medicare with a supplement? And do you have any prescription medications that are important to keep covered? Also, is your primary care doctor someone you'd want to make sure stays in network? These details really help me narrow down the best options for you specifically.`,
  },
  {
    id: 5,
    title: "Warm Closing",
    text: `Thank you so much for sharing all of that with me. Based on what you've told me, I think we can definitely find something that works well for you. What I'd love to do is set up a short fifteen-minute call where we can go through your options together in detail. Would Tuesday afternoon or Wednesday morning work better for you? Either way, I'll send you a confirmation email with everything we talked about today. It was really great speaking with you, and I look forward to helping you get the best coverage possible. Have a wonderful rest of your day.`,
  },
];

const SECTION_TIME_RANGES = [
  [0, 20],
  [20, 40],
  [40, 60],
  [60, 80],
  [80, 120],
] as const;

const MIN_DURATION = 30;
const MAX_DURATION = 180; // auto-stop at 3 min
const TARGET_DISPLAY = 90; // "~1:30" shown in UI

type CloneStatus = "idle" | "recording" | "recorded" | "processing" | "ready" | "error";
type RecordingMode = "full" | "section";

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

  // Derive agent name / company
  const agentName = user?.email?.split("@")[0]?.replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Tanner";
  const companyName = user?.tenant?.company_name || "Benefits First Insurance Group";

  const defaultSections = useMemo(() => buildDefaultSections(agentName, companyName), [agentName, companyName]);

  const [status, setStatus] = useState<CloneStatus>("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [clonedVoice, setClonedVoice] = useState<ClonedVoiceInfo | null>(null);

  // New state
  const [recordingMode, setRecordingMode] = useState<RecordingMode>("full");
  const [customizeScript, setCustomizeScript] = useState(false);
  const [editedSections, setEditedSections] = useState<ScriptSection[]>(defaultSections);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [sectionBlobs, setSectionBlobs] = useState<(Blob | null)[]>([null, null, null, null, null]);
  const [sectionDurations, setSectionDurations] = useState<number[]>([0, 0, 0, 0, 0]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const sections = customizeScript ? editedSections : defaultSections;

  // Sync edited sections when defaults change
  useEffect(() => { setEditedSections(defaultSections); }, [defaultSections]);

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

  const initAudioCapture = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    return { mediaRecorder, stream };
  };

  // ── Full-take recording ──
  const startRecording = async () => {
    try {
      const { mediaRecorder, stream } = await initAudioCapture();
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
          if (next >= MAX_DURATION) stopRecording();
          return next;
        });
      }, 1000);
      drawWaveform();
    } catch {
      toast({ title: "Microphone access required", description: "Please allow microphone access.", variant: "destructive" });
    }
  };

  // ── Section-by-section recording ──
  const startSectionRecording = async () => {
    try {
      const { mediaRecorder, stream } = await initAudioCapture();
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setSectionBlobs(prev => { const n = [...prev]; n[currentSectionIdx] = blob; return n; });
        stream.getTracks().forEach(t => t.stop());
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        setStatus("recorded");
      };
      mediaRecorder.start(250);
      setStatus("recording");
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          if (next >= 60) stopRecording(); // max 60s per section
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
    if (recordingMode === "full") {
      setStatus("recorded");
    }
    // section mode: onstop handler sets status
  };

  const playAudio = (url?: string) => {
    const playUrl = url || audioUrl;
    if (!playUrl) return;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(playUrl);
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
    setCurrentSectionIdx(0);
    setSectionBlobs([null, null, null, null, null]);
    setSectionDurations([0, 0, 0, 0, 0]);
  };

  // Combine section blobs for section-by-section mode
  const combineSectionBlobs = (): Blob => {
    const validBlobs = sectionBlobs.filter(Boolean) as Blob[];
    return new Blob(validBlobs, { type: "audio/webm" });
  };

  const submitVoiceClone = async () => {
    const blobToSubmit = recordingMode === "section" ? combineSectionBlobs() : audioBlob;
    if (!blobToSubmit) return;
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
      formData.append("audio", blobToSubmit, "voice-sample.webm");
      formData.append("voice_name", companyName ? `${companyName} Voice` : "My Voice Clone");

      const { data, error } = await supabase.functions.invoke("clone-voice", { body: formData });
      clearInterval(progressInterval);
      if (error) throw error;

      setProcessingProgress(100);

      const { data: voiceRow, error: insertError } = await supabase
        .from("voices" as any)
        .insert({
          tenant_id: user!.tenant.id,
          name: companyName ? `${companyName} Voice` : "My Voice",
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

  const activeSectionIdx = SECTION_TIME_RANGES.findIndex(([start, end]) => duration >= start && duration < end);

  const updateSectionText = (idx: number, text: string) => {
    setEditedSections(prev => prev.map((s, i) => i === idx ? { ...s, text } : s));
  };

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

  // ── Script display component ──
  const ScriptDisplay = ({ highlight, editable }: { highlight?: number; editable?: boolean }) => (
    <div className="space-y-1">
      {sections.map((section, idx) => {
        const isActive = highlight !== undefined && highlight === idx;
        return (
          <div
            key={section.id}
            className={`p-4 rounded-lg border transition-colors ${
              isActive
                ? "bg-primary/5 border-primary/30"
                : "bg-secondary/50 border-transparent"
            }`}
          >
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">
              Section {section.id}: {section.title}
            </p>
            {editable && customizeScript ? (
              <Textarea
                value={editedSections[idx].text}
                onChange={(e) => updateSectionText(idx, e.target.value)}
                className="text-foreground border-border bg-background min-h-[100px]"
                style={{ fontSize: "16px", lineHeight: 1.6 }}
              />
            ) : (
              <p
                className="text-foreground leading-relaxed"
                style={{ fontSize: "18px", lineHeight: 1.7 }}
              >
                "{section.text}"
              </p>
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Section-by-section flow ──
  if (recordingMode === "section" && status !== "processing" && status !== "error") {
    const currentSection = sections[currentSectionIdx];
    const currentBlob = sectionBlobs[currentSectionIdx];
    const allRecorded = sectionBlobs.every(b => b !== null);
    const isRecording = status === "recording";
    const isRecorded = currentBlob !== null && status !== "recording";

    return (
      <Card className="border-border">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Clone Your Voice — Section by Section</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setRecordingMode("full"); reRecord(); }}>
              Switch to Full Take
            </Button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {sections.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-1">
                <div className={`h-3 w-3 rounded-full border-2 transition-colors ${
                  sectionBlobs[idx] ? "bg-primary border-primary" :
                  idx === currentSectionIdx ? "border-primary bg-transparent" :
                  "border-muted-foreground/30 bg-transparent"
                }`} />
                {idx < 4 && <div className="w-6 h-px bg-border" />}
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              {sectionBlobs.filter(Boolean).length}/5 recorded
            </span>
          </div>

          {/* Current section script */}
          <div className="p-5 rounded-lg bg-secondary border border-border">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">
              Section {currentSection.id}: {currentSection.title}
            </p>
            <p className="text-foreground leading-relaxed" style={{ fontSize: "18px", lineHeight: 1.7 }}>
              "{currentSection.text}"
            </p>
          </div>

          {/* Recording indicator */}
          {isRecording && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                  </span>
                  <span className="text-sm font-medium text-destructive">Recording...</span>
                </div>
                <span className="text-lg font-mono text-foreground">{formatTime(duration)} / ~0:20</span>
              </div>
              <canvas ref={canvasRef} width={500} height={60} className="w-full h-14 rounded-lg" />
              <Button onClick={stopRecording} variant="destructive" className="w-full gap-2" disabled={duration < 5}>
                <Square className="h-4 w-4" /> Stop Recording
              </Button>
            </>
          )}

          {/* Section recorded — review */}
          {isRecorded && !isRecording && (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground">Section {currentSection.id} recorded ({formatTime(sectionDurations[currentSectionIdx] || duration)})</span>
              <Button variant="ghost" size="sm" onClick={() => {
                const url = URL.createObjectURL(currentBlob!);
                playAudio(url);
              }} className="gap-1 ml-auto">
                <Play className="h-3 w-3" /> Play
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                setSectionBlobs(prev => { const n = [...prev]; n[currentSectionIdx] = null; return n; });
                setStatus("idle");
              }} className="gap-1">
                <RotateCcw className="h-3 w-3" /> Re-record
              </Button>
            </div>
          )}

          {/* Not recorded yet & not recording */}
          {!currentBlob && !isRecording && (
            <Button onClick={startSectionRecording} className="w-full gap-2" size="lg">
              <Mic className="h-4 w-4" /> Record Section {currentSection.id}
            </Button>
          )}

          {/* Navigation */}
          {!isRecording && (
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentSectionIdx === 0}
                onClick={() => { setCurrentSectionIdx(prev => prev - 1); setStatus("idle"); }}
                className="gap-1"
              >
                <ChevronLeft className="h-3 w-3" /> Previous
              </Button>
              {currentSectionIdx < 4 ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!currentBlob}
                  onClick={() => {
                    setSectionDurations(prev => { const n = [...prev]; n[currentSectionIdx] = duration; return n; });
                    setCurrentSectionIdx(prev => prev + 1);
                    setStatus("idle");
                    setDuration(0);
                  }}
                  className="gap-1"
                >
                  Next <ChevronRight className="h-3 w-3" />
                </Button>
              ) : allRecorded ? (
                <Button onClick={submitVoiceClone} className="gap-2">
                  <Mic className="h-4 w-4" /> Submit & Create My Voice
                </Button>
              ) : null}
            </div>
          )}

          {/* All sections done — final review */}
          {allRecorded && !isRecording && (
            <div className="pt-3 border-t border-border space-y-3">
              <p className="text-sm font-medium text-foreground">All sections recorded! Review your combined audio before submitting.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const combined = combineSectionBlobs();
                  const url = URL.createObjectURL(combined);
                  playAudio(url);
                }} className="gap-1">
                  <Play className="h-3 w-3" /> Play Combined Audio
                </Button>
                <Button variant="outline" size="sm" onClick={reRecord} className="gap-1">
                  <RotateCcw className="h-3 w-3" /> Start Over
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
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
                Read all five sections below in your normal speaking voice.
              </p>
              <p className="text-sm text-muted-foreground">
                Speak naturally, like you would on a real phone call with a client. This takes about 90 seconds.
              </p>
            </div>

            {/* Recording mode selector */}
            <div className="space-y-3 p-4 rounded-lg border border-border">
              <p className="text-sm font-medium text-foreground">Recording Mode:</p>
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer" onClick={() => setRecordingMode("full")}>
                  <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${recordingMode === "full" ? "border-primary" : "border-muted-foreground/40"}`}>
                    {recordingMode === "full" && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Read the full script in one take (~90 seconds)</p>
                    <p className="text-xs text-muted-foreground">Best quality. Read all five sections continuously.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer" onClick={() => setRecordingMode("section")}>
                  <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center ${recordingMode === "section" ? "border-primary" : "border-muted-foreground/40"}`}>
                    {recordingMode === "section" && <div className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Record section by section (~20 seconds each)</p>
                    <p className="text-xs text-muted-foreground">Easier to do. Record each section separately and we'll combine them.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Customize toggle */}
            <div className="flex items-center gap-3">
              <Switch checked={customizeScript} onCheckedChange={setCustomizeScript} id="customize-script" />
              <Label htmlFor="customize-script" className="text-sm text-foreground cursor-pointer flex items-center gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Customize this script before recording
              </Label>
            </div>
            {customizeScript && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                Keep the overall length and variety similar. Don't shorten it significantly or the voice clone quality may suffer.
              </p>
            )}

            {/* Script sections */}
            <ScriptDisplay editable={customizeScript} />

            {/* Tips */}
            <div className="space-y-1 p-3 rounded-lg bg-muted/50">
              <p className="text-xs font-semibold text-muted-foreground">Pro tips:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Read it like you're talking to a real client, not reading a script</li>
                <li>Keep a steady pace — don't rush through it</li>
                <li>If you stumble on a word, just keep going naturally</li>
                <li>Smile while you speak — your clients will hear it</li>
              </ul>
            </div>

            <Button onClick={recordingMode === "section" ? () => { setStatus("idle"); } : startRecording} className="w-full gap-2" size="lg"
              {...(recordingMode === "section" ? {} : {})}
            >
              <Mic className="h-4 w-4" /> Start Recording
            </Button>
          </div>
        )}

        {/* RECORDING — full take, script stays visible */}
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
              <span className="text-lg font-mono text-foreground">{formatTime(duration)} / ~{formatTime(TARGET_DISPLAY)}</span>
            </div>

            {/* Script with active section highlighting */}
            <ScriptDisplay highlight={activeSectionIdx >= 0 ? activeSectionIdx : undefined} />

            <canvas ref={canvasRef} width={500} height={60} className="w-full h-14 rounded-lg" />

            {duration >= 120 && (
              <p className="text-xs text-primary font-medium text-center">
                ✓ You can stop recording anytime — you've got plenty of audio!
              </p>
            )}

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
              <Button variant="outline" size="sm" onClick={isPlaying ? pauseAudio : () => playAudio()} className="gap-1">
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
