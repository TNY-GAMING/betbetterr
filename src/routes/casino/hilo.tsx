import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { GameShell, BetAmountInput } from "@/components/games/GameShell";
import { useProfile } from "@/hooks/use-profile";
import { hiloMultiplier, randInt, randomSuit, rankLabel, SUITS } from "@/lib/games";
import { settleBet } from "@/lib/casino";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/casino/hilo")({
  head: () => ({
    meta: [
      { title: "Hilo — BetBetter" },
      { name: "description", content: "Guess higher or lower on the next card. Multipliers scale with the odds." },
    ],
  }),
  component: HiloPage,
});

type CardT = { rank: number; suit: (typeof SUITS)[number] };

function HiloPage() {
  const { profile, setBalance } = useProfile();
  const balance = profile?.balance ?? 0;

  const [bet, setBet] = useState(10);
  const [phase, setPhase] = useState<"idle" | "active" | "busted" | "done">("idle");
  const [card, setCard] = useState<CardT>({ rank: 7, suit: SUITS[0] });
  const [history, setHistory] = useState<number[]>([]);
  const [mult, setMult] = useState(1);
  const [flash, setFlash] = useState<{ rank: number; suit: (typeof SUITS)[number]; correct: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  function start() {
    if (bet <= 0 || bet > balance) return;
    const r = randInt(1, 13);
    setCard({ rank: r, suit: randomSuit() });
    setHistory([r]);
    setMult(1);
    setPhase("active");
  }

  async function settle(payout: number, m: number, outcome: "win" | "loss") {
    setBusy(true);
    try {
      const nb = await settleBet({
        game: "Hilo",
        wager: bet,
        payout,
        multiplier: m,
        outcome,
        meta: { streak: history.length - 1 },
      });
      setBalance(nb);
      if (outcome === "win") toast.success(`+${fmt(payout - bet)} BB · ${m.toFixed(2)}×`);
      else toast.error(`−${fmt(bet)} BB · Wrong call`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function guess(dir: "higher" | "lower") {
    if (phase !== "active" || flash || busy) return;
    const newRank = randInt(1, 13);
    const newSuit = randomSuit();
    const correct = dir === "higher" ? newRank > card.rank : newRank < card.rank;
    setFlash({ rank: newRank, suit: newSuit, correct });
    if (correct) {
      const m = hiloMultiplier(card.rank, dir);
      const nextMult = +(mult * m).toFixed(4);
      setMult(nextMult);
      setTimeout(() => {
        setCard({ rank: newRank, suit: newSuit });
        setHistory((h) => [...h, newRank]);
        setFlash(null);
      }, 500);
    } else {
      setTimeout(() => {
        setCard({ rank: newRank, suit: newSuit });
        setPhase("busted");
        setFlash(null);
        settle(0, mult, "loss");
      }, 500);
    }
  }

  async function cashOut() {
    if (phase !== "active" || history.length < 2) return;
    const payout = +(bet * mult).toFixed(2);
    setPhase("done");
    await settle(payout, mult, "win");
  }

  function reset() {
    setPhase("idle");
    setHistory([]);
    setMult(1);
    setFlash(null);
  }

  const higherM = hiloMultiplier(card.rank, "higher");
  const lowerM = hiloMultiplier(card.rank, "lower");

  return (
    <GameShell
      title="Hilo"
      slug="hilo"
      accent="#4fb4f5"
      bet={<BetAmountInput value={bet} onChange={setBet} max={balance} disabled={phase === "active"} />}
      panel={
        <>
          {phase === "active" && (
            <div className="bg-surface-0 border border-border rounded-md p-3 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Streak</span><span className="font-mono">{history.length - 1}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Multiplier</span><span className="font-mono font-bold text-sky">{mult.toFixed(2)}×</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cash out</span><span className="font-mono font-bold text-primary">{fmt(bet * mult)} BB</span></div>
            </div>
          )}

          {phase === "idle" || phase === "busted" || phase === "done" ? (
            <button className="btn-primary w-full h-11 rounded-md text-sm" disabled={bet <= 0 || bet > balance} onClick={phase === "idle" ? start : reset}>
              {phase === "idle" ? `Bet ${fmt(bet)} BB` : "Play again"}
            </button>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => guess("higher")}
                  disabled={higherM === 0 || !!flash || busy}
                  className="h-14 rounded-md bg-primary/10 border border-primary/30 text-primary font-bold flex flex-col items-center justify-center gap-0.5 disabled:opacity-30 hover:bg-primary/20"
                >
                  <TrendingUp size={16} />
                  <span className="font-mono text-xs">{higherM > 0 ? `${higherM.toFixed(2)}×` : "—"}</span>
                  <span className="text-[10px] uppercase tracking-wider">Higher</span>
                </button>
                <button
                  onClick={() => guess("lower")}
                  disabled={lowerM === 0 || !!flash || busy}
                  className="h-14 rounded-md bg-red/10 border border-red/30 text-red font-bold flex flex-col items-center justify-center gap-0.5 disabled:opacity-30 hover:bg-red/20"
                >
                  <TrendingDown size={16} />
                  <span className="font-mono text-xs">{lowerM > 0 ? `${lowerM.toFixed(2)}×` : "—"}</span>
                  <span className="text-[10px] uppercase tracking-wider">Lower</span>
                </button>
              </div>
              <button
                onClick={cashOut}
                disabled={history.length < 2 || busy}
                className="w-full h-11 rounded-md text-sm font-black bg-gold text-black disabled:opacity-40"
              >
                Cash out {fmt(bet * mult)} BB
              </button>
            </>
          )}

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Equal ranks lose. Odds and payouts scale directly with the probability at each step.
          </p>
        </>
      }
    >
      <div className="flex flex-col items-center gap-6 py-6">
        {flash ? (
          <div className="w-28 h-40 rounded-xl bg-surface-2 border-2 border-border flex flex-col items-center justify-center animate-pulse">
            <span className={`text-5xl font-black ${flash.suit.color}`}>{rankLabel(flash.rank)}</span>
            <span className={`text-3xl ${flash.suit.color}`}>{flash.suit.symbol}</span>
          </div>
        ) : (
          <div
            key={`${card.rank}-${card.suit.symbol}`}
            className={`w-32 h-44 rounded-xl bg-surface-2 border-2 flex flex-col items-center justify-center bb-flip ${
              phase === "busted" ? "border-red bb-shake" : "border-border"
            }`}
          >
            <span className={`text-6xl font-black ${card.suit.color}`}>{rankLabel(card.rank)}</span>
            <span className={`text-4xl ${card.suit.color}`}>{card.suit.symbol}</span>
          </div>
        )}

        <div className="flex gap-1.5 flex-wrap justify-center max-w-md">
          {history.map((r, i) => (
            <span key={i} className="w-7 h-9 grid place-items-center bg-surface-2 border border-border rounded text-xs font-bold">
              {rankLabel(r)}
            </span>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
