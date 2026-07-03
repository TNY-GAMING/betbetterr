import { useState } from "react";
import { X, ArrowDownToLine, ArrowUpFromLine, History } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { adjustBalance } from "@/lib/casino";
import { fmt } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useQuery } from "@tanstack/react-query";

type Tab = "deposit" | "withdraw" | "history";

export function WalletDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("deposit");
  const { profile, setBalance } = useProfile();
  const { user } = useSession();
  const [amount, setAmount] = useState<string>("100");
  const [busy, setBusy] = useState(false);

  const { data: history } = useQuery({
    queryKey: ["bets", user?.id, "wallet"],
    enabled: !!user && tab === "history",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bets")
        .select("id, game, wager, payout, multiplier, outcome, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  async function doAdjust(delta: number) {
    if (busy) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setBusy(true);
    try {
      const nb = await adjustBalance(delta * n);
      setBalance(nb);
      toast.success(
        delta > 0 ? `Deposited ${fmt(n)} BB — demo funds` : `Withdrew ${fmt(n)} BB`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg card-panel shadow-panel overflow-hidden">
        <div className="flex items-center justify-between px-5 h-14 border-b border-border">
          <h2 className="font-display font-black text-lg">Wallet</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md grid place-items-center hover:bg-surface-2">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-border">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Balance</div>
          <div className="mt-1 font-mono tabular-nums text-3xl font-black text-primary">
            {profile ? fmt(profile.balance) : "—"} <span className="text-muted-foreground text-lg">BB</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Demo funds — BetBetter Coin has no real-world value.</div>
        </div>

        <div className="flex border-b border-border">
          {(["deposit", "withdraw", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 h-10 text-xs font-bold uppercase tracking-wider ${
                tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "deposit" ? "Deposit" : t === "withdraw" ? "Withdraw" : "History"}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[55vh] overflow-y-auto">
          {tab !== "history" ? (
            <div className="space-y-4">
              <label className="block">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Amount (BB)
                </div>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 rounded-md bg-surface-0 border border-border px-3 font-mono text-lg focus:outline-none focus:border-border-strong"
                />
              </label>
              <div className="flex gap-2">
                {[100, 500, 1000, 5000].map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(String(a))}
                    className="flex-1 h-9 rounded-md bg-surface-2 hover:bg-surface-3 text-xs font-bold"
                  >
                    {a}
                  </button>
                ))}
              </div>
              <button
                onClick={() => doAdjust(tab === "deposit" ? 1 : -1)}
                disabled={busy}
                className="btn-primary w-full h-11 rounded-md text-sm inline-flex items-center justify-center gap-2"
              >
                {tab === "deposit" ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                {busy ? "Working…" : tab === "deposit" ? "Deposit" : "Withdraw"}
              </button>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This is a demo casino. Real payment rails aren't connected — deposits credit your account with in-app
                BetBetter Coin (BB) so you can try the games.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {!history?.length && (
                <div className="text-center text-sm text-muted-foreground py-8 flex flex-col items-center gap-2">
                  <History size={22} /> No bets yet — go play a round.
                </div>
              )}
              {history?.map((b) => {
                const win = Number(b.payout) > 0;
                const net = Number(b.payout) - Number(b.wager);
                return (
                  <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-surface-2 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-1.5 h-8 rounded ${win ? "bg-primary" : "bg-red"}`} />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{b.game}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(b.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                          {Number(b.multiplier).toFixed(2)}×
                        </div>
                      </div>
                    </div>
                    <div className={`font-mono tabular-nums font-bold ${win ? "text-primary" : "text-red"}`}>
                      {net > 0 ? "+" : ""}
                      {fmt(net)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
