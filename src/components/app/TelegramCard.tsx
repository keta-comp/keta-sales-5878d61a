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
      toast.success(`Connected @${bot.bot_username ?? "bot"} — webhook active`);
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Could not connect the bot");
      invalidate();
    },
  });

  const testMutation = useMutation({
    mutationFn: () => test(),
    onSuccess: (result) => {
      setDiagnostics(result);
      if (result.connected && result.webhook.active) toast.success("Telegram confirmed the connection");
      else toast.error(result.connected ? "Webhook is not active" : result.error);
      invalidate();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Test failed"),
  });

  const operatorTestMutation = useMutation({
    mutationFn: () => notifyTest(),
    onSuccess: (result) => toast.success(`Test message sent to ${result.chatId}`),
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not send the operator message"),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: () => {
      setDiagnostics(null);
      toast.success("Telegram bot disconnected. Your CRM history is kept.");
      invalidate();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Disconnect failed"),
  });

  const bot = state.data?.bot ?? null;
  const webhookActive = bot?.webhook_status === "active";

  return (
    <section className="surface-panel space-y-4 p-4">
      <div>
        <h2 className="font-display text-base font-semibold">Telegram bot</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your own bot created with @BotFather. Customers who message that bot land in this
          workspace only.
        </p>
      </div>

      {bot && bot.is_active ? (
        <div className="space-y-3">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Status: </span>
              <span className={webhookActive ? "text-success" : "text-destructive"}>
                {webhookActive ? "🟢 Connected — webhook active" : `🔴 ${bot.webhook_status}`}
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
              <span className="text-muted-foreground">Connected: </span>
              {formatDate(bot.connected_at)}
            </p>
            <p className="sm:col-span-2 break-all">
              <span className="text-muted-foreground">Webhook: </span>
              {bot.webhook_url ?? "-"}
            </p>
            <p>
              <span className="text-muted-foreground">Last checked: </span>
              {formatDate(bot.last_checked_at)}
            </p>
            {bot.last_error ? (
              <p className="sm:col-span-2 text-destructive">Last error: {bot.last_error}</p>
            ) : null}
          </div>

          {diagnostics ? (
            <div className="rounded-md border border-border/60 bg-background/40 p-3 text-sm">
              {diagnostics.connected ? (
                <>
                  <p>
                    {diagnostics.bot.first_name} (@{diagnostics.bot.username}) · ID {diagnostics.bot.id}
                  </p>
                  <p className="text-muted-foreground break-all">Webhook: {diagnostics.webhook.url || "not set"}</p>
                  <p className="text-muted-foreground">
                    Pending updates: {diagnostics.webhook.pending_update_count}
                  </p>
                  {diagnostics.webhook.last_error_message ? (
                    <p className="text-destructive">Telegram error: {diagnostics.webhook.last_error_message}</p>
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
              Test connection
            </Button>
            <Button
              variant="secondary"
              disabled={operatorTestMutation.isPending}
              onClick={() => operatorTestMutation.mutate()}
            >
              Send test message to operator group
            </Button>
            <Button
              variant="destructive"
              disabled={disconnectMutation.isPending}
              onClick={() => {
                if (window.confirm("Disconnect this Telegram bot? Conversations, leads and orders are kept.")) {
                  disconnectMutation.mutate();
                }
              }}
            >
              Disconnect
            </Button>
          </div>

          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer">Replace with another bot</summary>
            <p className="mt-2">
              Disconnect the current bot, then paste the new token below. Your customers, conversations,
              leads and orders stay exactly as they are.
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
            {connectMutation.isPending ? "Connecting…" : "Connect Telegram Bot"}
          </Button>
          {bot && !bot.is_active ? (
            <p className="text-sm text-muted-foreground">
              Previous bot @{bot.bot_username ?? "-"} was disconnected on {formatDate(bot.last_checked_at)}.
              Paste a new token to reactivate messaging.
            </p>
          ) : null}
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Open @BotFather in Telegram and send /newbot.</li>
            <li>Choose a name and a username ending in “bot”.</li>
            <li>Copy the HTTP API token BotFather returns.</li>
            <li>Paste it above and press Connect — we validate it and register the webhook for you.</li>
          </ol>
        </form>
      )}

      {state.data && !state.data.aiKeyConfigured ? (
        <p className="text-sm text-destructive">AI key missing — the agent cannot reply yet.</p>
      ) : null}
      {state.data && !state.data.encryptionConfigured ? (
        <p className="text-sm text-destructive">
          BOT_TOKEN_ENCRYPTION_KEY is missing on the server — tokens cannot be stored securely.
        </p>
      ) : null}
    </section>
  );
}
