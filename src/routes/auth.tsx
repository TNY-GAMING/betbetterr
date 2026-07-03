import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import logo from "@/assets/logo.png";
import { ArrowLeft } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — BetBetter" },
      { name: "description", content: "Sign in or create a free BetBetter account to play Crash, Mines, Hilo and more." },
      { property: "og:title", content: "Sign in — BetBetter" },
      { property: "og:description", content: "Sign in or create a free BetBetter account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, redirect } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  const dest = redirect ?? "/";

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back.");
      navigate({ to: dest });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { username } },
      });
      if (error) throw error;
      toast.success("Account created — 1,000 BB dropped in your wallet.");
      navigate({ to: dest });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (!res.redirected) navigate({ to: dest });
  }

  return (
    <div className="min-h-screen bg-background text-foreground bg-casino-radial relative flex flex-col">
      {/* Top bar */}
      <div className="h-14 shrink-0 flex items-center px-4 md:px-6 border-b border-border bg-surface-0/85 backdrop-blur">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="BetBetter" className="w-8 h-8" />
          <span className="font-display font-black text-lg tracking-tight">
            bet<span className="text-primary">better</span>
          </span>
        </Link>
        <div className="flex-1" />
        <Link
          to="/"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={13} /> Back to casino
        </Link>
      </div>

      {/* Split layout */}
      <div className="flex-1 grid lg:grid-cols-2">
        {/* Left: brand panel */}
        <div className="hidden lg:flex relative overflow-hidden border-r border-border">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,oklch(0.86_0.28_143_/_0.18),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,oklch(0.72_0.24_335_/_0.15),transparent_55%)]" />
          <div className="relative m-auto max-w-md px-10 py-16">
            <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-primary/15 text-primary text-[11px] font-black uppercase tracking-wider">
              1,000 BB free on sign‑up
            </div>
            <h1 className="mt-5 font-display text-4xl xl:text-5xl font-black leading-tight">
              Get in the game.
              <br />
              <span className="text-primary">Cash out fast.</span>
            </h1>
            <p className="mt-4 text-muted-foreground">
              Provably-fair originals with a flat 1% edge. Instant settlement, real leaderboards, no fluff.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-6">
              {[
                ["6", "Originals"],
                ["1%", "Edge"],
                ["0", "Fees"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-display text-3xl font-black text-primary">{n}</div>
                  <div className="text-xs text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: auth card */}
        <div className="flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-[420px]">
            <div className="card-panel shadow-panel p-6 md:p-8">
              <div className="flex bg-surface-0 p-1 rounded-md text-sm font-bold">
                {(["signin", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 h-9 rounded-md transition-colors ${
                      tab === t ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "signin" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              <h2 className="mt-6 font-display text-2xl font-black">
                {tab === "signin" ? "Sign in to BetBetter" : "Create your account"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {tab === "signin"
                  ? "Welcome back — your balance is waiting."
                  : "1,000 BB welcome bonus. No card required."}
              </p>

              <button
                onClick={google}
                className="mt-6 w-full h-11 rounded-md bg-white text-black text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-white/90"
              >
                <GoogleG /> Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-[11px] uppercase font-bold text-muted-foreground">
                <div className="flex-1 h-px bg-border" /> or {tab === "signin" ? "sign in" : "register"} with email
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={tab === "signin" ? signIn : signUp} className="space-y-3">
                {tab === "signup" && (
                  <Field label="Username">
                    <input
                      required minLength={3} maxLength={20}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={inputCls}
                      placeholder="lucky_seven"
                    />
                  </Field>
                )}
                <Field label="Email">
                  <input
                    type="email" required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="you@domain.com"
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password" required minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    placeholder="At least 6 characters"
                  />
                </Field>
                <button disabled={busy} className="btn-primary w-full h-11 rounded-md text-sm">
                  {busy ? "Working…" : tab === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="mt-5 text-[11px] text-muted-foreground text-center leading-relaxed">
                By continuing you agree that BetBetter is a demo. In-app BB has no cash value.
              </p>
            </div>
          </div>
        </div>
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

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23 12.27a13.7 13.7 0 0 0-.2-2.35H12v4.44h6.19a5.28 5.28 0 0 1-2.3 3.47v2.88h3.72c2.17-2 3.39-4.95 3.39-8.44Z" />
      <path fill="#34A853" d="M12 23c3.1 0 5.7-1.02 7.61-2.77l-3.72-2.88c-1.03.69-2.36 1.1-3.9 1.1-2.99 0-5.52-2.02-6.43-4.74H1.72v2.97A11.99 11.99 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.57 13.71a7.2 7.2 0 0 1 0-4.57V6.17H1.72a12 12 0 0 0 0 10.77l3.85-2.97Z" />
      <path fill="#EA4335" d="M12 5.5a6.5 6.5 0 0 1 4.6 1.8l3.29-3.28A11.5 11.5 0 0 0 12 1a11.99 11.99 0 0 0-10.28 5.17l3.85 2.97C6.48 7.52 9.01 5.5 12 5.5Z" />
    </svg>
  );
}
