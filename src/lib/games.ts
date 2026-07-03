// Pure math helpers for the casino games. 1% house edge applied uniformly.
export const EDGE = 0.99;

export function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sampleUnique(poolSize: number, count: number): Set<number> {
  const pool = Array.from({ length: poolSize }, (_, i) => i);
  const out = new Set<number>();
  for (let i = 0; i < count; i++) {
    const idx = randInt(0, pool.length - 1);
    out.add(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

/* ---------- Mines ---------- */
export function minesMultiplier(total: number, mines: number, picks: number) {
  if (picks <= 0) return 1;
  const safe = total - mines;
  let fair = 1;
  for (let i = 0; i < picks; i++) fair *= (total - i) / (safe - i);
  return +(fair * EDGE).toFixed(4);
}

/* ---------- Dragon Tower ---------- */
export const TOWER_DIFFICULTIES = {
  Easy: { tiles: 4, bad: 1 },
  Medium: { tiles: 3, bad: 1 },
  Hard: { tiles: 2, bad: 1 },
  Expert: { tiles: 3, bad: 2 },
} as const;
export type TowerDifficulty = keyof typeof TOWER_DIFFICULTIES;
export const TOWER_ROWS = 9;
export function towerLevelMultiplier(difficulty: TowerDifficulty) {
  const { tiles, bad } = TOWER_DIFFICULTIES[difficulty];
  return (tiles / (tiles - bad)) * EDGE;
}

/* ---------- Hilo ---------- */
export type HiloDir = "higher" | "lower";
export function hiloProbability(rank: number, direction: HiloDir) {
  if (direction === "higher") return (13 - rank) / 13;
  return (rank - 1) / 13;
}
export function hiloMultiplier(rank: number, direction: HiloDir) {
  const p = hiloProbability(rank, direction);
  if (p <= 0) return 0;
  return +(EDGE / p).toFixed(4);
}

export const RANK_LABEL: Record<number, string> = { 1: "A", 11: "J", 12: "Q", 13: "K" };
export const rankLabel = (r: number) => RANK_LABEL[r] ?? String(r);
export const SUITS = [
  { symbol: "♠", color: "text-foreground" },
  { symbol: "♥", color: "text-red" },
  { symbol: "♦", color: "text-red" },
  { symbol: "♣", color: "text-foreground" },
] as const;
export const randomSuit = () => SUITS[randInt(0, 3)];

/* ---------- Crash ---------- */
export function generateCrashPoint() {
  const r = Math.random();
  if (r < 1 - EDGE) return 1.0;
  const point = EDGE / (1 - r);
  return Math.max(1.0, Math.floor(point * 100) / 100);
}
export function crashCurveMultiplier(elapsedSeconds: number) {
  return +Math.pow(Math.E, 0.13 * elapsedSeconds).toFixed(2);
}

/* ---------- Keno ---------- */
export const KENO_PAYTABLE: Record<number, Record<number, number>> = {
  1: { 0: 0, 1: 3.8 },
  2: { 0: 0, 1: 1, 2: 5.5 },
  3: { 0: 0, 1: 0, 2: 2.5, 3: 11 },
  4: { 0: 0, 1: 0, 2: 1.8, 3: 5, 4: 22 },
  5: { 0: 0, 1: 0, 2: 1.5, 3: 3, 4: 13, 5: 40 },
  6: { 0: 0, 1: 0, 2: 1, 3: 2, 4: 6, 5: 20, 6: 80 },
  7: { 0: 0, 1: 0, 2: 0.5, 3: 1.5, 4: 4, 5: 12, 6: 40, 7: 100 },
  8: { 0: 0, 1: 0, 2: 0.5, 3: 1, 4: 2.5, 5: 6, 6: 20, 7: 60, 8: 150 },
  9: { 0: 0, 1: 0, 2: 0, 3: 1, 4: 2, 5: 5, 6: 15, 7: 40, 8: 100, 9: 250 },
  10: { 0: 0, 1: 0, 2: 0, 3: 0.5, 4: 1.5, 5: 3, 6: 8, 7: 25, 8: 60, 9: 150, 10: 500 },
};

/* ---------- Blackjack ---------- */
export type Card = { rank: number; suit: (typeof SUITS)[number] };
export const drawCard = (): Card => ({ rank: randInt(1, 13), suit: randomSuit() });
export function handValue(cards: Card[]) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const v = c.rank === 1 ? 11 : Math.min(c.rank, 10);
    total += v;
    if (c.rank === 1) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}
export const isBlackjackHand = (c: Card[]) => c.length === 2 && handValue(c) === 21;

export type BJOutcome = "win" | "lose" | "push" | "blackjack";
export function resolveBlackjack(p: Card[], d: Card[], wager: number): { outcome: BJOutcome; payout: number } {
  const pBJ = isBlackjackHand(p), dBJ = isBlackjackHand(d);
  const pv = handValue(p), dv = handValue(d);
  if (pBJ && dBJ) return { outcome: "push", payout: wager };
  if (pBJ) return { outcome: "blackjack", payout: +(wager * 2.5 * EDGE).toFixed(2) };
  if (pv > 21) return { outcome: "lose", payout: 0 };
  if (dBJ) return { outcome: "lose", payout: 0 };
  if (dv > 21) return { outcome: "win", payout: +(wager * 2 * EDGE).toFixed(2) };
  if (pv > dv) return { outcome: "win", payout: +(wager * 2 * EDGE).toFixed(2) };
  if (pv < dv) return { outcome: "lose", payout: 0 };
  return { outcome: "push", payout: wager };
}
