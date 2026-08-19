import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BarChart3, Bot, Boxes, MessagesSquare, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import logoAsset from "@/assets/keta-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const TITLE = "SalesPilot AI — Telegram uchun AI savdo agenti va CRM";
const DESCRIPTION =
  "Telegramdagi mijozlar bilan suhbatlashadigan, omborni real vaqtda tekshiradigan, buyurtmalarni yopadigan va qaynoq murojaatlarni operatorlarga uzatadigan AI savdo agenti — to‘liq CRM paneli bilan.";

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
  { icon: Bot, title: "AI savdo agenti", body: "Telegramda 24/7 javob beradi, mijozni saralaydi va savdoni yopadi." },
  { icon: Boxes, title: "Real ombor", body: "Har bir taklif e’lon qilinishdan oldin haqiqiy qoldiq bilan tekshiriladi." },
  { icon: MessagesSquare, title: "Operatorga uzatish", body: "Qaynoq yoki qotib qolgan suhbatlar darhol operator guruhiga yuboriladi." },
  { icon: Users, title: "Ichki CRM", body: "Mijozlar, murojaatlar, baholash va buyurtma tarixi bir joyda." },
  { icon: BarChart3, title: "Savdo tahlili", body: "Tushum, konversiya va operator natijalari real vaqtda." },
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
        toast.success("Hisob yaratildi — tizimga kiritilmoqda");
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kirishda xatolik yuz berdi");
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
      toast.error("Google orqali kirish amalga oshmadi");
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
          <img
            src={logoAsset.url}
            alt="Keta AI savdo agenti logotipi"
            className="mb-6 size-16 object-contain"
            width={64}
            height={64}
          />
          <div className="clay-raised inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" /> Jonli AI savdo bo‘limi
          </div>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Telegram mijozlaringizni AI savdo agenti sotadi.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">{DESCRIPTION}</p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="clay-panel clay-hover p-5">
                <span className="clay-inset grid size-11 place-items-center"><feature.icon className="size-5 text-primary" /></span>
                <p className="mt-3 text-sm font-semibold text-foreground">{feature.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="clay-panel h-fit p-6 sm:p-7 lg:sticky lg:top-10">
          <h2 className="font-display text-xl font-semibold text-foreground">Xodimlar uchun kirish</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            CRM, ombor va AI agent boshqaruviga kiring.
          </p>

          <Tabs value={mode} onValueChange={(value) => setMode(value as "signin" | "signup")} className="mt-5">
            <TabsList className="clay-inset grid w-full grid-cols-2 p-1">
              <TabsTrigger value="signin">Kirish</TabsTrigger>
              <TabsTrigger value="signup">Hisob yaratish</TabsTrigger>
            </TabsList>
            <TabsContent value={mode} className="mt-5">
              <form onSubmit={submit} className="space-y-4">
                {mode === "signup" ? (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">To‘liq ism</Label>
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
                  <Label htmlFor="email">Ish emaili</Label>
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
                  <Label htmlFor="password">Parol</Label>
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
                  {busy ? "Yuklanmoqda…" : mode === "signup" ? "Hisob yaratish" : "Kirish"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> yoki <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
            Google bilan davom etish
          </Button>
        </div>
      </div>
    </div>
  );
}
