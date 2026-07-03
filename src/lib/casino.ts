import { supabase } from "@/integrations/supabase/client";

export type SettleParams = {
  game: string;
  wager: number;
  payout: number;
  multiplier: number;
  outcome: string;
  meta?: Record<string, unknown>;
};

export async function settleBet(p: SettleParams): Promise<number> {
  const { data, error } = await supabase.rpc("settle_bet", {
    p_game: p.game,
    p_wager: p.wager,
    p_payout: p.payout,
    p_multiplier: p.multiplier,
    p_outcome: p.outcome,
    p_meta: p.meta ?? {},
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return Number(row.new_balance);
}

export async function adjustBalance(delta: number): Promise<number> {
  const { data, error } = await supabase.rpc("adjust_balance", { p_delta: delta });
  if (error) throw error;
  return Number(data);
}

export const GAMES = [
  { slug: "mines", name: "Mines", tagline: "Clear the field. Dodge the bombs.", accent: "text-red", from: "#e0334a", to: "#7a1d2b" },
  { slug: "crash", name: "Crash", tagline: "Cash out before it explodes.", accent: "text-gold", from: "#f5b544", to: "#7a5a1a" },
  { slug: "dragon-tower", name: "Dragon Tower", tagline: "Climb higher for bigger payouts.", accent: "text-violet", from: "#a97af5", to: "#4a2680" },
  { slug: "hilo", name: "Hilo", tagline: "Higher or lower. Simple. Deadly.", accent: "text-sky", from: "#4fb4f5", to: "#0f4a7a" },
  { slug: "keno", name: "Keno", tagline: "Pick your numbers, chase the hits.", accent: "text-teal", from: "#4fd7c8", to: "#0f5e5a" },
  { slug: "blackjack", name: "Blackjack", tagline: "Beat the dealer. 3 : 2 on naturals.", accent: "text-fuchsia", from: "#e05aa8", to: "#7a1d5a" },
] as const;
export type GameSlug = (typeof GAMES)[number]["slug"];
