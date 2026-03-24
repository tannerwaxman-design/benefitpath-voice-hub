import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquareText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CommentaryItem = {
  timestamp: number;
  type: "observation" | "strength" | "improvement" | "objection_detected" | "interest_signal" | "temperature_change";
  comment: string;
};

const typeConfig: Record<string, { icon: string; className: string }> = {
  observation: { icon: "💡", className: "text-muted-foreground" },
  strength: { icon: "✅", className: "text-success" },
  improvement: { icon: "❌", className: "text-destructive" },
  objection_detected: { icon: "⚡", className: "text-warning" },
  interest_signal: { icon: "🔥", className: "text-orange-500" },
  temperature_change: { icon: "🔥", className: "text-orange-500" },
};

function formatTs(s: number) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function AiCommentaryPlayer({
  callId,
  recordingUrl,
  onTimeUpdate,
  seekToSeconds,
}: {
  callId: string;
  recordingUrl: string;
  onTimeUpdate?: (t: number) => void;
  seekToSeconds?: number;
}) {
  const [commentary, setCommentary] = useState<CommentaryItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchCommentary = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-commentary", {
        body: { call_id: callId },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setCommentary(data.commentary);
      if (data.cached) toast.info("Loaded cached commentary");
    } catch (err) {
      toast.error("Failed to generate AI commentary");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayWithCommentary = async () => {
    if (!commentary) {
      await fetchCommentary();
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  // Seek when parent requests it
  useEffect(() => {
    if (seekToSeconds !== undefined && audioRef.current) {
      audioRef.current.currentTime = seekToSeconds;
      audioRef.current.play().catch(() => {/* user hasn't interacted yet */});
    }
  }, [seekToSeconds]);

  // Track active commentary index
  useEffect(() => {
    if (!commentary) return;
    let idx = -1;
    for (let i = commentary.length - 1; i >= 0; i--) {
      if (currentTime >= commentary[i].timestamp) {
        idx = i;
        break;
      }
    }
    if (idx !== activeIndex) {
      setActiveIndex(idx);
      // Auto-scroll
      if (idx >= 0 && scrollRef.current) {
        const el = scrollRef.current.children[idx] as HTMLElement;
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [currentTime, commentary, activeIndex]);

  return (
    <div className="space-y-3">
      <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
        <audio ref={audioRef} src={recordingUrl} className="w-full" controls />

        <Button
          variant="outline"
          size="sm"
          onClick={handlePlayWithCommentary}
          disabled={isLoading}
          className="gap-2 w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquareText className="h-4 w-4" />
          )}
          {isLoading
            ? "Generating AI Commentary..."
            : commentary
              ? "Replay with AI Commentary"
              : "Play with AI Commentary"}
        </Button>
      </div>

      {commentary && commentary.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-secondary/50 px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              {isPlaying ? "▶ Playing with AI Commentary" : "AI Commentary"}
            </span>
            <span className="text-xs text-muted-foreground">
              {commentary.length} insights
            </span>
          </div>
          <div
            ref={scrollRef}
            className="max-h-72 overflow-y-auto divide-y divide-border"
          >
            {commentary.map((item, i) => {
              const config = typeConfig[item.type] || typeConfig.observation;
              const isActive = i === activeIndex;
              const isPast = i < activeIndex;
              return (
                <div
                  key={i}
                  className={`px-3 py-2 text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary/10"
                      : isPast
                        ? "opacity-60"
                        : ""
                  }`}
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = item.timestamp;
                      audioRef.current.play();
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground font-mono whitespace-nowrap mt-0.5">
                      [{formatTs(item.timestamp)}]
                    </span>
                    <span className="text-sm">
                      {config.icon}
                    </span>
                    <span className={`text-sm ${config.className}`}>
                      {item.comment}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
