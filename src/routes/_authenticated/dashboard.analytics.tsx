import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ErrorState, LoadingState, PageHeader, StatCard } from "@/components/app/primitives";
import { getAnalytics } from "@/lib/stats.functions";
import { formatMoney } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  head: () => ({
    meta: [
      { title: "Savdo tahlili — KETA CRM" },
      { name: "description", content: "30 kunlik daromad, lidlar konversiyasi va eng ko'p sotilgan mahsulotlar." },
      { property: "og:title", content: "Savdo tahlili — KETA CRM" },
      { property: "og:description", content: "AI savdo agentingiz uchun daromad va konversiya tahlili." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const fetchAnalytics = useServerFn(getAnalytics);
  const analytics = useQuery({ queryKey: ["analytics"], queryFn: () => fetchAnalytics() });

  if (analytics.isPending) return <LoadingState />;
  if (analytics.error) return <ErrorState error={analytics.error} onRetry={() => void analytics.refetch()} />;

  const { days, topProducts, funnel, currency } = analytics.data;
  const revenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const leads = days.reduce((sum, day) => sum + day.leads, 0);
  const orders = days.reduce((sum, day) => sum + day.orders, 0);

  return (
    <>
      <PageHeader title="Savdo tahlili" description="So'nggi 30 kun, haqiqiy buyurtmalar va lidlar asosida hisoblangan." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Daromad (30 kun)" value={formatMoney(revenue, currency)} tone="success" />
        <StatCard label="Lidlar (30 kun)" value={leads} />
        <StatCard label="Buyurtmalar (30 kun)" value={orders} />
        <StatCard
          label="Konversiya"
          value={`${leads ? Math.round((orders / leads) * 1000) / 10 : 0}%`}
          tone="info"
        />
      </div>

      <section className="clay-panel rounded-3xl p-4">
        <h2 className="font-display text-base font-semibold">Daromad dinamikasi</h2>
        <div className="clay-inset mt-4 h-72 rounded-2xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  color: "var(--color-foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-primary)"
                fill="url(#rev)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="clay-panel rounded-3xl p-4">
          <h2 className="font-display text-base font-semibold">Lidlar va buyurtmalar</h2>
          <div className="clay-inset mt-4 h-64 rounded-2xl p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="leads" fill="var(--color-info)" radius={[4, 4, 0, 0]} name="Lidlar" />
                <Bar dataKey="orders" fill="var(--color-success)" radius={[4, 4, 0, 0]} name="Buyurtmalar" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="clay-panel rounded-3xl p-4">
          <h2 className="font-display text-base font-semibold">Eng ko'p sotilganlar</h2>
          <div className="clay-inset mt-3 divide-y divide-border rounded-2xl p-2 text-sm">
            {topProducts.map((product) => (
              <div key={product.name} className="flex items-center justify-between gap-3 px-2 py-2">
                <span className="truncate text-foreground">{product.name}</span>
                <span className="text-xs text-muted-foreground">{product.quantity} dona sotildi</span>
                <span className="tabular-nums">{formatMoney(product.revenue, currency)}</span>
              </div>
            ))}
            {topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Hozircha sotuv ma'lumotlari yo'q.</p>
            ) : null}
          </div>

          <h3 className="mt-6 font-display text-sm font-semibold">Lidlar voronkasi</h3>
          <div className="mt-2 space-y-2">
            {(
              [
                ["Jami lidlar", funnel.total],
                ["Qizg'in", funnel.hot],
                ["O'rtacha", funnel.warm],
                ["Sovuq", funnel.cold],
                ["Yutilgan", funnel.won],
                ["Yo'qotilgan", funnel.lost],
              ] as const
            ).map(([label, count]) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{label}</span>
                  <span>{count}</span>
                </div>
                <div className="clay-inset mt-1 h-2 rounded-full">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (count / Math.max(1, funnel.total)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="clay-panel rounded-3xl p-4">
          <h2 className="font-display text-base font-semibold">Eng ko'p sotilganlar</h2>
          <div className="clay-inset mt-3 divide-y divide-border rounded-2xl p-2 text-sm">
            {topProducts.map((product) => (
              <div key={product.name} className="flex items-center justify-between gap-3 px-2 py-2">
                <span className="truncate text-foreground">{product.name}</span>
                <span className="text-xs text-muted-foreground">{product.quantity} dona sotildi</span>
                <span className="tabular-nums">{formatMoney(product.revenue, currency)}</span>
              </div>
            ))}
            {topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Hozircha sotuv ma'lumotlari yo'q.</p>
            ) : null}
          </div>

          <h3 className="mt-6 font-display text-sm font-semibold">Lidlar voronkasi</h3>
          <div className="mt-2 space-y-2">
            {(
              [
                ["Jami lidlar", funnel.total],
                ["Qizg'in", funnel.hot],
                ["O'rtacha", funnel.warm],
                ["Sovuq", funnel.cold],
                ["Yutilgan", funnel.won],
                ["Yo'qotilgan", funnel.lost],
              ] as const
            ).map(([label, count]) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{label}</span>
                  <span>{count}</span>
                </div>
                <div className="clay-inset mt-1 h-2 rounded-full">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.min(100, (count / Math.max(1, funnel.total)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
