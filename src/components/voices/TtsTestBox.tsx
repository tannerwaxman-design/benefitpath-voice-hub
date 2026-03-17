import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Play, Square, Loader2 } from "lucide-react";
import { useTtsPreview } from "@/hooks/use-voice-management";
import { useToast } from "@/hooks/use-toast";

interface TtsTestBoxProps {
  voiceId: string;
  defaultText?: string;
  compact?: boolean;
}

export function TtsTestBox({ voiceId, defaultText = "", compact = false }: TtsTestBoxProps) {
  const [text, setText] = useState(defaultText);
  const [status, setStatus] = useState<"idle" | "loading" | "playing">("idle");
  const { play, stop } = useTtsPreview();
  const { toast } = useToast();

  const handlePlay = useCallback(async () => {
    if (!text.trim() || !voiceId) return;

    if (status === "playing") {
      stop();
      setStatus("idle");
      return;
    }

    setStatus("loading");
    try {
      // play() returns a promise that resolves when audio finishes
      const playPromise = play(text, voiceId);
      // Once audio starts (play resolved the fetch), switch to playing
      setStatus("playing");
      await playPromise;
      setStatus("idle");
    } catch (err) {
      console.error("TTS preview error:", err);
      setStatus("idle");
      toast({
        title: "Playback failed",
        description: "Could not generate audio preview. Please try again.",
        variant: "destructive",
      });
    }
  }, [text, voiceId, status, play, stop, toast]);

  return (
    <div className="space-y-2">
      {!compact && (
        <p className="text-xs text-muted-foreground">Type something to hear this voice:</p>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something to hear this voice..."
        rows={compact ? 2 : 3}
        className="text-sm resize-none"
        maxLength={500}
      />
      <Button
        size="sm"
        variant={status === "playing" ? "destructive" : "default"}
        onClick={handlePlay}
        disabled={!text.trim() || !voiceId || status === "loading"}
        className="gap-1.5"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating...
          </>
        ) : status === "playing" ? (
          <>
            <Square className="h-3.5 w-3.5" />
            Stop
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" />
            Play
          </>
        )}
      </Button>
    </div>
  );
}
