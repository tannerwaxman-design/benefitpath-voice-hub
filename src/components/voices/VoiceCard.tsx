import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mic, Volume2, MoreVertical, Star, Check, Plus } from "lucide-react";
import { TtsTestBox } from "./TtsTestBox";
import { VoiceWithCollection } from "@/hooks/use-voice-management";
import { useAuth } from "@/contexts/AuthContext";

interface VoiceCardProps {
  voice: VoiceWithCollection;
  mode: "my-voices" | "library";
  onSetDefault?: (id: string) => void;
  onRemove?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAdd?: (id: string) => void;
}

export function VoiceCard({ voice, mode, onSetDefault, onRemove, onDelete, onAdd }: VoiceCardProps) {
  const { user } = useAuth();
  const companyName = user?.tenant?.company_name || "Benefits First";
  const defaultText = `Hi, this is ${user?.tenant?.company_name ? "an agent" : "Sarah"} from ${companyName}. How can I help you today?`;

  return (
    <Card className="border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {voice.type === "cloned" ? (
              <Mic className="h-5 w-5 text-primary" />
            ) : (
              <Volume2 className="h-5 w-5 text-muted-foreground" />
            )}
            <h3 className="font-semibold text-foreground">{voice.name}</h3>
          </div>
          <Badge variant={voice.type === "cloned" ? "default" : "secondary"} className="text-[10px]">
            {voice.type === "cloned" ? "CLONED" : "PRESET"}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">
          {voice.type === "cloned"
            ? "Your cloned voice"
            : `${voice.gender} • ${voice.accent} • ${voice.style}`}
        </p>

        {/* TTS Test Box */}
        <TtsTestBox
          voiceId={voice.provider_voice_id}
          defaultText={defaultText}
          compact={mode === "library"}
        />

        {/* Footer */}
        {mode === "my-voices" && (
          <>
            {voice.used_by_agents.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Used by: {voice.used_by_agents.join(", ")}
              </p>
            )}
            <div className="flex items-center justify-between pt-1">
              {voice.is_default ? (
                <Badge variant="outline" className="text-xs gap-1">
                  <Check className="h-3 w-3" /> Default
                </Badge>
              ) : (
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => onSetDefault?.(voice.id)}>
                  <Star className="h-3 w-3" /> Set as Default
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {voice.type === "preset" && (
                    <DropdownMenuItem onClick={() => onRemove?.(voice.id)}>
                      Remove from My Voices
                    </DropdownMenuItem>
                  )}
                  {voice.type === "cloned" && (
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(voice.id)}>
                      Delete Voice
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}

        {mode === "library" && (
          <div className="pt-1">
            {voice.in_collection ? (
              <Badge variant="secondary" className="text-xs gap-1">
                <Check className="h-3 w-3" /> Added
              </Badge>
            ) : (
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => onAdd?.(voice.id)}>
                <Plus className="h-3 w-3" /> Add to My Voices
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
