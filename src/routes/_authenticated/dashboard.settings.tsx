import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { ErrorState, LoadingState, PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  getSettings,
  getTelegramStatus,
  saveAiSettings,
  saveBusinessSettings,
  setTelegramWebhook,
} from "@/lib/settings.functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SalesPilot AI" },
      { name: "description", content: "Configure the Telegram bot, business knowledge and AI sales behaviour." },
      { property: "og:title", content: "Settings — SalesPilot AI" },
      { property: "og:description", content: "Telegram, business and AI agent configuration." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const fetchSettings = useServerFn(getSettings);
  const fetchTelegram = useServerFn(getTelegramStatus);
  const saveBusiness = useServerFn(saveBusinessSettings);
  const saveAi = useServerFn(saveAiSettings);
  const registerWebhook = useServerFn(setTelegramWebhook);

  const settings = useQuery({ queryKey: ["settings"], queryFn: () => fetchSettings() });
  const telegram = useQuery({ queryKey: ["telegram-status"], queryFn: () => fetchTelegram() });

  const businessMutation = useMutation({
    mutationFn: (input: Parameters<typeof saveBusiness>[0] extends { data: infer D } ? D : never) =>
      saveBusiness({ data: input }),
    onSuccess: () => {
      toast.success("Business settings saved");
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Save failed"),
  });

  const aiMutation = useMutation({
    mutationFn: (input: Parameters<typeof saveAi>[0] extends { data: infer D } ? D : never) =>
      saveAi({ data: input }),
    onSuccess: () => {
      toast.success("AI settings saved");
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Save failed"),
  });

  const webhookMutation = useMutation({
    mutationFn: () => registerWebhook({ data: { baseUrl: window.location.origin } }),
    onSuccess: (result) => {
      toast.success(`Webhook registered: ${result.url}`);
      void queryClient.invalidateQueries({ queryKey: ["telegram-status"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not register webhook"),
  });

  if (settings.isPending) return <LoadingState />;
  if (settings.error) return <ErrorState error={settings.error} onRetry={() => void settings.refetch()} />;

  const business = settings.data.business;
  const ai = settings.data.ai;

  return (
    <>
      <PageHeader title="Settings" description="Business knowledge, AI behaviour and the Telegram connection." />

      <section className="surface-panel p-4">
        <h2 className="font-display text-base font-semibold">Telegram connection</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {settings.data.telegramConfigured
            ? "Bot token is configured on the server."
            : "Add your bot token (TELEGRAM_BOT_TOKEN) to connect the AI agent to Telegram."}
        </p>
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          {telegram.data && "bot" in telegram.data && telegram.data.bot ? (
            <p>
              Bot: <span className="text-foreground">@{telegram.data.bot.username}</span>
            </p>
          ) : null}
          {telegram.data && "webhook" in telegram.data && telegram.data.webhook ? (
            <>
              <p>
                Webhook: <span className="text-foreground">{telegram.data.webhook.url || "not set"}</span>
              </p>
              <p>Pending updates: {telegram.data.webhook.pending_update_count}</p>
              {telegram.data.webhook.last_error_message ? (
                <p className="text-destructive">Last error: {telegram.data.webhook.last_error_message}</p>
              ) : null}
            </>
          ) : null}
          {telegram.data && "error" in telegram.data && telegram.data.error ? (
            <p className="text-destructive">{telegram.data.error}</p>
          ) : null}
        </div>
        <Button
          className="mt-4"
          disabled={webhookMutation.isPending || !settings.data.telegramConfigured}
          onClick={() => webhookMutation.mutate()}
        >
          Register webhook for this domain
        </Button>
      </section>

      {business ? (
        <BusinessForm
          key={business.id}
          initial={business}
          onSave={(values) => businessMutation.mutate(values as never)}
          saving={businessMutation.isPending}
        />
      ) : null}

      {ai ? (
        <AiForm
          key={ai.id}
          initial={ai}
          aiKeyConfigured={settings.data.aiKeyConfigured}
          onSave={(values) => aiMutation.mutate(values as never)}
          saving={aiMutation.isPending}
        />
      ) : null}
    </>
  );
}

type BusinessRow = {
  id: string;
  business_name: string;
  business_description: string;
  working_hours: string;
  delivery_info: string;
  payment_methods: string;
  return_policy: string;
  currency: string;
  operator_group_chat_id: string | null;
};

function BusinessForm({
  initial,
  onSave,
  saving,
}: {
  initial: BusinessRow;
  onSave: (values: BusinessRow) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<BusinessRow>(initial);
  const field = (key: keyof BusinessRow) => ({
    value: (form[key] ?? "") as string,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [key]: event.target.value }),
  });

  return (
    <form
      className="surface-panel space-y-3 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ ...form, operator_group_chat_id: form.operator_group_chat_id || null });
      }}
    >
      <h2 className="font-display text-base font-semibold">Business knowledge</h2>
      <p className="text-sm text-muted-foreground">The AI agent quotes these facts to customers.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="b-name">Business name</Label>
          <Input id="b-name" {...field("business_name")} required />
        </div>
        <div>
          <Label htmlFor="b-currency">Currency</Label>
          <Input id="b-currency" {...field("currency")} required />
        </div>
        <div>
          <Label htmlFor="b-hours">Working hours</Label>
          <Input id="b-hours" {...field("working_hours")} />
        </div>
        <div>
          <Label htmlFor="b-group">Operator group chat ID</Label>
          <Input id="b-group" {...field("operator_group_chat_id")} placeholder="-1001234567890" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="b-desc">What the business sells</Label>
          <Textarea id="b-desc" rows={3} {...field("business_description")} />
        </div>
        <div>
          <Label htmlFor="b-delivery">Delivery info</Label>
          <Textarea id="b-delivery" rows={3} {...field("delivery_info")} />
        </div>
        <div>
          <Label htmlFor="b-payment">Payment methods</Label>
          <Textarea id="b-payment" rows={3} {...field("payment_methods")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="b-return">Return policy</Label>
          <Textarea id="b-return" rows={2} {...field("return_policy")} />
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        Save business settings
      </Button>
    </form>
  );
}

type AiRow = {
  id: string;
  model: string;
  tone_of_voice: string;
  sales_strategy: string;
  language_instruction: string;
  escalation_rules: string;
  custom_instructions: string;
  max_discount_percent: number;
  enabled: boolean;
};

function AiForm({
  initial,
  aiKeyConfigured,
  onSave,
  saving,
}: {
  initial: AiRow;
  aiKeyConfigured: boolean;
  onSave: (values: AiRow) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<AiRow>(initial);

  return (
    <form
      className="surface-panel space-y-3 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">AI sales agent</h2>
          <p className="text-sm text-muted-foreground">
            {aiKeyConfigured ? "Lovable AI is connected." : "AI key missing — replies will fail."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Agent enabled
          <Switch checked={form.enabled} onCheckedChange={(checked) => setForm({ ...form, enabled: checked })} />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="a-model">Model</Label>
          <Input id="a-model" value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} />
        </div>
        <div>
          <Label htmlFor="a-discount">Max discount %</Label>
          <Input
            id="a-discount"
            type="number"
            min={0}
            max={100}
            value={form.max_discount_percent}
            onChange={(event) => setForm({ ...form, max_discount_percent: Number(event.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="a-tone">Tone of voice</Label>
          <Textarea
            id="a-tone"
            rows={2}
            value={form.tone_of_voice}
            onChange={(event) => setForm({ ...form, tone_of_voice: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="a-language">Language rules</Label>
          <Textarea
            id="a-language"
            rows={2}
            value={form.language_instruction}
            onChange={(event) => setForm({ ...form, language_instruction: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="a-strategy">Sales strategy</Label>
          <Textarea
            id="a-strategy"
            rows={3}
            value={form.sales_strategy}
            onChange={(event) => setForm({ ...form, sales_strategy: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="a-escalation">Escalation rules</Label>
          <Textarea
            id="a-escalation"
            rows={3}
            value={form.escalation_rules}
            onChange={(event) => setForm({ ...form, escalation_rules: event.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="a-custom">Custom instructions</Label>
          <Textarea
            id="a-custom"
            rows={4}
            value={form.custom_instructions}
            onChange={(event) => setForm({ ...form, custom_instructions: event.target.value })}
          />
        </div>
      </div>
      <Button type="submit" disabled={saving}>
        Save AI settings
      </Button>
    </form>
  );
}