import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

export interface TenantInfo {
  id: string;
  company_name: string;
  plan: string;
  monthly_minute_limit: number;
  minutes_used_this_cycle: number;
  credit_balance: number;
  industry: string;
  status: string;
  default_timezone: string;
  onboarding_completed: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  tenant_id: string;
  role: string;
  tenant: TenantInfo;
}

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, companyName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  supabaseUser: null,
  session: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  // Get tenant_users record
  const { data: tenantUser, error: tuError } = await supabase
    .from("tenant_users")
    .select("tenant_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (tuError || !tenantUser) return null;

  // Get tenant info
  const { data: tenant, error: tError } = await supabase
    .from("tenants")
    .select("id, company_name, plan, monthly_minute_limit, minutes_used_this_cycle, credit_balance, industry, status, default_timezone, onboarding_completed")
    .eq("id", tenantUser.tenant_id)
    .single();

  if (tError || !tenant) return null;

  const { data: { user } } = await supabase.auth.getUser();

  return {
    id: userId,
    email: user?.email || "",
    tenant_id: tenantUser.tenant_id,
    role: tenantUser.role,
    tenant: tenant as TenantInfo,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (supaUser: SupabaseUser) => {
    const profile = await fetchUserProfile(supaUser.id);
    setUser(profile);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setSupabaseUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Defer profile fetch to avoid deadlocks
          setTimeout(() => loadProfile(newSession.user), 0);
        } else {
          setUser(null);
        }

        if (event === "INITIAL_SESSION") {
          setLoading(false);
        }
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession?.user) {
        setSession(existingSession);
        setSupabaseUser(existingSession.user);
        loadProfile(existingSession.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, companyName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { company_name: companyName || "My Company" },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSupabaseUser(null);
  };

  const refreshProfile = async () => {
    if (supabaseUser) await loadProfile(supabaseUser);
  };

  return (
    <AuthContext.Provider value={{ user, supabaseUser, session, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
