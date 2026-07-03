import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, Wallet, User, ChevronDown, Menu, X, Search } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { fmt } from "@/lib/format";
import { WalletDialog } from "./WalletDialog";
import { Sidebar, MobileSidebar } from "./Sidebar";
import logo from "@/assets/logo.png";

export function CasinoShell({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const { profile } = useProfile();
  const router = useRouter();
  const [walletOpen, setWalletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  async function signOut() {
    setUserMenu(false);
    await supabase.auth.signOut();
    router.invalidate();
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex sticky top-0 h-screen w-[240px] shrink-0 border-r border-border bg-surface-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-surface-0 border-r border-border">
            <MobileSidebar onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 h-14 flex items-center gap-3 px-3 md:px-5 border-b border-border bg-surface-0/85 backdrop-blur">
          <button
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-surface-2 text-muted-foreground"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <Link to="/" className="lg:hidden flex items-center gap-2">
            <img src={logo} alt="BetBetter" className="w-7 h-7" />
            <span className="font-display font-black text-lg tracking-tight">bet<span className="text-primary">better</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full bg-surface-2 border-0 rounded-md h-9 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border-strong"
                placeholder="Search casino…"
              />
            </div>
          </div>

          <div className="flex-1 md:hidden" />

          {user && profile ? (
            <>
              <button
                onClick={() => setWalletOpen(true)}
                className="group flex items-center gap-2 h-9 px-1 pl-3 rounded-md bg-surface-2 hover:bg-surface-3 transition-colors"
              >
                <span className="font-mono tabular-nums font-semibold text-sm text-foreground">{fmt(profile.balance)}</span>
                <span className="text-[10px] font-bold text-muted-foreground pr-2 -ml-1">BB</span>
                <span className="h-7 px-3 rounded bg-primary text-primary-foreground text-xs font-bold inline-flex items-center gap-1">
                  <Wallet size={13} /> Wallet
                </span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setUserMenu((v) => !v)}
                  className="flex items-center gap-1.5 h-9 pl-2 pr-2 rounded-md hover:bg-surface-2 text-sm"
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-teal grid place-items-center text-primary-foreground font-black text-xs">
                    {profile.username.slice(0, 1).toUpperCase()}
                  </span>
                  <ChevronDown size={14} className="text-muted-foreground hidden md:block" />
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-full mt-2 min-w-[200px] card-panel p-1.5 shadow-panel z-50">
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <div className="text-[11px] text-muted-foreground">Signed in as</div>
                      <div className="font-semibold text-sm truncate">{profile.username}</div>
                    </div>
                    <button className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-surface-2 flex items-center gap-2">
                      <User size={14} /> Account
                    </button>
                    <button onClick={signOut} className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-surface-2 flex items-center gap-2 text-red">
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/auth" search={{ mode: "signin" }} className="h-9 px-4 rounded-md text-sm font-bold hover:bg-surface-2 inline-flex items-center">
                Sign in
              </Link>
              <Link to="/auth" search={{ mode: "signup" }} className="btn-primary h-9 px-4 rounded-md text-sm inline-flex items-center">
                Register
              </Link>
            </div>
          )}
        </header>

        <main className="flex-1 min-w-0">{children}</main>

        {/* Live bet feed marquee */}
        <LiveTicker />
      </div>

      {walletOpen && <WalletDialog onClose={() => setWalletOpen(false)} />}
    </div>
  );
}

function LiveTicker() {
  const feed = [
    "octopus_prime cashed 24.11× on Crash — +2,411.00 BB",
    "vega_88 hit 5 gems on Mines — +812.40 BB",
    "cryptowolf climbed 9 floors on Dragon Tower — +1,432.90 BB",
    "moonwake beat the dealer on Blackjack — +150.00 BB",
    "nova_flux caught 7 hits on Keno — +2,800.00 BB",
    "solaris_x nailed higher×higher on Hilo — +214.60 BB",
  ];
  const doubled = [...feed, ...feed];
  return (
    <div className="border-t border-border bg-surface-0/60 overflow-hidden">
      <div className="flex whitespace-nowrap marquee-track">
        {doubled.map((line, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-6 py-2 text-xs text-muted-foreground">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" /> {line}
          </span>
        ))}
      </div>
    </div>
  );
}
