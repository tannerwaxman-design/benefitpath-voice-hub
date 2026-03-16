import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Play, Square, Loader2 } from "lucide-react";
import { useTtsPreview } from "@/hooks/use-voice-management";

interface TtsTestBoxProps {
  voiceId: string;
  defaultText?: string;
  compact?: boolean;
}

export function TtsTestBox({ voiceId, defaultText = "", compact = false }: TtsTestBoxProps) {
  const [text, setText] = useState(defaultText);
  const [status, setStatus] = useState<"idle" | "loading" | "playing">("idle");
  const { play, stop } = useTtsPreview();

  const handlePlay = useCallback(async () => {
    if (!text.trim()) return;
    if (status === "playing") {
      stop();
      setStatus("idle");
      return;
    }
    setStatus("loading");
    try {
      await play(text, voiceId);
      setStatus("idle");
    } catch {
      setStatus("idle");
    }
  }, [text, voiceId, status, play, stop]);

  // When play starts (after loading), switch to playing
  const handlePlayWithState = useCallback(async () => {
    if (!text.trim()) return;
    if (status === "playing") {
      stop();
      setStatus("idle");
      return;
    }
    setStatus("loading");
    try {
      setStatus("playing");
      await play(text, voiceId);
      setStatus("idle");
    } catch {
      setStatus("idle");
    }
  }, [text, voiceId, status, play, stop]);

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
        onClick={handlePlayWithState}
        disabled={!text.trim() || status === "loading"}
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
