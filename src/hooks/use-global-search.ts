import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SearchResult {
  id: string;
  type: "agent" | "campaign" | "contact" | "call";
  title: string;
  subtitle: string;
  link: string;
}

export function useGlobalSearch(query: string) {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2 || !user?.tenant_id) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const search = async () => {
      setIsSearching(true);
      try {
        const term = `%${query}%`;

        const [agentsRes, campaignsRes, contactsRes] = await Promise.all([
          supabase
            .from("agents")
            .select("id, agent_name, description, status")
            .neq("status", "archived")
            .ilike("agent_name", term)
            .limit(5),
          supabase
            .from("campaigns")
            .select("id, name, status")
            .ilike("name", term)
            .limit(5),
          supabase
            .from("contacts")
            .select("id, first_name, last_name, phone, email")
            .or(`first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`)
            .limit(5),
        ]);

        if (cancelled) return;

        const items: SearchResult[] = [];

        for (const agent of agentsRes.data || []) {
          items.push({
            id: agent.id,
            type: "agent",
            title: agent.agent_name || "Untitled Agent",
            subtitle: agent.status || "draft",
            link: `/agents/${agent.id}`,
          });
        }

        for (const campaign of campaignsRes.data || []) {
          items.push({
            id: campaign.id,
            type: "campaign",
            title: campaign.name || "Untitled Campaign",
            subtitle: campaign.status || "draft",
            link: `/campaigns/${campaign.id}`,
          });
        }

        for (const contact of contactsRes.data || []) {
          items.push({
            id: contact.id,
            type: "contact",
            title: [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown",
            subtitle: contact.phone || contact.email || "",
            link: "/contacts",
          });
        }

        setResults(items);
      } catch {
        // silently fail on search errors
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    };

    const timeout = setTimeout(search, 300);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, user?.tenant_id]);

  return { results, isSearching };
}
