import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string | null;
  description: string | null;
}

export function useVoices() {
  return useQuery({
    queryKey: ["elevenlabs-voices"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-voices");
      if (error) throw error;
      return (data?.voices || []) as ElevenLabsVoice[];
    },
    staleTime: 1000 * 60 * 30, // cache 30 min
  });
}
