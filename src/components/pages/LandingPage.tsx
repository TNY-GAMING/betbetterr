import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { CasinoShell } from "@/components/shell/CasinoShell";
import { GAMES } from "@/lib/casino";
import { Rocket, Bomb, ArrowUpDown, Grid3x3, Spade, Layers, Trophy, Zap, ShieldCheck, PartyPopper } from "lucide-react";
import logo from "@/assets/logo.png";

export function LandingPage() {
  const { user, loading } = useSession();
  if (loading) return null;
  return <CasinoShell>{user ? <LobbyView /> : <MarketingLanding />}</CasinoShell>;
}

/* -------------------- LOBBY (signed-in) -------------------- */

const iconMap = {
  crash: Rocket,
  mines: Bomb,
  "dragon-tower": Layers,
  hilo: ArrowUpDown,
  keno: Grid3x3,
  blackjack: Spade,
} as const;

function LobbyView() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-10">
      {/* Hero banner */}
      <section className="relative rounded-2xl overflow-hidden bg-casino-radial border border-border">
        <div className="relative p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-primary/15 text-primary text-[11px] font-black uppercase tracking-wider">
              <PartyPopper size={12} /> Welcome bonus · 200% on first deposit
            </div>
            <h1 className="mt-4 font-display text-3xl md:text-5xl font-black leading-tight">
              The house has an <span className="text-primary">edge</span>.
              <br className="hidden md:block" />
              We only take <span className="text-primary">1%</span>.
            </h1>
            <p className="mt-3 text-muted-foreground max-w-xl">
              Six original games, provably fair odds, instant settlement. Play with BetBetter Coin — free demo funds
              on every sign‑up.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/casino/crash" className="btn-primary h-11 px-6 rounded-md inline-flex items-center gap-2 text-sm">
                <Rocket size={16} /> Play Crash
              </Link>
              <Link to="/casino/mines" className="h-11 px-6 rounded-md bg-surface-2 hover:bg-surface-3 text-sm font-bold inline-flex items-center gap-2">
                <Bomb size={16} /> Play Mines
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Games grid */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-black">BetBetter Originals</h2>
            <p className="text-sm text-muted-foreground">In-house games. Transparent math. 1% edge across every game.</p>
          </div>
          <span className="text-xs text-muted-foreground hidden md:block">{GAMES.length} games</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {GAMES.map((g) => {
            const Icon = iconMap[g.slug];
            return (
              <Link
                key={g.slug}
                to={`/casino/${g.slug}` as string}
                className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-border bg-surface-1 hover:border-border-strong transition-all hover:-translate-y-0.5"
                style={{
                  backgroundImage: `linear-gradient(155deg, ${g.from} 0%, ${g.to} 55%, #0f212e 100%)`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="relative h-full flex flex-col justify-between p-4">
                  <Icon size={32} className="text-white/95 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-white/75">BetBetter</div>
                    <div className="font-display text-lg font-black text-white leading-tight">{g.name}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* -------------------- MARKETING (signed-out) -------------------- */

function MarketingLanding() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  async function quickRegister(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { username } },
      });
      if (error) throw error;
      toast.success("Account created — welcome to BetBetter.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-casino-radial" />
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,oklch(0.86_0.28_143_/_0.12),transparent_60%)]" />

        <div className="relative max-w-7xl mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-16 md:pb-24 grid lg:grid-cols-[1.15fr_1fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-primary/15 text-primary text-[11px] font-black uppercase tracking-wider">
              <Zap size={12} /> New player · 1,000 BB free
            </div>
            <h1 className="mt-5 font-display text-4xl sm:text-5xl md:text-6xl font-black leading-[1.02] tracking-tight">
              Serious games.
              <br />
              <span className="text-primary">Serious edge.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              Crash, Mines, Dragon Tower, Hilo, Keno, Blackjack — a house edge of exactly 1%, no hidden vig, instant
              cashouts. Built for players who read the paytable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <Link to="/auth" search={{ mode: "signup" }} className="btn-primary h-12 px-7 rounded-md inline-flex items-center gap-2 text-sm">
                Create free account
              </Link>
              <Link to="/auth" search={{ mode: "signin" }} className="h-12 px-6 rounded-md bg-surface-2 hover:bg-surface-3 text-sm font-bold inline-flex items-center">
                Sign in
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-2">
                <ShieldCheck size={14} className="text-primary" /> Provably fair
              </div>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6 max-w-lg">
              {[
                ["1%", "House edge"],
                ["0", "Fees"],
                ["6", "Originals"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-display text-3xl font-black text-primary">{n}</div>
                  <div className="text-xs text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Inline quick sign-up */}
          <div className="card-panel shadow-panel p-6 md:p-7">
            <div className="flex items-center gap-2 mb-1">
              <img src={logo} alt="" className="w-6 h-6" />
              <div className="font-display font-black text-sm tracking-wide">
                bet<span className="text-primary">better</span>
              </div>
            </div>
            <h2 className="font-display text-2xl font-black">Start playing in 20 seconds</h2>
            <p className="text-sm text-muted-foreground mt-1">Free 1,000 BB on sign-up. No credit card.</p>
            <form onSubmit={quickRegister} className="mt-5 space-y-3">
              <Field label="Username">
                <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={20} placeholder="lucky_seven" className={inputCls} />
              </Field>
              <Field label="Email">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@domain.com" />
              </Field>
              <Field label="Password">
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
              </Field>
              <button className="btn-primary w-full h-11 rounded-md text-sm" disabled={busy}>
                {busy ? "Creating account…" : "Play now"}
              </button>
              <div className="text-[11px] text-muted-foreground text-center">
                Already have an account?{" "}
                <Link to="/auth" search={{ mode: "signin" }} className="text-primary font-semibold hover:underline">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, title: "Fair by math", body: "Every payout scales from the true probability minus a flat 1% edge. No mystery RTP." },
            { icon: Zap, title: "Instant settlement", body: "Every bet is atomic. Your balance updates the instant a round resolves." },
            { icon: Trophy, title: "Real leaderboards", body: "Compete for weekly high multipliers and top wagers across every original." },
          ].map(({ icon: I, title, body }) => (
            <div key={title} className="card-panel p-5">
              <I size={22} className="text-primary" />
              <div className="mt-3 font-display font-bold text-lg">{title}</div>
              <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{body}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const inputCls =
  "w-full h-11 rounded-md bg-surface-0 border border-border px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-border-strong";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}
