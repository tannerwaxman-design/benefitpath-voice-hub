import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface DncEntry {
  id: string;
  phone_number: string;
  source: string;
  created_at: string;
}

/** Returns total count + first page of DNC entries */
export function useDncList() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dnc-list", user?.tenant_id],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("dnc_list")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return { entries: (data ?? []) as DncEntry[], count: count ?? 0 };
    },
    enabled: !!user?.tenant_id,
  });
}

/** Normalise a phone string to +1XXXXXXXXXX for matching */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw.trim();
}

/** Parse a CSV text into an array of normalized phone numbers */
function parseCsvPhones(csv: string): string[] {
  const lines = csv.split(/\r?\n/);
  const phones: string[] = [];
  for (const line of lines) {
    // Support one phone per line or comma-separated
    const parts = line.split(",");
    for (const part of parts) {
      const trimmed = part.trim().replace(/^["']|["']$/g, "");
      if (trimmed && /[\d\+\-\(\)\s]+/.test(trimmed)) {
        phones.push(normalizePhone(trimmed));
      }
    }
  }
  return phones.filter(Boolean);
}

/** Upload a CSV file of phone numbers to the DNC list */
export function useUploadDncList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user?.tenant_id) throw new Error("No tenant");
      const text = await file.text();
      const phones = parseCsvPhones(text);
      if (phones.length === 0) throw new Error("No valid phone numbers found in file");

      const rows = phones.map((phone) => ({
        tenant_id: user.tenant_id,
        phone_number: phone,
        source: "csv_upload",
      }));

      // Upsert in chunks to avoid request size limits
      const CHUNK = 500;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await supabase
          .from("dnc_list")
          .upsert(rows.slice(i, i + CHUNK), { onConflict: "tenant_id,phone_number" });
        if (error) throw error;
        inserted += Math.min(CHUNK, rows.length - i);
      }
      return inserted;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["dnc-list"] });
      toast({ title: `DNC list updated`, description: `${count} numbers added/merged.` });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });
}

/** Download all DNC entries as a CSV file */
export function useDownloadDncList() {
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!user?.tenant_id) throw new Error("No tenant");

      // Fetch all (no limit — paginate if necessary)
      const { data, error } = await supabase
        .from("dnc_list")
        .select("phone_number, source, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return 0;

      const header = "phone_number,source,added_at";
      const rows = data.map(
        (r) => `${r.phone_number},${r.source},${r.created_at}`
      );
      const csv = [header, ...rows].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dnc-list-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return data.length;
    },
    onSuccess: (count) => {
      toast({ title: "DNC list downloaded", description: `${count} entries exported.` });
    },
    onError: (err: Error) => {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    },
  });
}

/** Check if a single phone number is on the DNC list */
export function useCheckDncNumber() {
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rawPhone: string) => {
      if (!user?.tenant_id) throw new Error("No tenant");
      const phone = normalizePhone(rawPhone);
      const { data, error } = await supabase
        .from("dnc_list")
        .select("phone_number")
        .eq("phone_number", phone)
        .maybeSingle();
      if (error) throw error;
      return { phone, onDnc: !!data };
    },
    onSuccess: ({ phone, onDnc }) => {
      toast({
        title: onDnc ? "Number IS on DNC list" : "Number is NOT on DNC list",
        description: phone,
        variant: onDnc ? "destructive" : "default",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Check failed", description: err.message, variant: "destructive" });
    },
  });
}
