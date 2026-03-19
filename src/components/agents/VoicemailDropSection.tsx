import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Play, RotateCcw, CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";

interface VoicemailDropSectionProps {
  voicemailMethod: "live" | "drop";
  onMethodChange: (method: "live" | "drop") => void;
  voicemailScript: string;
  onScriptChange: (script: string) => void;
  voicemailAudioUrl: string | null;
  onAudioUrlChange: (url: string | null) => void;
  voiceId: string;
  voiceProvider: string;
}

export function VoicemailDropSection({
  voicemailMethod,
  onMethodChange,
  voicemailScript,
  onScriptChange,
  voicemailAudioUrl,
  onAudioUrlChange,
  voiceId,
  voiceProvider,
}: VoicemailDropSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(voicemailAudioUrl);
  const [isApproved, setIsApproved] = useState(!!voicemailAudioUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!voicemailScript.trim()) {
      toast.error("Please enter a voicemail message first");
      return;
    }
    setIsGenerating(true);
    setIsApproved(false);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: voicemailScript,
            voice_id: voiceId,
          }),
        }
      );
      if (!response.ok) throw new Error("TTS failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      toast.success("Voicemail generated! Preview it below.");
    } catch {
      toast.error("Failed to generate voicemail audio");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = () => {
    if (previewUrl) {
      onAudioUrlChange(previewUrl);
      setIsApproved(true);
      toast.success("Voicemail approved and saved");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      toast.error("Please upload an audio file (MP3 or WAV)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onAudioUrlChange(url);
    setIsApproved(true);
    toast.success("Audio uploaded successfully");
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Voicemail Method</Label>
      <RadioGroup
        value={voicemailMethod}
        onValueChange={(v) => onMethodChange(v as "live" | "drop")}
        className="space-y-2"
      >
        <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-secondary/30 transition-colors">
          <RadioGroupItem value="live" id="vm-live" className="mt-0.5" />
          <div>
            <Label htmlFor="vm-live" className="cursor-pointer font-medium">
              AI speaks the voicemail live
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Current behavior — AI generates voicemail in real-time
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-secondary/30 transition-colors">
          <RadioGroupItem value="drop" id="vm-drop" className="mt-0.5" />
          <div>
            <Label htmlFor="vm-drop" className="cursor-pointer font-medium">
              Drop a pre-recorded voicemail
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sounds more natural — plays the same approved recording every time
            </p>
          </div>
        </div>
      </RadioGroup>

      {voicemailMethod === "drop" && (
        <div className="border rounded-lg p-4 space-y-5 bg-secondary/10">
          {/* Option 1: Generate with AI */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Option 1: Generate with AI voice
              </p>
              <p className="text-xs text-muted-foreground">
                Generate a voicemail using your agent's voice. Preview and approve before use.
              </p>
            </div>
            <div>
              <Label className="text-xs">Voicemail text</Label>
              <Textarea
                value={voicemailScript}
                onChange={(e) => onScriptChange(e.target.value)}
                rows={3}
                className="mt-1 text-sm"
                placeholder="Hi, this is Sarah from Benefits First. I was calling about your benefits enrollment. Please give us a call back at 555-234-5678. Have a great day!"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating || !voicemailScript.trim()}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isGenerating ? "Generating..." : "Generate Voicemail"}
            </Button>

            {previewUrl && (
              <div className="bg-background rounded-lg p-3 border space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Generated voicemail:
                </p>
                <audio controls className="w-full" src={previewUrl} />
                <div className="flex items-center gap-2">
                  {!isApproved ? (
                    <>
                      <Button
                        size="sm"
                        onClick={handleApprove}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve & Use
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="gap-1.5"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Regenerate
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-success text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Approved</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                Option 2: Upload your own recording
              </p>
              <p className="text-xs text-muted-foreground">
                Record yourself leaving the voicemail and upload the file (MP3 or WAV, under 5MB).
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mp3,audio/wav,audio/mpeg,audio/x-wav"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Audio File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
