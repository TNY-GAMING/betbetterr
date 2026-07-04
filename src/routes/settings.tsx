import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User as UserIcon,
  Image as ImageIcon,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
  Receipt,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
} from "lucide-react";
import { CasinoShell } from "@/components/shell/CasinoShell";
import { useSession } from "@/hooks/use-session";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Account settings — BetBetter" },
      { name: "description", content: "Manage your BetBetter profile, review sessions, bets and transactions." },
    ],
  }),
  component: SettingsPage,
});

type Tab = "profile" | "bets" | "transactions" | "security";

function SettingsPage() {
  const { user, session, loading } = useSession();
  const [tab, setTab] = useState<Tab>("profile");
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin", redirect: "/settings" } });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <CasinoShell>
        <div className="h-[60vh] grid place-items-center text-muted-foreground text-sm">
          <Loader2 className="animate-spin" />
        </div>
      </CasinoShell>
    );
  }

  return (
    <CasinoShell>
      <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-8">
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Casino</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Settings</span>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-4 items-start">
          <aside className="card-panel p-2">
            <TabLink label="Profile" icon={UserIcon} active={tab === "profile"} onClick={() => setTab("profile")} />
            <TabLink label="My Bets" icon={Receipt} active={tab === "bets"} onClick={() => setTab("bets")} />
            <TabLink label="Transactions" icon={History} active={tab === "transactions"} onClick={() => setTab("transactions")} />
            <TabLink label="Security" icon={Shield} active={tab === "security"} onClick={() => setTab("security")} />
          </aside>

          <section className="card-panel p-4 md:p-6 min-h-[420px]">
            {tab === "profile" && <ProfilePanel />}
            {tab === "bets" && <BetsPanel />}
            {tab === "transactions" && <TransactionsPanel />}
            {tab === "security" && <SecurityPanel session={session} />}
          </section>
        </div>
      </div>
    </CasinoShell>
  );
}

