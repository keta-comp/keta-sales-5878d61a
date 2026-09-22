import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Building2, Database, TrendingUp, Users, Wallet } from "lucide-react";

import { ErrorState, LoadingState, PageHeader } from "@/components/app/primitives";
import { DataTable, Field, MetricCard, NoData, Panel, fmtMoney, fmtNumber } from "@/components/app/super-admin-ui";
import { getPlatformOverview } from "@/lib/super-admin.functions";

export const Route = createFileRoute("/_authenticated/super-admin/")({
  head: () => ({
    meta: [
      { title: "Control Center — KETA CRM" },
      { name: "description", content: "KETA CRM platformasining umumiy ko‘rsatkichlari: organizationlar, foydalanuvchilar, AI ishlatilishi." },
      { property: "og:title", content: "Control Center — KETA CRM" },
      { property: "og:description", content: "KETA CRM platforma darajasidagi real ko‘rsatkichlar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const load = useServerFn(getPlatformOverview);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["super-admin-overview"],
    queryFn: () => load(),
  });

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data) return <NoData />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="KETA CRM Control Center"
        description="Platforma darajasidagi barcha ko‘rsatkichlar — faqat haqiqiy bazadagi ma’lumot."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jami organization" value={fmtNumber(data.organizations.total)} icon={<Building2 className="size-4" />} hint={`Faol: ${data.organizations.active}`} />
        <MetricCard label="Bloklangan" value={fmtNumber(data.organizations.suspended)} hint={`Sinov: ${data.organizations.trial}`} />
        <MetricCard label="Jami foydalanuvchi" value={fmtNumber(data.users.total)} icon={<Users className="size-4" />} hint={`Faol: ${data.users.active}`} />
        <MetricCard label="7 kunda faol" value={fmtNumber(data.users.activeLast7Days)} hint={`Bu oy yangi: ${data.users.newThisMonth}`} />
        <MetricCard label="Bugun yangi organization" value={fmtNumber(data.organizations.newToday)} icon={<TrendingUp className="size-4" />} />
        <MetricCard label="Bu oy yangi organization" value={fmtNumber(data.organizations.newThisMonth)} />
        <MetricCard label="AI so‘rovlari (jami)" value={fmtNumber(data.ai.total)} icon={<Bot className="size-4" />} hint={`Bugun: ${data.ai.today} · Bu oy: ${data.ai.thisMonth}`} />
        <MetricCard label="Jami yozuvlar" value={fmtNumber(data.storage.totalRecords)} icon={<Database className="size-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Moliya" description="Bizneslarning CRM ichidagi haqiqiy tushumi. Platforma obunasi hali ulanmagan.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bizneslar tushumi (jami)" value={fmtMoney(data.revenue.crmTurnoverTotal)} />
            <Field label="Bizneslar tushumi (bu oy)" value={fmtMoney(data.revenue.crmTurnoverThisMonth)} />
            <Field label="Obuna tushumi" value={<span className="text-muted-foreground">To‘lov tizimi ulanmagan</span>} />
            <Field label="MRR" value={<span className="text-muted-foreground">To‘lov tizimi ulanmagan</span>} />
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="size-3.5" /> Obuna va MRR raqamlari faqat real to‘lov integratsiyasidan keyin ko‘rinadi.
          </p>
        </Panel>

        <Panel title="Tizim yuklamasi" description="Bazadagi yozuvlar soni.">
          <DataTable columns={["Bo‘lim", "Yozuvlar"]}>
            {Object.entries({
              Mijozlar: data.records.customers,
              Murojaatlar: data.records.leads,
              Buyurtmalar: data.records.orders,
              "To‘lovlar": data.records.payments,
              Vazifalar: data.records.tasks,
              Mahsulotlar: data.records.products,
              Suhbatlar: data.records.conversations,
              Xabarlar: data.records.messages,
            }).map(([label, value]) => (
              <tr key={label}>
                <td className="px-3 py-2">{label}</td>
                <td className="px-3 py-2 tabular-nums">{fmtNumber(value)}</td>
              </tr>
            ))}
          </DataTable>
          <p className="mt-3 text-xs text-muted-foreground">
            Fayl va baza hajmi bo‘yicha aniq API mavjud emas — noto‘g‘ri raqam ko‘rsatilmaydi.
          </p>
        </Panel>
      </div>
    </div>
  );
}
