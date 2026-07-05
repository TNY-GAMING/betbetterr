import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./use-session";


export type Profile = {
  id: string;
  username: string;
  balance: number;
  display_name: string | null;
  avatar_url: string | null;
};

export function useProfile() {
  const { user } = useSession();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, balance, display_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  // Realtime balance sync
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`profile:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          qc.setQueryData(["profile", user.id], (prev: Profile | null | undefined) =>
            prev ? { ...prev, balance: Number((payload.new as Profile).balance) } : prev,
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const setBalance = (bal: number) => {
    if (!user) return;
    qc.setQueryData(["profile", user.id], (prev: Profile | null | undefined) =>
      prev ? { ...prev, balance: bal } : prev,
    );
  };

  return { profile: query.data ?? null, loading: query.isLoading, setBalance, refetch: query.refetch };
}