function TabLink({
  label, icon: Icon, active, onClick,
}: { label: string; icon: typeof UserIcon; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 h-10 px-3 rounded-md text-[13px] font-semibold transition-colors ${
        active ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
      }`}
    >
      <Icon size={16} className={active ? "text-primary" : ""} />
      {label}
    </button>
  );
}

/* ---------------- PROFILE ---------------- */

function ProfilePanel() {
  const { user } = useSession();
  const { profile, refetch } = useProfile();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? profile.username ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
    }
  }, [profile]);

  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      const trimmedName = displayName.trim().slice(0, 40);
      const trimmedAvatar = avatarUrl.trim().slice(0, 500);
      if (trimmedAvatar && !/^https?:\/\//i.test(trimmedAvatar)) {
        throw new Error("Avatar must be a valid https URL");
      }
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmedName || null, avatar_url: trimmedAvatar || null })
        .eq("id", user.id);
      if (error) throw error;
      await refetch();
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const initial = (displayName || profile?.username || "?").slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-black">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Update how other players see you.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-primary to-teal grid place-items-center text-primary-foreground font-black text-3xl">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => ((e.currentTarget.style.display = "none"))} />
          ) : (
            initial
          )}
        </div>
        <div className="text-sm">
          <div className="font-mono text-xs text-muted-foreground">@{profile?.username}</div>
          <div className="text-muted-foreground text-xs mt-0.5">Username is permanent.</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Display name">
          <input
            className={inputCls}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            placeholder="How you appear on leaderboards"
          />
        </Field>
        <Field label="Avatar URL">
          <div className="relative">
            <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className={inputCls + " pl-9"}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </Field>
        <Field label="Email">
          <input className={inputCls + " opacity-60 cursor-not-allowed"} value={user?.email ?? ""} readOnly />
        </Field>
        <Field label="Balance">
          <div className={inputCls + " flex items-center font-mono tabular-nums"}>
            {profile ? fmt(profile.balance) : "—"} <span className="text-muted-foreground ml-1">BB</span>
          </div>
        </Field>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="btn-primary h-10 px-5 rounded-md text-sm">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- BETS ---------------- */

const PAGE = 10;

function BetsPanel() {
  const { user } = useSession();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["bets:page", user?.id, page],
    enabled: !!user,
    queryFn: async () => {
      const from = page * PAGE;
      const to = from + PAGE - 1;
      const { data, error, count } = await supabase
        .from("bets")
        .select("id, game, wager, payout, multiplier, outcome, created_at", { count: "exact" })
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const total = data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-black">My Bets</h2>
          <p className="text-sm text-muted-foreground mt-1">Your full betting history — {total.toLocaleString()} rounds.</p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 md:mx-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="text-left font-bold px-3 py-2">Date</th>
              <th className="text-left font-bold px-3 py-2">Game</th>
              <th className="text-right font-bold px-3 py-2">Bet</th>
              <th className="text-right font-bold px-3 py-2">Multiplier</th>
              <th className="text-right font-bold px-3 py-2">Payout</th>
              <th className="text-right font-bold px-3 py-2">Profit</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center text-muted-foreground py-8">Loading…</td></tr>
            ) : !data?.rows.length ? (
              <tr><td colSpan={6} className="text-center text-muted-foreground py-8">No bets yet — go play a round.</td></tr>
            ) : (
              data.rows.map((b) => {
                const wager = Number(b.wager);
                const payout = Number(b.payout);
                const net = payout - wager;
                const win = net > 0;
                const push = net === 0 && payout > 0;
                const color = win ? "text-primary" : push ? "text-muted-foreground" : "text-red";
                return (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-surface-2/40 font-mono tabular-nums">
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">
                      {new Date(b.created_at).toLocaleString([], {
                        year: "2-digit", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-foreground font-sans">{b.game}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(wager)}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{Number(b.multiplier).toFixed(2)}×</td>
                    <td className="px-3 py-2.5 text-right">{fmt(payout)}</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${color}`}>
                      {net > 0 ? "+" : ""}
                      {fmt(net)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pager page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}

/* ---------------- TRANSACTIONS ---------------- */

function TransactionsPanel() {
  const { user } = useSession();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["tx:page", user?.id, page],
    enabled: !!user,
    queryFn: async () => {
      const from = page * PAGE;
      const to = from + PAGE - 1;
      const { data, error, count } = await supabase
        .from("transactions")
        .select("id, kind, amount, balance_after, method, created_at", { count: "exact" })
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as Array<{
        id: string; kind: "deposit" | "withdraw"; amount: number;
        balance_after: number; method: string; created_at: string;
      }>, count: count ?? 0 };
    },
  });

  const total = data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-black">Transactions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Deposits and withdrawals — {total.toLocaleString()} entries.
        </p>
      </div>

      <div className="overflow-x-auto -mx-4 md:mx-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="text-left font-bold px-3 py-2">Date</th>
              <th className="text-left font-bold px-3 py-2">Type</th>
              <th className="text-left font-bold px-3 py-2">Method</th>
              <th className="text-right font-bold px-3 py-2">Amount</th>
              <th className="text-right font-bold px-3 py-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center text-muted-foreground py-8">Loading…</td></tr>
            ) : !data?.rows.length ? (
              <tr><td colSpan={5} className="text-center text-muted-foreground py-8">No transactions yet.</td></tr>
            ) : (
              data.rows.map((t) => {
                const isDep = t.kind === "deposit";
                return (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-surface-2/40 font-mono tabular-nums">
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">
                      {new Date(t.created_at).toLocaleString([], {
                        year: "2-digit", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2.5 font-sans">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${isDep ? "text-primary" : "text-red"}`}>
                        {isDep ? <ArrowDownToLine size={12} /> : <ArrowUpFromLine size={12} />}
                        {isDep ? "Deposit" : "Withdraw"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-sans text-xs text-muted-foreground capitalize">{t.method}</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${isDep ? "text-primary" : "text-red"}`}>
                      {isDep ? "+" : "−"}
                      {fmt(Number(t.amount))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(Number(t.balance_after))}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pager page={page} pageCount={pageCount} onChange={setPage} />
    </div>
  );
}

/* ---------------- SECURITY / SESSION ---------------- */

function SecurityPanel({ session }: { session: import("@supabase/supabase-js").Session | null }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const created = user?.created_at ? new Date(user.created_at) : null;
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
  const expiresAt = useMemo(
    () => (session?.expires_at ? new Date(session.expires_at * 1000) : null),
    [session],
  );
  const provider = (user?.app_metadata as any)?.provider ?? "email";

  async function signOut() {
    setBusy(true);
    try {
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-black">Security & Session</h2>
        <p className="text-sm text-muted-foreground mt-1">Your current session details and sign-out.</p>
      </div>

      <dl className="grid sm:grid-cols-2 gap-3">
        <Info label="User ID" value={<span className="font-mono text-xs break-all">{user?.id}</span>} />
        <Info label="Email" value={user?.email ?? "—"} />
        <Info label="Sign-in provider" value={<span className="capitalize">{provider}</span>} />
        <Info label="Account created" value={created?.toLocaleString() ?? "—"} />
        <Info label="Last sign-in" value={lastSignIn?.toLocaleString() ?? "—"} />
        <Info label="Session expires" value={expiresAt?.toLocaleString() ?? "—"} />
      </dl>

      <div className="pt-4 border-t border-border">
        <button
          onClick={signOut}
          disabled={busy}
          className="h-11 px-5 rounded-md bg-red text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-red/90 disabled:opacity-60"
        >
          <LogOut size={16} /> {busy ? "Signing out…" : "Sign out securely"}
        </button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-surface-0 border border-border px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

/* ---------------- SHARED ---------------- */

function Pager({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <div className="text-xs text-muted-foreground">
        Page <span className="text-foreground font-bold">{page + 1}</span> of {pageCount}
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="h-9 px-3 rounded-md bg-surface-2 hover:bg-surface-3 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          onClick={() => onChange(Math.min(pageCount - 1, page + 1))}
          disabled={page >= pageCount - 1}
          className="h-9 px-3 rounded-md bg-surface-2 hover:bg-surface-3 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-40"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
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
