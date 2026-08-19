import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  connectTelegramBot,
  disconnectTelegramBot,
  getTelegramBot,
  sendOperatorTestMessage,
  testTelegramBot,
} from "@/lib/telegram.functions";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function TelegramCard() {
  const queryClient = useQueryClient();
  const fetchBot = useServerFn(getTelegramBot);
  const connect = useServerFn(connectTelegramBot);
  const test = useServerFn(testTelegramBot);
  const disconnect = useServerFn(disconnectTelegramBot);
  const notifyTest = useServerFn(sendOperatorTestMessage);

  const [token, setToken] = useState("");
  const [diagnostics, setDiagnostics] = useState<Awaited<ReturnType<typeof test>> | null>(null);

  const state = useQuery({ queryKey: ["telegram-bot"], queryFn: () => fetchBot() });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["telegram-bot"] });

  const connectMutation = useMutation({
    mutationFn: () => connect({ data: { token: token.trim() } }),
    onSuccess: (bot) => {
      setToken("");
      toast.success(`@${bot.bot_username ?? "bot"} ulandi — webhook faol`);
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Botni ulab bo'lmadi");
      invalidate();
    },
  });

  const testMutation = useMutation({
    mutationFn: () => test(),
    onSuccess: (result) => {
      setDiagnostics(result);
      if (result.connected && result.webhook.active) toast.success("Telegram ulanishni tasdiqladi");
      else toast.error(result.connected ? "Webhook faol emas" : result.error);
      invalidate();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Tekshiruv amalga oshmadi"),
  });

  const operatorTestMutation = useMutation({
    mutationFn: () => notifyTest(),
    onSuccess: (result) => toast.success(`Test xabari ${result.chatId} manziliga yuborildi`),
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Operator xabarini yuborib bo'lmadi"),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: () => {
      setDiagnostics(null);
      toast.success("Telegram bot uzildi. CRM tarixi saqlanib qoldi.");
      invalidate();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Uzish amalga oshmadi"),
  });

  const bot = state.data?.bot ?? null;
  const webhookActive = bot?.webhook_status === "active";

  return (
    <section className="clay-panel space-y-4 p-4">
      <div>
        <h2 className="font-display text-base font-semibold">Telegram bot</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          @BotFather orqali yaratilgan o'z botingizni ulang. Shu botga yozgan mijozlar faqat shu
          workspace’ga tushadi.
        </p>
      </div>

      {bot && bot.is_active ? (
        <div className="space-y-3">
          <div className="clay-inset grid gap-2 rounded-2xl p-3 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Holat: </span>
              <span className={webhookActive ? "text-success" : "text-destructive"}>
                {webhookActive ? "🟢 Ulangan — webhook faol" : `🔴 ${bot.webhook_status}`}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Bot: </span>
              <span className="text-foreground">@{bot.bot_username ?? "-"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Bot ID: </span>
              {bot.telegram_bot_id ?? "-"}
            </p>
            <p>
              <span className="text-muted-foreground">Ulangan: </span>
              {formatDate(bot.connected_at)}
            </p>
            <p className="sm:col-span-2 break-all">
              <span className="text-muted-foreground">Webhook: </span>
              {bot.webhook_url ?? "-"}
            </p>
            <p>
              <span className="text-muted-foreground">Oxirgi tekshiruv: </span>
              {formatDate(bot.last_checked_at)}
            </p>
            {bot.last_error ? (
              <p className="sm:col-span-2 text-destructive">Oxirgi xato: {bot.last_error}</p>
            ) : null}
          </div>

          {diagnostics ? (
            <div className="clay-inset rounded-2xl p-3 text-sm">
              {diagnostics.connected ? (
                <>
                  <p>
                    {diagnostics.bot.first_name} (@{diagnostics.bot.username}) · ID {diagnostics.bot.id}
                  </p>
                  <p className="text-muted-foreground break-all">Webhook: {diagnostics.webhook.url || "sozlanmagan"}</p>
                  <p className="text-muted-foreground">
                    Kutilayotgan yangilanishlar: {diagnostics.webhook.pending_update_count}
                  </p>
                  {diagnostics.webhook.last_error_message ? (
                    <p className="text-destructive">Telegram xatosi: {diagnostics.webhook.last_error_message}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-destructive">{diagnostics.error}</p>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={testMutation.isPending}
              onClick={() => testMutation.mutate()}
            >
              Ulanishni tekshirish
            </Button>
            <Button
              variant="secondary"
              disabled={operatorTestMutation.isPending}
              onClick={() => operatorTestMutation.mutate()}
            >
              Operator guruhiga test xabar yuborish
            </Button>
            <Button
              variant="destructive"
              disabled={disconnectMutation.isPending}
              onClick={() => {
                if (window.confirm("Ushbu Telegram botni uzasizmi? Suhbatlar, lidlar va buyurtmalar saqlanib qoladi.")) {
                  disconnectMutation.mutate();
                }
              }}
            >
              Uzish
            </Button>
          </div>

          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer">Boshqa bot bilan almashtirish</summary>
            <p className="mt-2">
              Joriy botni uzing, so'ng yangi tokenni pastga joylashtiring. Mijozlaringiz, suhbatlaringiz,
              lidlaringiz va buyurtmalaringiz o'zgarishsiz qoladi.
            </p>
          </details>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            connectMutation.mutate();
          }}
        >
          <div>
            <Label htmlFor="bot-token">Bot token</Label>
            <Input
              id="bot-token"
              type="password"
              autoComplete="off"
              placeholder="123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={connectMutation.isPending || token.trim().length < 20}>
            {connectMutation.isPending ? "Ulanmoqda…" : "Telegram Botni ulash"}
          </Button>
          {bot && !bot.is_active ? (
            <p className="text-sm text-muted-foreground">
              Oldingi @{bot.bot_username ?? "-"} boti {formatDate(bot.last_checked_at)} sanasida uzilgan.
              Xabar almashishni qayta yoqish uchun yangi token joylashtiring.
            </p>
          ) : null}
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Telegram’da @BotFather’ni oching va /newbot buyrug'ini yuboring.</li>
            <li>Nom va "bot" bilan tugaydigan username tanlang.</li>
            <li>BotFather qaytargan HTTP API tokenni nusxalang.</li>
            <li>Uni yuqoriga joylashtirib Ulash tugmasini bosing — biz uni tekshirib, webhookni siz uchun ro'yxatdan o'tkazamiz.</li>
          </ol>
        </form>
      )}

      {state.data && !state.data.aiKeyConfigured ? (
        <p className="text-sm text-destructive">AI kaliti yo'q — agent hali javob bera olmaydi.</p>
      ) : null}
      {state.data && !state.data.encryptionConfigured ? (
        <p className="text-sm text-destructive">
          Serverda BOT_TOKEN_ENCRYPTION_KEY yo'q — tokenlarni xavfsiz saqlab bo'lmaydi.
        </p>
      ) : null}
    </section>
  );
}
