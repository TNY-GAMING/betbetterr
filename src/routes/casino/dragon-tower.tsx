import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Flame, Gem } from "lucide-react";
import { toast } from "sonner";
import { GameShell, BetAmountInput } from "@/components/games/GameShell";
import { useProfile } from "@/hooks/use-profile";
import { TOWER_DIFFICULTIES, TOWER_ROWS, towerLevelMultiplier, sampleUnique, type TowerDifficulty } from "@/lib/games";
import { settleBet } from "@/lib/casino";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/casino/dragon-tower")({
  head: () => ({
    meta: [
      { title: "Dragon Tower — BetBetter" },
      { name: "description", content: "Climb the tower. Pick the safe tile each floor. Multipliers stack." },
    ],
  }),
  component: TowerPage,
});

function TowerPage() {
  const { profile, setBalance } = useProfile();
  const balance = profile?.balance ?? 0;

  const [difficulty, setDifficulty] = useState<TowerDifficulty>("Medium");
  const [bet, setBet] = useState(10);
  const [phase, setPhase] = useState<"idle" | "active" | "busted" | "done">("idle");
  const [rows, setRows] = useState<{ bad: Set<number>; picked: number | null }[]>([]);
  const [level, setLevel] = useState(0);
  const [busy, setBusy] = useState(false);

  const cfg = TOWER_DIFFICULTIES[difficulty];
  const levelMult = towerLevelMultiplier(difficulty);
  const currentMult = +Math.pow(levelMult, level).toFixed(4);
  const nextMult = +Math.pow(levelMult, level + 1).toFixed(4);

  function start() {
    if (bet <= 0 || bet > balance) return;
    setRows(Array.from({ length: TOWER_ROWS }, () => ({ bad: sampleUnique(cfg.tiles, cfg.bad), picked: null })));
    setLevel(0);
    setPhase("active");
  }

  async function settle(payout: number, m: number, outcome: "win" | "loss") {
    setBusy(true);
    try {
      const nb = await settleBet({
        game: "Dragon Tower",
        wager: bet,
        payout,
        multiplier: m,
        outcome,
        meta: { difficulty, level },
      });
      setBalance(nb);
      if (outcome === "win") toast.success(`+${fmt(payout - bet)} BB · ${m.toFixed(2)}×`);
      else toast.error(`−${fmt(bet)} BB · Fell`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function pick(rowIdx: number, tileIdx: number) {
    if (phase !== "active" || rowIdx !== level || busy) return;
    const updated = [...rows];
    updated[rowIdx] = { ...rows[rowIdx], picked: tileIdx };
    setRows(updated);
    if (rows[rowIdx].bad.has(tileIdx)) {
      setPhase("busted");
      settle(0, 0, "loss");
      return;
    }
    const newLevel = level + 1;
    if (newLevel === TOWER_ROWS) {
      const m = +Math.pow(levelMult, newLevel).toFixed(4);
      setPhase("done");
      settle(+(bet * m).toFixed(2), m, "win");
    } else {
      setLevel(newLevel);
    }
  }

  async function cashOut() {
    if (phase !== "active" || level === 0) return;
    setPhase("done");
    await settle(+(bet * currentMult).toFixed(2), currentMult, "win");
  }

  function reset() {
    setPhase("idle");
    setRows([]);
    setLevel(0);
  }

  const display = [...rows].reverse();

  return (
    <GameShell
      title="Dragon Tower"
      slug="dragon-tower"
      accent="#a97af5"
      bet={<BetAmountInput value={bet} onChange={setBet} max={balance} disabled={phase === "active"} />}
      panel={
        <>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Difficulty</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(TOWER_DIFFICULTIES) as TowerDifficulty[]).map((d) => (
                <button
                  key={d}
                  disabled={phase === "active"}
                  onClick={() => setDifficulty(d)}
                  className={`h-9 rounded-md text-xs font-bold border disabled:opacity-40 ${
                    difficulty === d ? "bg-violet/15 border-violet/40 text-violet" : "bg-surface-0 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {phase === "active" && (
            <div className="bg-surface-0 border border-border rounded-md p-3 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Current</span><span className="font-mono font-bold text-violet">{currentMult.toFixed(2)}×</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Next floor</span><span className="font-mono">{nextMult.toFixed(2)}×</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cash out</span><span className="font-mono font-bold text-primary">{fmt(bet * currentMult)} BB</span></div>
            </div>
          )}

          {phase === "idle" ? (
            <button className="btn-primary w-full h-11 rounded-md text-sm" disabled={bet <= 0 || bet > balance} onClick={start}>
              Bet {fmt(bet)} BB
            </button>
          ) : phase === "active" ? (
            <button
              onClick={cashOut}
              disabled={level === 0 || busy}
              className="w-full h-11 rounded-md text-sm font-black bg-gold text-black disabled:opacity-40"
            >
              Cash out {fmt(bet * currentMult)} BB
            </button>
          ) : (
            <button className="btn-primary w-full h-11 rounded-md text-sm" onClick={reset}>
              Play again
            </button>
          )}
        </>
      }
    >
      <div className="mx-auto w-full max-w-xs">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {phase === "active" ? `Floor ${level + 1} / ${TOWER_ROWS}` : "Place a bet to climb"}
          </span>
          <span className="font-mono font-bold text-violet text-base">{currentMult.toFixed(2)}×</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {display.map((row, dIdx) => {
            const rowIdx = TOWER_ROWS - 1 - dIdx;
            const isCurrent = rowIdx === level && phase === "active";
            const isPast = rowIdx < level;
            return (
              <div key={rowIdx} className="flex gap-1.5 items-center">
                <span className="w-6 text-[10px] text-muted-foreground font-mono text-right">
                  {(+Math.pow(levelMult, rowIdx + 1).toFixed(2))}×
                </span>
                {Array.from({ length: cfg.tiles }, (_, tileIdx) => {
                  const picked = row.picked === tileIdx;
                  const bad = row.bad.has(tileIdx);
                  const showBad = picked && bad;
                  const showGood = picked && !bad;
                  const revealAll = phase === "busted" && rowIdx === level && bad;
                  return (
                    <button
                      key={tileIdx}
                      onClick={() => pick(rowIdx, tileIdx)}
                      disabled={!isCurrent || busy}
                      className={`flex-1 h-10 rounded-md border-2 flex items-center justify-center transition-all ${
                        showBad || revealAll
                          ? "bg-red/20 border-red bb-shake"
                          : showGood
                            ? "bg-primary/15 border-primary/50 bb-pop"
                            : isPast
                              ? "bg-surface-0 border-transparent opacity-50"
                              : isCurrent
                                ? "bg-surface-2 border-violet/40 hover:border-violet"
                                : "bg-surface-0 border-transparent opacity-40"
                      }`}
                    >
                      {showBad || revealAll ? <Flame size={16} className="text-red" /> : showGood ? <Gem size={16} className="text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
