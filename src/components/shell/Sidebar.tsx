import { Link } from "@tanstack/react-router";
import {
  Dice5, Rocket, Bomb, ArrowUpDown, Grid3x3, Spade, Layers,
  Home, Trophy, Sparkles, Users, LifeBuoy, ShieldCheck, Settings as SettingsIcon,
} from "lucide-react";
import logo from "@/assets/logo.png";

const primaryNav = [
  { to: "/", label: "Casino", icon: Home },
  { to: "/casino/crash", label: "Crash", icon: Rocket, tag: "hot" },
  { to: "/casino/mines", label: "Mines", icon: Bomb },
  { to: "/casino/dragon-tower", label: "Dragon Tower", icon: Layers },
  { to: "/casino/hilo", label: "Hilo", icon: ArrowUpDown },
  { to: "/casino/keno", label: "Keno", icon: Grid3x3 },
  { to: "/casino/blackjack", label: "Blackjack", icon: Spade },
] as const;

const accountNav = [
  { to: "/settings", label: "Account settings", icon: SettingsIcon },
] as const;

const secondaryNav = [
  { label: "Promotions", icon: Sparkles },
  { label: "VIP Club", icon: Trophy },
  { label: "Affiliate", icon: Users },
  { label: "Support", icon: LifeBuoy },
  { label: "Responsible Play", icon: ShieldCheck },
] as const;

function LinkItem({
  to,
  label,
  Icon,
  tag,
  onClick,
}: {
  to: string;
  label: string;
  Icon: typeof Home;
  tag?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      activeOptions={{ exact: to === "/" }}
      className="group flex items-center gap-3 h-10 px-3 rounded-md text-[13px] font-semibold text-muted-foreground hover:bg-surface-2 hover:text-foreground data-[status=active]:bg-surface-2 data-[status=active]:text-foreground"
    >
      <Icon size={18} className="shrink-0 group-hover:text-primary group-data-[status=active]:text-primary" />
      <span className="flex-1 truncate">{label}</span>
      {tag && (
        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red text-white">
          {tag}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  return (
    <div className="flex flex-col w-full h-full">
      <Link to="/" onClick={onNavigate} className="h-14 shrink-0 flex items-center gap-2 px-4 border-b border-border">
        <img src={logo} alt="BetBetter" className="w-8 h-8" />
        <span className="font-display font-black text-lg tracking-tight">
          bet<span className="text-primary">better</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto p-2 space-y-6">
        <div className="space-y-0.5">
          <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Games
          </div>
          {primaryNav.map((n) => (
            <LinkItem key={n.to} to={n.to} label={n.label} Icon={n.icon} tag={"tag" in n ? n.tag : undefined} onClick={onNavigate} />
          ))}
        </div>

        <div className="space-y-0.5">
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            Account
          </div>
          {accountNav.map((n) => (
            <LinkItem key={n.to} to={n.to} label={n.label} Icon={n.icon} onClick={onNavigate} />
          ))}
        </div>

        <div className="space-y-0.5">
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            More
          </div>
          {secondaryNav.map((n) => (
            <div
              key={n.label}
              className="flex items-center gap-3 h-10 px-3 rounded-md text-[13px] font-semibold text-muted-foreground/70 cursor-not-allowed opacity-60"
              title="Coming soon"
            >
              <n.icon size={18} />
              <span className="flex-1">{n.label}</span>
            </div>
          ))}
        </div>
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Dice5 size={14} className="text-primary" />
          <span>Provably fair · 1% edge</span>
        </div>
      </div>
    </div>
  );
}

export function MobileSidebar({ onNavigate }: { onNavigate: () => void }) {
  return <Sidebar onNavigate={onNavigate} />;
}
