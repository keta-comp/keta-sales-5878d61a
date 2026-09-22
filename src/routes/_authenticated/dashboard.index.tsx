import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import {
  Activity,
  Flame,
  MessagesSquare,
  ShoppingCart,
  Target,
  TrendingUp,
  UserRoundCheck,
  Wallet,
} from "lucide-react";

import { ErrorState, LoadingState, PageHeader, StatCard, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getOverview } from "@/lib/stats.functions";
import { listLeads } from "@/lib/crm.functions";
import { getMyCrmConfig, getWidgetStats } from "@/lib/crm-config.functions";
import { listOrders } from "@/lib/orders.functions";
import { formatMoney } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Savdo ko‘rinishi — SalesPilot AI" },
      { name: "description", content: "AI savdo natijalari real vaqtda: murojaatlar, buyurtmalar, tushum va operatorga uzatishlar." },
      { property: "og:title", content: "Savdo ko‘rinishi — SalesPilot AI" },
      { property: "og:description", content: "Telegram do‘koningiz uchun jonli AI savdo natijalari." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const fetchOverview = useServerFn(getOverview);
  const fetchLeads = useServerFn(listLeads);
  const fetchOrders = useServerFn(listOrders);

  const fetchConfig = useServerFn(getMyCrmConfig);
  const fetchWidgets = useServerFn(getWidgetStats);

  const overview = useQuery({ queryKey: ["overview"], queryFn: () => fetchOverview() });
  const leads = useQuery({ queryKey: ["leads", "recent"], queryFn: () => fetchLeads({ data: {} }) });
  const orders = useQuery({ queryKey: ["orders", "recent"], queryFn: () => fetchOrders({ data: {} }) });
  const crmConfig = useQuery({ queryKey: ["crm-config"], queryFn: () => fetchConfig() });
  const widgetStats = useQuery({
    queryKey: ["crm-widgets"],
    queryFn: () => fetchWidgets(),
    enabled: !!crmConfig.data?.hasConfig,
  });

  useEffect(() => {
    const channel = supabase
      .channel("overview-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        void overview.refetch();
        void leads.refetch();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        void overview.refetch();
        void orders.refetch();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (overview.isPending) return <LoadingState label="Jonli ko‘rsatkichlar yuklanmoqda…" />;
  if (overview.error) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;

  const data = overview.data;
  const currency = data.currency;

  return (
    <>
      <PageHeader
        title="Savdo ko‘rinishi"
        description="AI agent va operatorlaringiz bugun yopgan barcha savdolar — bevosita bazadan."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/conversations">Suhbatlarni ochish</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bugungi tushum" value={formatMoney(data.revenueToday, currency)} tone="success" icon={<Wallet className="size-4" />} />
        <StatCard label="Bugungi buyurtmalar" value={data.ordersToday} icon={<ShoppingCart className="size-4" />} />
        <StatCard label="Bugungi murojaatlar" value={data.leadsToday} icon={<Target className="size-4" />} />
        <StatCard label="Bugungi AI suhbatlar" value={data.aiConversationsToday} icon={<MessagesSquare className="size-4" />} />
        <StatCard label="Qaynoq murojaatlar" value={data.hotLeads} tone="danger" icon={<Flame className="size-4" />} />
        <StatCard label="Operator kutilmoqda" value={data.humanHandoffs} tone="warning" icon={<UserRoundCheck className="size-4" />} hint="AI agent tomonidan uzatilgan" />
        <StatCard label="Murojaat → buyurtma" value={`${data.conversionRate}%`} tone="info" icon={<TrendingUp className="size-4" />} />
        <StatCard label="O‘rtacha AI javobi" value={`${data.avgResponseSeconds}s`} icon={<Activity className="size-4" />} hint="Oxirgi 24 soat" />
      </div>

      {crmConfig.data?.config?.dashboardWidgets?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {crmConfig.data.config.dashboardWidgets.map((widget) => {
            const value = widgetStats.data?.widgets?.[widget.key];
            const isMoney = widget.kind === "legacy_today_revenue" || widget.kind === "field_sum";
            return (
              <StatCard
                key={widget.key}
                label={widget.label}
                value={isMoney ? formatMoney(value ?? 0, currency) : (value ?? 0)}
                tone={widget.kind.startsWith("legacy") ? undefined : "info"}
                icon={<LayoutGrid className="size-4" />}
              />
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="clay-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Oxirgi murojaatlar</h2>
            <Link to="/dashboard/leads" className="text-xs text-primary hover:underline">
              Barchasi
            </Link>
          </div>
          <div className="clay-inset mt-4 divide-y divide-border/70 p-2">
            {(leads.data ?? []).slice(0, 6).map((lead) => {
              const customer = lead.customers as { full_name: string | null; telegram_username: string | null } | null;
              return (
                <div key={lead.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-card">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {customer?.full_name ?? customer?.telegram_username ?? "Telegram mijozi"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.requested_product ?? lead.ai_summary ?? "Yangi murojaat"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge value={lead.score} />
                    <StatusBadge value={lead.status} />
                  </div>
                </div>
              );
            })}
            {leads.data?.length ? null : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Hozircha murojaat yo‘q — Sozlamalarda Telegram botni ulang.
              </p>
            )}
          </div>
        </section>

        <section className="clay-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Oxirgi buyurtmalar</h2>
            <Link to="/dashboard/orders" className="text-xs text-primary hover:underline">
              Barchasi
            </Link>
          </div>
          <div className="clay-inset mt-4 divide-y divide-border/70 p-2">
            {(orders.data ?? []).slice(0, 6).map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-card">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{order.order_number}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatMoney(order.total, currency)}
                  </p>
                </div>
                <StatusBadge value={order.status} />
              </div>
            ))}
            {orders.data?.length ? null : (
              <p className="py-6 text-center text-sm text-muted-foreground">Hozircha buyurtma yo‘q.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}