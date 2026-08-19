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
import { listOrders } from "@/lib/orders.functions";
import { formatMoney } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Sales overview — SalesPilot AI" },
      { name: "description", content: "Live AI sales performance: leads, orders, revenue and handoffs." },
      { property: "og:title", content: "Sales overview — SalesPilot AI" },
      { property: "og:description", content: "Live AI sales performance for your Telegram storefront." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const fetchOverview = useServerFn(getOverview);
  const fetchLeads = useServerFn(listLeads);
  const fetchOrders = useServerFn(listOrders);

  const overview = useQuery({ queryKey: ["overview"], queryFn: () => fetchOverview() });
  const leads = useQuery({ queryKey: ["leads", "recent"], queryFn: () => fetchLeads({ data: {} }) });
  const orders = useQuery({ queryKey: ["orders", "recent"], queryFn: () => fetchOrders({ data: {} }) });

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

  if (overview.isPending) return <LoadingState label="Loading live metrics…" />;
  if (overview.error) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;

  const data = overview.data;
  const currency = data.currency;

  return (
    <>
      <PageHeader
        title="Sales overview"
        description="Everything your AI agent and operators closed today, straight from the database."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/conversations">Open inbox</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue today" value={formatMoney(data.revenueToday, currency)} tone="success" icon={<Wallet className="size-4" />} />
        <StatCard label="Orders today" value={data.ordersToday} icon={<ShoppingCart className="size-4" />} />
        <StatCard label="Leads today" value={data.leadsToday} icon={<Target className="size-4" />} />
        <StatCard label="AI chats today" value={data.aiConversationsToday} icon={<MessagesSquare className="size-4" />} />
        <StatCard label="Hot leads" value={data.hotLeads} tone="danger" icon={<Flame className="size-4" />} />
        <StatCard label="Waiting for operator" value={data.humanHandoffs} tone="warning" icon={<UserRoundCheck className="size-4" />} hint="Escalated by the AI agent" />
        <StatCard label="Lead → order rate" value={`${data.conversionRate}%`} tone="info" icon={<TrendingUp className="size-4" />} />
        <StatCard label="Avg AI reply" value={`${data.avgResponseSeconds}s`} icon={<Activity className="size-4" />} hint="Last 24 hours" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="surface-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Latest leads</h2>
            <Link to="/dashboard/leads" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 divide-y divide-border">
            {(leads.data ?? []).slice(0, 6).map((lead) => {
              const customer = lead.customers as { full_name: string | null; telegram_username: string | null } | null;
              return (
                <div key={lead.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {customer?.full_name ?? customer?.telegram_username ?? "Telegram customer"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.requested_product ?? lead.ai_summary ?? "New enquiry"}
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
                No leads yet — connect your Telegram bot in Settings.
              </p>
            )}
          </div>
        </section>

        <section className="surface-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Latest orders</h2>
            <Link to="/dashboard/orders" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3 divide-y divide-border">
            {(orders.data ?? []).slice(0, 6).map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 py-2.5">
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
              <p className="py-6 text-center text-sm text-muted-foreground">No orders yet.</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}