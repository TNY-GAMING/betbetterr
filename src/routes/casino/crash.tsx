import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Rocket } from "lucide-react";
import { toast } from "sonner";
import { GameShell, BetAmountInput } from "@/components/games/GameShell";
import { useProfile } from "@/hooks/use-profile";
import { crashCurveMultiplier, generateCrashPoint } from "@/lib/games";
import { settleBet } from "@/lib/casino";
import { fmt, clamp } from "@/lib/format";

export const Route = createFileRoute("/casino/crash")({
  head: () => ({
    meta: [
      { title: "Crash — BetBetter" },
      { name: "description", content: "Watch the multiplier climb. Cash out before it crashes." },
    ],
  }),
  component: CrashPage,
});

function CrashPage() {
  const { profile, setBalance } = useProfile();
  const balance = profile?.balance ?? 0;

  const [bet, setBet] = useState(10);
  const [autoCashout, setAutoCashout] = useState<number | "">(2);
  const [phase, setPhase] = useState<"waiting" | "running" | "crashed">("waiting");
  const [countdown, setCountdown] = useState(5);
  const [multiplier, setMultiplier] = useState(1);
  const [activeBet, setActiveBet] = useState<number | null>(null);
  const [queuedBet, setQueuedBet] = useState<number | null>(null);
  const [cashedAt, setCashedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  const crashRef = useRef(1);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef<number | null>(null);
  const cashedRef = useRef<number | null>(null);
  const queuedRef = useRef<number | null>(null);
  const autoRef = useRef<number | "">(2);

  useEffect(() => { activeRef.current = activeBet; }, [activeBet]);
  useEffect(() => { cashedRef.current = cashedAt; }, [cashedAt]);
  useEffect(() => { queuedRef.current = queuedBet; }, [queuedBet]);
  useEffect(() => { autoRef.current = autoCashout; }, [autoCashout]);

  const doCashout = useCallback(async (m: number) => {
    if (!activeRef.current || cashedRef.current) return;
    const wager = activeRef.current;
    const payout = +(wager * m).toFixed(2);
    cashedRef.current = m;
    setCashedAt(m);
    try {
      const nb = await settleBet({
        game: "Crash",
        wager,
        payout,
        multiplier: m,
        outcome: "win",
        meta: { cashedAt: m },
      });
      setBalance(nb);
      toast.success(`Cashed at ${m.toFixed(2)}× · +${fmt(payout - wager)} BB`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cash out");
    }
  }, [setBalance]);

  const runRound = useCallback(() => {
    crashRef.current = generateCrashPoint();
    startRef.current = performance.now();
    setPhase("running");
    setMultiplier(1);
    setCashedAt(null);
    cashedRef.current = null;

    const tick = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      const m = crashCurveMultiplier(elapsed);
      const target = autoRef.current;
      if (activeRef.current && !cashedRef.current && typeof target === "number" && target > 1 && m >= target && m < crashRef.current) {
        doCashout(target);
      }
      if (m >= crashRef.current) {
        setMultiplier(crashRef.current);
        setPhase("crashed");
        setHistory((h) => [crashRef.current, ...h].slice(0, 14));
        if (activeRef.current && !cashedRef.current) {
          const wager = activeRef.current;
          settleBet({
            game: "Crash",
            wager,
            payout: 0,
            multiplier: crashRef.current,
            outcome: "loss",
            meta: { crashedAt: crashRef.current },
          }).then((nb) => setBalance(nb)).catch(() => {});
          toast.error(`Crashed at ${crashRef.current.toFixed(2)}× · −${fmt(wager)} BB`);
        }
        setTimeout(() => {
          setActiveBet(null);
          activeRef.current = null;
          setCountdown(5);
          setPhase("waiting");
        }, 2500);
        return;
      }
      setMultiplier(m);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [doCashout, setBalance]);

  useEffect(() => {
    if (phase !== "waiting") return;
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          const q = queuedRef.current;
          if (q) {
            setActiveBet(q);
            activeRef.current = q;
            setQueuedBet(null);
            queuedRef.current = null;
          }
          runRound();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, runRound]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const placeBet = () => {
    if (bet <= 0 || bet > balance || queuedBet) return;
    setQueuedBet(bet);
  };
  const cancelQueue = () => setQueuedBet(null);

  const canCashout = phase === "running" && activeBet && !cashedAt;

  return (
    <GameShell
      title="Crash"
      slug="crash"
      accent="#f5b544"
      bet={<BetAmountInput value={bet} onChange={setBet} max={balance} disabled={!!queuedBet || !!activeBet} />}
      panel={
        <>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Auto cash out</div>
            <div className="flex bg-surface-0 border border-border rounded-md overflow-hidden">
              <input
                type="number"
                min={1.01}
                step={0.1}
                value={autoCashout}
                onChange={(e) => setAutoCashout(e.target.value === "" ? "" : Math.max(1.01, Number(e.target.value)))}
                className="flex-1 min-w-0 h-10 bg-transparent px-3 text-sm font-mono focus:outline-none"
                placeholder="off"
              />
              <span className="w-11 grid place-items-center text-xs text-muted-foreground border-l border-border">×</span>
            </div>
          </div>

          {canCashout ? (
            <button
              onClick={() => doCashout(multiplier)}
              className="w-full h-11 rounded-md text-sm font-black bg-gold text-black bb-pulse-glow"
            >
              Cash out {fmt((activeBet ?? 0) * multiplier)} BB
            </button>
          ) : queuedBet ? (
            <button onClick={cancelQueue} className="w-full h-11 rounded-md text-sm font-bold bg-surface-2 hover:bg-surface-3">
              Cancel queued bet ({fmt(queuedBet)} BB)
            </button>
          ) : (
            <button
              onClick={placeBet}
              disabled={bet <= 0 || bet > balance || phase !== "waiting"}
              className="btn-primary w-full h-11 rounded-md text-sm"
            >
              Bet {fmt(bet)} BB · Next round
            </button>
          )}

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Queue a bet before the round starts, then cash out before the multiplier crashes. Miss the window and the
            bet is lost.
          </p>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* History */}
        <div className="flex gap-1 flex-wrap">
          {history.map((h, i) => (
            <span
              key={i}
              className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                h >= 2 ? "bg-primary/15 text-primary" : "bg-red/15 text-red"
              }`}
            >
              {h.toFixed(2)}×
            </span>
          ))}
          {history.length === 0 && <span className="text-xs text-muted-foreground">Round history appears here.</span>}
        </div>

        {/* Main crash display */}
        <div className="relative h-[340px] rounded-xl overflow-hidden bg-surface-0 border border-border">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,oklch(0.85_0.18_85_/_0.18),transparent_60%)]" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div
                className={`font-display font-black text-6xl md:text-8xl tabular-nums transition-colors ${
                  phase === "crashed" ? "text-red bb-shake" : phase === "running" ? "text-foreground" : "text-muted-foreground"
                }`}
                style={{
                  textShadow: phase === "running" ? "0 0 40px oklch(0.85 0.18 85 / 0.4)" : undefined,
                }}
              >
                {multiplier.toFixed(2)}×
              </div>
              <div className="mt-3 text-sm text-muted-foreground uppercase tracking-widest font-bold">
                {phase === "waiting" && `Next round in ${countdown}s`}
                {phase === "running" && "Flying"}
                {phase === "crashed" && "Crashed"}
              </div>
            </div>
          </div>
          {/* progress bar */}
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-surface-2">
            <div
              className={`h-full transition-all duration-100 ${phase === "crashed" ? "bg-red" : "bg-gold"}`}
              style={{ width: `${clamp(((multiplier - 1) / 5) * 100, 2, 100)}%` }}
            />
          </div>
          {activeBet && (
            <div className="absolute top-3 left-3 text-[11px] px-2 py-1 rounded bg-surface-2 border border-border">
              <span className="text-muted-foreground">Bet </span>
              <span className="font-mono font-bold">{fmt(activeBet)} BB</span>
            </div>
          )}
          <Rocket
            size={22}
            className={`absolute top-3 right-3 ${phase === "running" ? "text-gold" : "text-muted-foreground"}`}
          />
        </div>
      </div>
    </GameShell>
  );
}
