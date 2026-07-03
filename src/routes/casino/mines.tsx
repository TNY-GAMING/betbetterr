import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bomb, Gem } from "lucide-react";
import { toast } from "sonner";
import { GameShell, BetAmountInput } from "@/components/games/GameShell";
import { useProfile } from "@/hooks/use-profile";
import { minesMultiplier, sampleUnique } from "@/lib/games";
import { settleBet } from "@/lib/casino";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/casino/mines")({
  head: () => ({
    meta: [
      { title: "Mines — BetBetter" },
      { name: "description", content: "Play Mines: clear tiles, dodge bombs, cash out any time. 1% edge." },
    ],
  }),
  component: MinesPage,
});

function MinesPage() {
  const GRID = 25;
  const { profile, setBalance } = useProfile();
  const balance = profile?.balance ?? 0;

  const [minesCount, setMinesCount] = useState(3);
  const [bet, setBet] = useState(10);
  const [phase, setPhase] = useState<"idle" | "active" | "busted" | "done">("idle");
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const multiplier = minesMultiplier(GRID, minesCount, revealed.size);
  const nextMultiplier = minesMultiplier(GRID, minesCount, revealed.size + 1);
  const maxSafe = GRID - minesCount;

  function start() {
    if (bet <= 0 || bet > balance) return;
    setMines(sampleUnique(GRID, minesCount));
    setRevealed(new Set());
    setPhase("active");
  }

  async function resolveWin(finalRevealed: Set<number>) {
    const mult = minesMultiplier(GRID, minesCount, finalRevealed.size);
    const payout = +(bet * mult).toFixed(2);
    setBusy(true);
    try {
      const nb = await settleBet({
        game: "Mines",
        wager: bet,
        payout,
        multiplier: mult,
        outcome: "win",
        meta: { mines: minesCount, picks: finalRevealed.size },
      });
      setBalance(nb);
      toast.success(`+${fmt(payout - bet)} BB · ${mult.toFixed(2)}×`);
      setPhase("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function resolveLoss() {
    setBusy(true);
    try {
      const nb = await settleBet({
        game: "Mines",
        wager: bet,
        payout: 0,
        multiplier: 0,
        outcome: "loss",
        meta: { mines: minesCount },
      });
      setBalance(nb);
      toast.error(`−${fmt(bet)} BB · Busted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function click(i: number) {
    if (phase !== "active" || revealed.has(i) || busy) return;
    if (mines.has(i)) {
      setRevealed((p) => new Set([...p, i]));
      setPhase("busted");
      resolveLoss();
      return;
    }
    const next = new Set([...revealed, i]);
    setRevealed(next);
    if (next.size === maxSafe) resolveWin(next);
  }

  async function cashOut() {
    if (phase !== "active" || revealed.size === 0) return;
    await resolveWin(revealed);
  }

  function reset() {
    setPhase("idle");
    setRevealed(new Set());
    setMines(new Set());
  }

  return (
    <GameShell
      title="Mines"
      slug="mines"
      accent="#e0334a"
      bet={<BetAmountInput value={bet} onChange={setBet} max={balance} disabled={phase === "active"} />}
      panel={
        <>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Mines</div>
            <div className="grid grid-cols-6 gap-1">
              {[1, 3, 5, 10, 15, 24].map((n) => (
                <button
                  key={n}
                  disabled={phase === "active"}
                  onClick={() => setMinesCount(n)}
                  className={`h-9 rounded-md text-xs font-bold border disabled:opacity-40 ${
                    minesCount === n ? "bg-primary/15 border-primary/40 text-primary" : "bg-surface-0 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {phase === "active" && revealed.size > 0 && (
            <div className="bg-surface-0 border border-border rounded-md p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Current</span>
                <span className="font-mono font-bold text-primary">{multiplier.toFixed(2)}×</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Next tile</span>
                <span className="font-mono text-foreground">{nextMultiplier.toFixed(2)}×</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Cash out</span>
                <span className="font-mono font-bold text-primary">{fmt(bet * multiplier)} BB</span>
              </div>
            </div>
          )}

          {phase === "idle" ? (
            <button className="btn-primary w-full h-11 rounded-md text-sm" disabled={bet <= 0 || bet > balance} onClick={start}>
              Bet {fmt(bet)} BB
            </button>
          ) : phase === "active" ? (
            <button
              onClick={cashOut}
              disabled={revealed.size === 0 || busy}
              className="w-full h-11 rounded-md text-sm font-black bg-gold text-black disabled:opacity-40"
            >
              Cash out {fmt(bet * multiplier)} BB
            </button>
          ) : (
            <button className="btn-primary w-full h-11 rounded-md text-sm" onClick={reset}>
              Play again
            </button>
          )}
        </>
      }
    >
      <div className="w-full max-w-md mx-auto">
        <div className="mb-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {phase === "active" ? `${revealed.size} / ${maxSafe} safe` : "Choose mines then bet"}
          </span>
          <span className="font-mono font-bold text-primary text-base">{multiplier.toFixed(2)}×</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: GRID }, (_, i) => {
            const isRev = revealed.has(i);
            const isMine = mines.has(i);
            const showMine = isRev && isMine;
            const showGem = isRev && !isMine;
            const revealAll = phase === "busted" && isMine;
            return (
              <button
                key={i}
                onClick={() => click(i)}
                disabled={phase !== "active" || isRev || busy}
                className={`aspect-square rounded-lg flex items-center justify-center border-2 transition-all ${
                  showMine
                    ? "bg-red/20 border-red bb-shake"
                    : revealAll
                      ? "bg-red/10 border-red/30"
                      : showGem
                        ? "bg-primary/15 border-primary/50 bb-pop"
                        : "bg-surface-2 border-transparent hover:border-border-strong hover:-translate-y-0.5 active:translate-y-0"
                }`}
              >
                {showMine || revealAll ? (
                  <Bomb size={22} className="text-red" />
                ) : showGem ? (
                  <Gem size={22} className="text-primary" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
