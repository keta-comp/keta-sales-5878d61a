import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";

import { ErrorState, LoadingState, PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  confirmTelegramLink,
  getTelegramLink,
  getTelegramLinkRequest,
  unlinkTelegram,
  updateTelegramSettings,
} from "@/lib/telegram-link.functions";

const searchSchema = z.object({ code: z.string().optional() });

export const Route = createFileRoute("/_authenticated/dashboard/telegram")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Telegram integratsiyasi — NEXORA CRM" },
      {
        name: "description",
        content: "NEXORA CRM hisobingizni Telegram bilan ulang va biznes hisobotlarini Telegram orqali oling.",
      },
      { property: "og:title", content: "Telegram integratsiyasi — NEXORA CRM" },
      { property: "og:description", content: "Kunlik hisobot, Excel fayl va muhim bildirishnomalar Telegramda." },
    ],
  }),
  component: TelegramPage,
});

function TelegramPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fetchLink = useServerFn(getTelegramLink);
  const fetchRequest = useServerFn(getTelegramLinkRequest);
  const confirm = useServerFn(confirmTelegramLink);
  const saveSettings = useServerFn(updateTelegramSettings);
  const unlink = useServerFn(unlinkTelegram);

  const link = useQuery({ queryKey: ["telegram-link"], queryFn: () => fetchLink() });
  const request = useQuery({
    queryKey: ["telegram-link-request", search.code],
    queryFn: () => fetchRequest({ data: { code: search.code! } }),
    enabled: Boolean(search.code),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirm({ data: { code: search.code! } }),
    onSuccess: () => {
      toast.success("Telegram muvaffaqiyatli ulandi");
      void queryClient.invalidateQueries({ queryKey: ["telegram-link"] });
      void navigate({ to: "/dashboard/telegram", search: {} });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Ulash amalga oshmadi"),
  });

  const settingsMutation = useMutation({
    mutationFn: (input: Parameters<typeof saveSettings>[0] extends { data: infer D } ? D : never) =>
      saveSettings({ data: input }),
    onSuccess: () => {
      toast.success("Sozlamalar saqlandi");
      void queryClient.invalidateQueries({ queryKey: ["telegram-link"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Saqlash amalga oshmadi"),
  });

  const unlinkMutation = useMutation({
    mutationFn: () => unlink(),
    onSuccess: () => {
      toast.success("Telegram uzildi");
      void queryClient.invalidateQueries({ queryKey: ["telegram-link"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Uzish amalga oshmadi"),
  });

  if (link.isPending) return <LoadingState />;
  if (link.error) return <ErrorState error={link.error} onRetry={() => void link.refetch()} />;

  const current = link.data;

  return (
    <>
      <PageHeader
        title="Telegram integratsiyasi"
        description="Telegram — hisobot va bildirishnoma kanali. Asosiy CRM ishi shu veb platformada davom etadi."
      />

      {search.code ? (
        <div className="clay-panel space-y-4 p-6">
          <h2 className="text-lg font-semibold">Telegram akkauntini ulash</h2>
          {request.isPending ? (
            <p className="text-sm text-muted-foreground">Tekshirilmoqda...</p>
          ) : request.data?.valid ? (
            <>
              <p className="text-sm text-muted-foreground">
                {request.data.username ? `@${request.data.username}` : "Telegram akkauntingiz"} ni NEXORA CRM hisobingiz
                bilan ulashga ruxsat berasizmi?
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
                  {confirmMutation.isPending ? "Ulanmoqda..." : "Ha, ruxsat beraman"}
                </Button>
                <Button variant="outline" onClick={() => void navigate({ to: "/dashboard/telegram", search: {} })}>
                  Bekor qilish
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ulanish havolasi yaroqsiz yoki muddati tugagan. Telegram botga qaytib{" "}
              <span className="font-medium">/start</span> yuboring va yangi havolani oling.
            </p>
          )}
        </div>
      ) : null}

      {current ? (
        <LinkedCard
          key={current.id}
          link={current}
          saving={settingsMutation.isPending}
          onSave={(values) => settingsMutation.mutate(values as never)}
          onUnlink={() => {
            if (window.confirm("Telegramni uzishni tasdiqlaysizmi? Hisobotlar kelishi to‘xtaydi.")) {
              unlinkMutation.mutate();
            }
          }}
          unlinking={unlinkMutation.isPending}
        />
      ) : (
        <div className="clay-panel space-y-3 p-6">
          <h2 className="text-lg font-semibold">⚪️ Ulanmagan</h2>
          <p className="text-sm text-muted-foreground">
            Telegram botni oching, <span className="font-medium">/start</span> yuboring va{" "}
            <span className="font-medium">“🔗 NEXORA CRM akkauntini ulash”</span> tugmasini bosing. Bot sizni shu sahifaga
            qaytaradi. Parolingiz hech qachon Telegramda so‘ralmaydi.
          </p>
        </div>
      )}
    </>
  );
}

type LinkRow = NonNullable<Awaited<ReturnType<typeof getTelegramLink>>>;

function LinkedCard({
  link,
  onSave,
  saving,
  onUnlink,
  unlinking,
}: {
  link: LinkRow;
  onSave: (values: {
    dailyReports: boolean;
    reportTime: string;
    timezone: string;
    notifyNewOrder: boolean;
    notifyPayment: boolean;
    notifyLead: boolean;
    notifyLowStock: boolean;
  }) => void;
  saving: boolean;
  onUnlink: () => void;
  unlinking: boolean;
}) {
  const [dailyReports, setDailyReports] = useState(link.daily_reports);
  const [reportTime, setReportTime] = useState(link.report_time);
  const [timezone, setTimezone] = useState(link.timezone);
  const [notifyNewOrder, setNotifyNewOrder] = useState(link.notify_new_order);
  const [notifyPayment, setNotifyPayment] = useState(link.notify_payment);
  const [notifyLead, setNotifyLead] = useState(link.notify_lead);
  const [notifyLowStock, setNotifyLowStock] = useState(link.notify_low_stock);

  useEffect(() => {
    setDailyReports(link.daily_reports);
    setReportTime(link.report_time);
    setTimezone(link.timezone);
  }, [link.daily_reports, link.report_time, link.timezone]);

  return (
    <div className="clay-panel space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">🟢 Ulangan</h2>
        <p className="text-sm text-muted-foreground">
          {link.telegram_username ? `@${link.telegram_username}` : "Telegram akkaunt"} ·{" "}
          {new Date(link.linked_at).toLocaleDateString("uz-UZ")} dan beri
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleRow label="Kunlik hisobot" value={dailyReports} onChange={setDailyReports} />
        <div className="space-y-2">
          <Label htmlFor="report-time">Hisobot vaqti</Label>
          <Input id="report-time" type="time" value={reportTime} onChange={(e) => setReportTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Vaqt mintaqasi</Label>
          <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleRow label="Yangi buyurtma bildirishnomasi" value={notifyNewOrder} onChange={setNotifyNewOrder} />
        <ToggleRow label="To‘lov bildirishnomasi" value={notifyPayment} onChange={setNotifyPayment} />
        <ToggleRow label="Muhim lead bildirishnomasi" value={notifyLead} onChange={setNotifyLead} />
        <ToggleRow label="Ombor qoldig‘i bildirishnomasi" value={notifyLowStock} onChange={setNotifyLowStock} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() =>
            onSave({
              dailyReports,
              reportTime: reportTime.slice(0, 5),
              timezone,
              notifyNewOrder,
              notifyPayment,
              notifyLead,
              notifyLowStock,
            })
          }
          disabled={saving}
        >
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
        <Button variant="destructive" onClick={onUnlink} disabled={unlinking}>
          {unlinking ? "Uzilmoqda..." : "Telegramni uzish"}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="clay-inset flex items-center justify-between gap-4 rounded-2xl px-4 py-3">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
