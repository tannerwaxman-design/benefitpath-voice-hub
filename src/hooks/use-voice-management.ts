import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useRef } from "react";

export interface Voice {
  id: string;
  tenant_id: string | null;
  name: string;
  type: "preset" | "cloned";
  provider: string;
  provider_voice_id: string;
  gender: string | null;
  accent: string | null;
  style: string | null;
  description: string | null;
  language: string | null;
  recording_url: string | null;
  clone_status: string | null;
  is_default: boolean;
  is_global: boolean;
  created_at: string;
}

export interface VoiceWithCollection extends Voice {
  in_collection: boolean;
  used_by_agents: string[];
}

export function useAllVoices() {
  return useQuery({
    queryKey: ["voices", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voices")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as Voice[];
    },
  });
}

export function useMyVoices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["voices", "my-collection"],
    queryFn: async () => {
      const { data: collection, error: collError } = await supabase
        .from("user_voice_collection")
        .select("voice_id");
      if (collError) throw collError;

      const collectionIds = new Set((collection || []).map((c) => c.voice_id));

      const { data: clonedVoices, error: cloneError } = await supabase
        .from("voices")
        .select("*")
        .eq("type", "cloned");
      if (cloneError) throw cloneError;

      const collectionArray = Array.from(collectionIds);
      let presetVoices: Voice[] = [];
      if (collectionArray.length > 0) {
        const { data, error } = await supabase
          .from("voices")
          .select("*")
          .in("id", collectionArray);
        if (error) throw error;
        presetVoices = (data || []) as unknown as Voice[];
      }

      const { data: agents } = await supabase
        .from("agents")
        .select("agent_name, voice_id");

      const allVoices = [...(clonedVoices || []) as unknown as Voice[], ...presetVoices];

      return allVoices.map((v) => ({
        ...v,
        in_collection: true,
        used_by_agents: (agents || [])
          .filter((a) => a.voice_id === v.provider_voice_id)
          .map((a) => a.agent_name),
      })) as VoiceWithCollection[];
    },
  });
}

export function useVoiceLibrary() {
  return useQuery({
    queryKey: ["voices", "library"],
    queryFn: async () => {
      const { data: voices, error } = await supabase
        .from("voices")
        .select("*")
        .eq("is_global", true)
        .eq("type", "preset")
        .order("name");
      if (error) throw error;

      const { data: collection } = await supabase
        .from("user_voice_collection")
        .select("voice_id");

      const collectionIds = new Set((collection || []).map((c) => c.voice_id));

      return ((voices || []) as unknown as Voice[]).map((v) => ({
        ...v,
        in_collection: collectionIds.has(v.id),
        used_by_agents: [],
      })) as VoiceWithCollection[];
    },
  });
}

export function useAddToCollection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (voiceId: string) => {
      const { error } = await supabase
        .from("user_voice_collection")
        .insert({ tenant_id: user!.tenant.id, voice_id: voiceId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voices"] });
      toast({ title: "Voice added to your collection" });
    },
  });
}

export function useRemoveFromCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (voiceId: string) => {
      const { error } = await supabase
        .from("user_voice_collection")
        .delete()
        .eq("voice_id", voiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voices"] });
      toast({ title: "Voice removed from your collection" });
    },
  });
}

export function useSetDefaultVoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (voiceId: string) => {
      await supabase
        .from("voices")
        .update({ is_default: false })
        .eq("is_default", true);
      const { error } = await supabase
        .from("voices")
        .update({ is_default: true })
        .eq("id", voiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voices"] });
      toast({ title: "Default voice updated" });
    },
  });
}

export function useDeleteVoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (voiceId: string) => {
      const { error } = await supabase
        .from("voices")
        .delete()
        .eq("id", voiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voices"] });
      toast({ title: "Voice deleted" });
    },
  });
}

// TTS preview hook — fetches audio binary via fetch (NOT supabase.functions.invoke)
// and plays it in the browser with caching
export function useTtsPreview() {
  const cacheRef = useRef<Map<string, string>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(async (text: string, voiceId: string, options?: { onPlaybackStart?: () => void }) => {
    const cacheKey = `${voiceId}:${text}`;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Check cache
    let audioUrl = cacheRef.current.get(cacheKey);
    if (!audioUrl) {
      // Get the current session token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text, voice_id: voiceId }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error("TTS preview response error:", response.status, errText);
        throw new Error(`TTS preview failed (${response.status})`);
      }

      const contentType = response.headers.get("Content-Type") || "";
      if (!contentType.includes("audio")) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error((errJson as { error?: string }).error || "Unexpected response from TTS");
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error("Empty audio response");

      audioUrl = URL.createObjectURL(blob);
      cacheRef.current.set(cacheKey, audioUrl);
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    return new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        audioRef.current = null;
        resolve();
      };
      audio.onerror = () => {
        audioRef.current = null;
        reject(new Error("Audio playback failed"));
      };
      audio.play().then(() => {
        options?.onPlaybackStart?.();
      }).catch((err) => {
        audioRef.current = null;
        reject(err);
      });
    });
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  return { play, stop };
}

// Hook for agent builder voice dropdown
export function useAvailableVoices() {
  return useQuery({
    queryKey: ["voices", "available-for-agent"],
    queryFn: async () => {
      const { data: cloned } = await supabase
        .from("voices")
        .select("*")
        .eq("type", "cloned");

      const { data: collection } = await supabase
        .from("user_voice_collection")
        .select("voice_id");

      const collectionIds = (collection || []).map((c) => c.voice_id);

      let presets: Voice[] = [];
      if (collectionIds.length > 0) {
        const { data } = await supabase
          .from("voices")
          .select("*")
          .in("id", collectionIds);
        presets = (data || []) as unknown as Voice[];
      }

      if (presets.length === 0 && (!cloned || cloned.length === 0)) {
        const { data } = await supabase
          .from("voices")
          .select("*")
          .eq("is_global", true)
          .eq("type", "preset");
        presets = (data || []) as unknown as Voice[];
      }

      return [...((cloned || []) as unknown as Voice[]), ...presets];
    },
  });
}
