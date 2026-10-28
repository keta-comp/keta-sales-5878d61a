import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { recordFailedLogin, recordLogin, recordRegistration } from "@/lib/session.functions";
import { t } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";

const TITLE = "Kabinaga kirish — KetaOne";
const DESCRIPTION =
  "KetaOne kabinasiga kiring yoki bepul ro‘yxatdan o‘tib biznesingiz uchun CRM tizimini sozlang.";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    // "recover" is set by the password-reset link itself; ?code=… arrives on the same
    // URL and is read from window.location, so it never becomes a linkable param.
    mode:
      search["mode"] === "register" || search["mode"] === "recover"
        ? (search["mode"] as "register" | "recover")
        : ("login" as const),
    redirect:
      typeof search['redirect'] === "string" && search['redirect'].startsWith("/")
        ? (search['redirect'] as string)
        : undefined,
  }),
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
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { mode: initialMode, redirect: redirectTo } = Route.useSearch();
  const adminOnly = (redirectTo ?? "").startsWith("/super-admin");
  const [mode, setMode] = useState<"login" | "register" | "recover">(
    adminOnly ? "login" : initialMode,
  );
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  // A recovery link is only usable once Supabase has handed the browser a session;
  // until then the form explains what went wrong instead of failing cryptically.
  const [recoverySession, setRecoverySession] = useState(false);

  useEffect(() => {
    const recoveryRequested =
      mode === "recover" ||
      (typeof window !== "undefined" &&
        (window.location.hash.includes("type=recovery") || window.location.search.includes("code=")));

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recover");
        setRecoverySession(!!session);
        return;
      }
      if (recoveryRequested && session) {
        setMode("recover");
        setRecoverySession(true);
      }
    });

    void supabase.auth.getSession().then(({ data: current }) => {
      if (current.session && recoveryRequested) {
        setMode("recover");
        setRecoverySession(true);
        return;
      }
      if (current.session && !recoveryRequested) void navigate({ to: redirectTo ?? "/dashboard" });
    });

    return () => data.subscription.unsubscribe();
  }, [navigate, redirectTo, mode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "recover") {
        if (!recoverySession) {
          throw new Error(t("Tiklash havolasi topilmadi. Emaildagi havolani shu brauzerda qayta oching."));
        }
        if (password !== confirmPassword) throw new Error(t("Parollar mos kelmadi"));
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success(t("Parol yangilandi"));
        navigate({ to: redirectTo ?? "/dashboard" });
        return;
      }
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim(), business_name: businessName.trim() || undefined },
          },
        });
        if (error) throw error;
        void recordRegistration().catch(() => undefined);
        navigate({ to: redirectTo ?? "/dashboard" });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        void recordFailedLogin({ data: { email } }).catch(() => undefined);
        throw error;
      }
      void recordLogin().catch(() => undefined);
      navigate({ to: redirectTo ?? "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Kirishda xatolik yuz berdi"));
    } finally {
      setBusy(false);
    }
  };

  const sendResetLink = async () => {
    if (!email.trim()) {
      toast.error(t("Avval emailingizni kiriting"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth?mode=recover`,
      });
      if (error) throw error;
      toast.success(t("Tiklash havolasi yuborildi. Kelmasa spam papkini tekshiring."));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Havola yuborilmadi"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher showLabel />
      </div>
      <Link to="/" className="mb-8">
        <BrandMark />
      </Link>

      <div className="clay-panel w-full max-w-md p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          {mode === "recover"
            ? t("Parolni tiklash")
            : adminOnly
              ? t("Boshqaruv markaziga kirish")
              : mode === "login"
                ? "Kabinaga kirish"
                : "Bepul boshlash"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "recover"
            ? t("Yangi parol kiriting — eski parol ishlamaydi.")
            : adminOnly
              ? t("Bu bo‘lim faqat platforma administratorlari uchun.")
              : mode === "login"
                ? "Mijozlar, savdo va jamoangizni boshqarishni davom ettiring."
                : "Hisob yarating — keyin sohangizni tanlab CRMni sozlaymiz."}
        </p>

        {!adminOnly && mode !== "recover" && (
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={mode === "login" ? "clay-raised bg-card py-2" : "rounded-xl py-2 text-muted-foreground"}
            >
              {t("Kirish")}
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={
                mode === "register" ? "clay-raised bg-card py-2" : "rounded-xl py-2 text-muted-foreground"
              }
            >
              {t("Ro‘yxatdan o‘tish")}
            </button>
          </div>
        )}


        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="full-name">{t("Ismingiz")}</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder={t("Masalan: Nursultan")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-name">{t("Biznes nomi")}</Label>
                <Input
                  id="business-name"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder={t("Masalan: KetaOne klinikasi")}
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("Email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("siz@kompaniya.uz")}
              required={mode !== "recover"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {mode === "recover" ? t("Yangi parol") : t("Parol")}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "recover" ? "new-password" : mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? t("Parolni yashirish") : t("Parolni ko‘rsatish")}
                className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {mode === "recover" && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t("Parolni qayta kiriting")}</Label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy
              ? t("Yuklanmoqda…")
              : mode === "recover"
                ? t("Parolni saqlash")
                : mode === "login"
                  ? t("Kirish")
                  : t("Ro‘yxatdan o‘tish")}
          </Button>
          {mode === "login" && !adminOnly && (
            <button
              type="button"
              onClick={() => void sendResetLink()}
              disabled={busy}
              className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("Parolni unutdingizmi?")}
            </button>
          )}
        </form>

        <p className="mt-5 text-xs text-muted-foreground">
          {adminOnly
            ? t("Ro‘yxatdan o‘tish bu bo‘limda mavjud emas — faqat mavjud administrator hisobi bilan kiriladi.")
            : mode === "register"
              ? "Ro‘yxatdan o‘tgach biznes sohangizni tanlaysiz — CRM sizga moslab tayyorlanadi."
              : "Hisobingiz yo‘qmi? “Ro‘yxatdan o‘tish”ni tanlang — karta talab qilinmaydi."}
        </p>
      </div>

      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t("Bosh sahifaga")}
      </Link>
    </div>
  );
}
