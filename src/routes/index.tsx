import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BarChart3, Bot, Boxes, MessagesSquare, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const TITLE = "SalesPilot AI — Telegram AI sales agent & CRM";
const DESCRIPTION =
  "An AI sales agent that talks to Telegram customers, checks live inventory, closes orders and hands hot leads to your operators — with a full CRM dashboard.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Bot, title: "AI sales agent", body: "Answers, qualifies, up-sells and closes on Telegram 24/7." },
  { icon: Boxes, title: "Live inventory", body: "Every quote is checked against real stock before it is promised." },
  { icon: MessagesSquare, title: "Operator handoff", body: "Hot or stuck chats are pushed to your operator group instantly." },
  { icon: Users, title: "Built-in CRM", body: "Customers, leads, scoring and order history in one place." },
  { icon: BarChart3, title: "Sales analytics", body: "Revenue, conversion and operator performance, updated live." },
];

function Index() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created — signing you in");
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,var(--color-primary)/18%,transparent)]" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Live AI sales department
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Your Telegram traffic, sold by an AI sales agent.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">{DESCRIPTION}</p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="surface-panel p-4">
                <feature.icon className="size-5 text-primary" />
                <p className="mt-3 text-sm font-semibold text-foreground">{feature.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel h-fit p-6 lg:sticky lg:top-10">
          <h2 className="font-display text-xl font-semibold text-foreground">Staff sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Access the CRM, inventory and AI agent controls.
          </p>

          <Tabs value={mode} onValueChange={(value) => setMode(value as "signin" | "signup")} className="mt-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value={mode} className="mt-5">
              <form onSubmit={submit} className="space-y-4">
                {mode === "signup" ? (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Aziz Karimov"
                      required
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {mode === "signup" ? "Create account" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
