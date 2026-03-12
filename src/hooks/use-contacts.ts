import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useContactLists() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contact-lists", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_lists")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });
}

export function useContacts(contactListId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["contacts", user?.tenant_id, contactListId],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (contactListId) {
        query = query.eq("contact_list_id", contactListId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.tenant_id,
  });
}

export function useCreateContactList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      contacts: Array<{ first_name: string; last_name: string; phone: string; email?: string; company?: string }>;
    }) => {
      // 1. Create the contact list
      const { data: list, error: listError } = await supabase
        .from("contact_lists")
        .insert({
          tenant_id: user!.tenant_id,
          name: params.name,
          total_contacts: params.contacts.length,
          valid_contacts: params.contacts.length,
          source: "csv_upload",
        })
        .select()
        .single();
      if (listError) throw listError;

      // 2. Insert all contacts in batches of 500
      const contactRows = params.contacts.map(c => ({
        tenant_id: user!.tenant_id,
        contact_list_id: list.id,
        first_name: c.first_name,
        last_name: c.last_name,
        phone: c.phone,
        email: c.email || null,
        company: c.company || null,
      }));

      for (let i = 0; i < contactRows.length; i += 500) {
        const batch = contactRows.slice(i, i + 500);
        const { error: contactError } = await supabase
          .from("contacts")
          .insert(batch as never);
        if (contactError) throw contactError;
      }

      return list;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contact-lists"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Contact list created", description: `${data.total_contacts} contacts imported` });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create contact list", description: err.message, variant: "destructive" });
    },
  });
}
