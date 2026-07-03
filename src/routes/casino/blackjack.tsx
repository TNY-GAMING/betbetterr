import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GameShell, BetAmountInput } from "@/components/games/GameShell";
import { useProfile } from "@/hooks/use-profile";
import { drawCard, handValue, isBlackjackHand, rankLabel, resolveBlackjack, type Card } from "@/lib/games";
import { settleBet } from "@/lib/casino";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/casino/blackjack")({
  head: () => ({
    meta: [
      { title: "Blackjack — BetBetter" },
      { name: "description", content: "Beat the dealer. Naturals pay 3:2. Dealer stands on all 17s." },
    ],
  }),
  component: BJPage,
});

const LABEL = { win: "You win", lose: "Dealer wins", push: "Push — bet returned", blackjack: "Blackjack!" } as const;

function BJPage() {
  const { profile, setBalance } = useProfile();
  const balance = profile?.balance ?? 0;

  const [bet, setBet] = useState(10);
  const [phase, setPhase] = useState<"betting" | "player" | "dealer" | "dealer-reveal" | "result">("betting");
  const [player, setPlayer] = useState<Card[]>([]);
  const [dealer, setDealer] = useState<Card[]>([]);
  const [doubled, setDoubled] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof resolveBlackjack> | null>(null);
  const [busy, setBusy] = useState(false);

  async function settleRound(p: Card[], d: Card[], wager: number) {
    const res = resolveBlackjack(p, d, wager);
    setResult(res);
    setPhase("result");
    setBusy(true);
    try {
      const outcome = res.outcome === "push" ? "push" : res.payout > 0 ? "win" : "loss";
      const nb = await settleBet({
        game: "Blackjack",
        wager,
        payout: res.payout,
        multiplier: wager > 0 ? +(res.payout / wager).toFixed(4) : 0,
        outcome,
        meta: { player: p.map((c) => c.rank), dealer: d.map((c) => c.rank), result: res.outcome },
      });
      setBalance(nb);
      if (res.outcome === "lose") toast.error(`−${fmt(wager)} BB · Dealer wins`);
      else if (res.outcome === "push") toast(`Push · bet returned`);
      else toast.success(`+${fmt(res.payout - wager)} BB · ${res.outcome === "blackjack" ? "Blackjack!" : "Win"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (phase !== "dealer") return;
    let cancelled = false;
    const wager = doubled ? bet * 2 : bet;
    const step = (hand: Card[]) => {
      if (cancelled) return;
      if (handValue(hand) < 17) {
        setTimeout(() => {
          if (cancelled) return;
          const c = drawCard();
          const next = [...hand, c];
          setDealer(next);
          step(next);
        }, 650);
      } else {
        setTimeout(() => {
          if (!cancelled) settleRound(player, hand, wager);
        }, 500);
      }
    };
    step(dealer);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function deal() {
    if (bet <= 0 || bet > balance) return;
    const p = [drawCard(), drawCard()];
    const d = [drawCard(), drawCard()];
    setPlayer(p); setDealer(d); setDoubled(false); setResult(null);
    if (isBlackjackHand(p) || isBlackjackHand(d)) {
      setPhase("dealer-reveal");
      setTimeout(() => settleRound(p, d, bet), 600);
    } else {
      setPhase("player");
    }
  }

  function hit() {
    if (phase !== "player") return;
    const c = drawCard();
    const next = [...player, c];
    setPlayer(next);
    if (handValue(next) > 21) {
      setPhase("dealer-reveal");
      setTimeout(() => settleRound(next, dealer, bet), 400);
    }
  }

  function stand() {
    if (phase === "player") setPhase("dealer");
  }

  function doubleDown() {
    if (phase !== "player" || player.length !== 2 || bet > balance) return;
    setDoubled(true);
    const c = drawCard();
    const next = [...player, c];
    setPlayer(next);
    if (handValue(next) > 21) {
      setPhase("dealer-reveal");
      setTimeout(() => settleRound(next, dealer, bet * 2), 400);
    } else {
      setPhase("dealer");
    }
  }

  function playAgain() {
    setPhase("betting"); setPlayer([]); setDealer([]); setResult(null);
  }

  const wager = doubled ? bet * 2 : bet;
  const dealerHidden = phase === "player";
  const pTotal = handValue(player);
  const dTotal = handValue(dealer);

  return (
    <GameShell
      title="Blackjack"
      slug="blackjack"
      accent="#e05aa8"
      bet={<BetAmountInput value={bet} onChange={setBet} max={balance} disabled={phase !== "betting"} />}
      panel={
        <>
          {phase === "betting" && (
            <button className="btn-primary w-full h-11 rounded-md text-sm" disabled={bet <= 0 || bet > balance} onClick={deal}>
              Deal · {fmt(bet)} BB
            </button>
          )}
          {phase === "player" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={hit} className="btn-primary h-11 rounded-md text-sm">Hit</button>
                <button onClick={stand} className="h-11 rounded-md text-sm font-black bg-gold text-black">Stand</button>
              </div>
              <button
                onClick={doubleDown}
                disabled={player.length !== 2 || bet > balance}
                className="w-full h-10 rounded-md text-xs font-bold border border-border text-muted-foreground hover:text-foreground hover:bg-surface-2 disabled:opacity-30"
              >
                Double down · {fmt(bet)} BB
              </button>
            </>
          )}
          {(phase === "dealer" || phase === "dealer-reveal") && (
            <button disabled className="w-full h-11 rounded-md text-sm font-bold bg-surface-2 text-muted-foreground">
              Dealer playing…
            </button>
          )}
          {phase === "result" && (
            <button onClick={playAgain} className="btn-primary w-full h-11 rounded-md text-sm" disabled={busy}>
              Play again
            </button>
          )}

          <div className="text-[11px] text-muted-foreground leading-relaxed">
            Naturals pay 3 : 2. Standard wins pay 1 : 1. Dealer stands on all 17s. No split in this build.
          </div>
        </>
      }
    >
      <div className="w-full flex flex-col gap-8 py-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Dealer</span>
            {!dealerHidden && dealer.length > 0 && (
              <span className="font-mono text-sm text-muted-foreground">{dTotal}</span>
            )}
          </div>
          <div className="flex gap-2">
            {dealer.map((c, i) => (
              <CardV key={i} card={c} hidden={dealerHidden && i === 1} />
            ))}
          </div>
        </div>

        <div className="border-t border-border" />

        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">You</span>
            {player.length > 0 && (
              <span className={`font-mono text-sm ${pTotal > 21 ? "text-red" : "text-muted-foreground"}`}>{pTotal}</span>
            )}
            {doubled && <span className="text-[10px] font-black text-gold uppercase">Doubled</span>}
          </div>
          <div className="flex gap-2">
            {player.map((c, i) => <CardV key={i} card={c} />)}
          </div>
        </div>

        {phase === "result" && result && (
          <div className={`text-center py-4 rounded-lg border ${
            result.outcome === "lose" ? "bg-red/10 border-red/30 text-red" :
            result.outcome === "push" ? "bg-surface-2 border-border text-foreground" :
            "bg-primary/10 border-primary/30 text-primary"
          }`}>
            <div className="font-display font-black text-2xl">{LABEL[result.outcome]}</div>
            {result.payout > 0 && (
              <div className="text-sm font-mono mt-1">+{fmt(result.payout - wager)} BB net</div>
            )}
          </div>
        )}
      </div>
    </GameShell>
  );
}

function CardV({ card, hidden }: { card: Card; hidden?: boolean }) {
  if (hidden) {
    return (
      <div className="w-16 h-24 rounded-lg bg-gradient-to-br from-surface-3 to-surface-2 border-2 border-border grid place-items-center bb-flip">
        <div className="w-6 h-6 rounded bg-primary/30" />
      </div>
    );
  }
  return (
    <div
      key={`${card.rank}-${card.suit.symbol}`}
      className="w-16 h-24 rounded-lg bg-surface-2 border-2 border-border flex flex-col items-center justify-center bb-flip"
    >
      <span className={`text-2xl font-black ${card.suit.color}`}>{rankLabel(card.rank)}</span>
      <span className={`text-xl ${card.suit.color}`}>{card.suit.symbol}</span>
    </div>
  );
}
