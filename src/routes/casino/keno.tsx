import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { GameShell, BetAmountInput } from "@/components/games/GameShell";
import { useProfile } from "@/hooks/use-profile";
import { KENO_PAYTABLE, sampleUnique } from "@/lib/games";
import { settleBet } from "@/lib/casino";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/casino/keno")({
  head: () => ({
    meta: [
      { title: "Keno — BetBetter" },
      { name: "description", content: "Pick up to 10 numbers, chase the hits. Payouts up to 500×." },
    ],
  }),
  component: KenoPage,
});

function KenoPage() {
  const NUMS = 40;
  const MAX_PICKS = 10;
  const { profile, setBalance } = useProfile();
  const balance = profile?.balance ?? 0;

  const [bet, setBet] = useState(10);
  const [picks, setPicks] = useState<Set<number>>(new Set());
  const [drawn, setDrawn] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState<"idle" | "drawn">("idle");
  const [busy, setBusy] = useState(false);
  const [lastMult, setLastMult] = useState(0);

  function toggle(n: number) {
    if (phase !== "idle") return;
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else if (next.size < MAX_PICKS) next.add(n);
      return next;
    });
  }

  async function draw() {
    if (picks.size === 0 || bet <= 0 || bet > balance || busy) return;
    setBusy(true);
    const result = sampleUnique(NUMS, 10);
    setDrawn(result);
    const matches = [...picks].filter((p) => result.has(p)).length;
    const table = KENO_PAYTABLE[picks.size];
    const m = table[matches] ?? 0;
    setLastMult(m);
    const payout = +(bet * m).toFixed(2);
    setPhase("drawn");
    try {
      const nb = await settleBet({
        game: "Keno",
        wager: bet,
        payout,
        multiplier: m,
        outcome: payout > 0 ? "win" : "loss",
        meta: { picks: [...picks], drawn: [...result], matches },
      });
      setBalance(nb);
      if (payout > 0) toast.success(`+${fmt(payout - bet)} BB · ${m.toFixed(2)}×`);
      else toast.error(`−${fmt(bet)} BB · ${matches} hits`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPicks(new Set());
    setDrawn(new Set());
    setPhase("idle");
    setLastMult(0);
  }

  const table = KENO_PAYTABLE[picks.size || 1];
  const hits = [...picks].filter((p) => drawn.has(p)).length;

  return (
    <GameShell
      title="Keno"
      slug="keno"
      accent="#4fd7c8"
      bet={<BetAmountInput value={bet} onChange={setBet} max={balance} disabled={phase !== "idle"} />}
      panel={
        <>
          <div className="bg-surface-0 border border-border rounded-md p-2.5 max-h-40 overflow-y-auto">
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-1 pb-1 sticky top-0 bg-surface-0">
              <span>Matches</span>
              <span>Payout</span>
            </div>
            {Object.entries(table)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs font-mono px-1 py-0.5 text-muted-foreground">
                  <span>{k}</span>
                  <span className="text-foreground">{v}×</span>
                </div>
              ))}
          </div>

          {phase === "idle" ? (
            <button
              onClick={draw}
              disabled={picks.size === 0 || bet <= 0 || bet > balance || busy}
              className="btn-primary w-full h-11 rounded-md text-sm"
            >
              Draw · {picks.size}/{MAX_PICKS} picked
            </button>
          ) : (
            <button className="btn-primary w-full h-11 rounded-md text-sm" onClick={reset}>
              Play again
            </button>
          )}
        </>
      }
    >
      <div className="w-full max-w-xl mx-auto">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {phase === "drawn" ? `${hits} of ${picks.size} matched` : `Pick up to ${MAX_PICKS} numbers`}
          </span>
          <span className="font-mono font-bold text-teal text-base">
            {phase === "drawn" ? `${lastMult.toFixed(2)}×` : "\u00A0"}
          </span>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: NUMS }, (_, i) => i + 1).map((n) => {
            const picked = picks.has(n);
            const isDrawn = drawn.has(n);
            const hit = picked && isDrawn && phase === "drawn";
            const miss = picked && !isDrawn && phase === "drawn";
            const revealMiss = !picked && isDrawn && phase === "drawn";
            return (
              <button
                key={n}
                onClick={() => toggle(n)}
                disabled={phase === "drawn"}
                className={`aspect-square rounded-md flex items-center justify-center text-xs font-mono font-bold border-2 transition-all ${
                  hit
                    ? "bg-teal/25 border-teal text-teal bb-pop"
                    : miss
                      ? "bg-red/15 border-red/40 text-red"
                      : revealMiss
                        ? "bg-surface-3 border-transparent text-foreground"
                        : picked
                          ? "bg-teal/15 border-teal/50 text-teal"
                          : "bg-surface-2 border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
