import { Link } from "@tanstack/react-router";
import { ArrowLeft, LogIn } from "lucide-react";
import type { ReactNode } from "react";
import { CasinoShell } from "@/components/shell/CasinoShell";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { fmt } from "@/lib/format";

export function GameShell({
  title,
  slug,
  accent = "#00e701",
  bet,
  panel,
  children,
}: {
  title: string;
  slug: string;
  accent?: string;
  bet: ReactNode; // top of side panel
  panel: ReactNode; // rest of side panel
  children: ReactNode; // main game board
}) {
  const { user, loading } = useSession();
  const { profile } = useProfile();

  if (loading) {
    return (
      <CasinoShell>
        <div className="h-[60vh] grid place-items-center text-muted-foreground text-sm">Loading…</div>
      </CasinoShell>
    );
  }

  if (!user) {
    return (
      <CasinoShell>
        <SignInWall slug={slug} title={title} />
      </CasinoShell>
    );
  }

  return (
    <CasinoShell>
      <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-6">
        {/* breadcrumb */}
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft size={12} /> Casino
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">{title}</span>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
          {/* Side control panel */}
          <aside className="card-panel p-4 lg:sticky lg:top-16 order-2 lg:order-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
              <h1 className="font-display text-lg font-black">{title}</h1>
            </div>

            <div className="space-y-3">
              {bet}
              {panel}

              <div className="pt-3 border-t border-border text-[11px] text-muted-foreground flex justify-between">
                <span>Balance</span>
                <span className="font-mono tabular-nums text-foreground">
                  {profile ? fmt(profile.balance) : "—"} BB
                </span>
              </div>
            </div>
          </aside>

          {/* Game board */}
          <section className="card-panel p-4 md:p-6 min-h-[420px] order-1 lg:order-2">
            {children}
          </section>
        </div>
      </div>
    </CasinoShell>
  );
}

function SignInWall({ slug, title }: { slug: string; title: string }) {
  return (
    <div className="min-h-[60vh] grid place-items-center px-4">
      <div className="max-w-md w-full card-panel p-8 text-center">
        <LogIn size={26} className="text-primary mx-auto" />
        <h2 className="mt-3 font-display text-2xl font-black">Sign in to play {title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Create a free BetBetter account and we'll drop 1,000 BB in your wallet to try every game.
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          <Link
            to="/auth"
            search={{ mode: "signup", redirect: `/casino/${slug}` }}
            className="btn-primary h-11 px-6 rounded-md text-sm inline-flex items-center"
          >
            Register free
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signin", redirect: `/casino/${slug}` }}
            className="h-11 px-5 rounded-md bg-surface-2 hover:bg-surface-3 text-sm font-bold inline-flex items-center"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

/* Reusable bet-amount control */
export function BetAmountInput({
  value,
  onChange,
  max,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Bet amount</div>
        <div className="text-[11px] text-muted-foreground font-mono">{fmt(value)} BB</div>
      </div>
      <div className="flex bg-surface-0 border border-border rounded-md overflow-hidden">
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="flex-1 min-w-0 h-10 bg-transparent px-3 text-sm font-mono focus:outline-none disabled:opacity-60"
        />
        <button
          disabled={disabled}
          onClick={() => onChange(Math.max(0, Math.floor(value / 2)))}
          className="w-11 text-xs font-bold text-muted-foreground hover:text-foreground border-l border-border disabled:opacity-40"
        >
          ½
        </button>
        <button
          disabled={disabled}
          onClick={() => onChange(Math.min(max, value * 2 || 1))}
          className="w-11 text-xs font-bold text-muted-foreground hover:text-foreground border-l border-border disabled:opacity-40"
        >
          2×
        </button>
        <button
          disabled={disabled}
          onClick={() => onChange(Math.max(1, Math.floor(max)))}
          className="w-11 text-[10px] font-bold text-muted-foreground hover:text-foreground border-l border-border disabled:opacity-40"
        >
          MAX
        </button>
      </div>
    </div>
  );
}
