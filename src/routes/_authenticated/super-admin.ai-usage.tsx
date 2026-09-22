import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState, LoadingState, PageHeader } from "@/components/app/primitives";
import { DataTable, MetricCard, NoData, Panel, fmtDate, fmtNumber } from "@/components/app/super-admin-ui";
import { getAiUsage } from "@/lib/super-admin.functions";

export const Route = createFileRoute("/_authenticated/super-admin/ai-usage")({
  head: () => ({
    meta: [
      { title: "AI ishlatilishi — NEXORA CRM Control Center" },
      { name: "description", content: "Platformada AI so‘rovlari: organization, foydalanuvchi va funksiya bo‘yicha." },
      { property: "og:title", content: "AI ishlatilishi — NEXORA CRM Control Center" },
      { property: "og:description", content: "AI so‘rovlari statistikasi va tokenlar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiUsagePage,
});

function AiUsagePage() {
  const [days, setDays] = useState("30");
  const range = useMemo(() => {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - Number(days)));
    return { from: from.toISOString(), to: now.toISOString() };
  }, [days]);

  const load = useServerFn(getAiUsage);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["super-admin-ai", range.from, range.to],
    queryFn: () => load({ data: range }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI ishlatilishi"
        description="Haqiqiy so‘rovlar. Narx ma’lumoti mavjud bo‘lmaganda taxminiy xarajat ko‘rsatilmaydi."
        actions={
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Oxirgi 7 kun</SelectItem>
              <SelectItem value="30">Oxirgi 30 kun</SelectItem>
              <SelectItem value="90">Oxirgi 90 kun</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {isPending ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !data ? (
        <NoData />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Jami so‘rov" value={fmtNumber(data.totals.total)} />
            <MetricCard label="Bugun" value={fmtNumber(data.totals.today)} />
            <MetricCard label="Bu oy" value={fmtNumber(data.totals.thisMonth)} />
            <MetricCard label="Tanlangan davrda" value={fmtNumber(data.totals.inRange)} hint="Taxminiy narx: ma’lumot yo‘q" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Organizationlar bo‘yicha">
              {data.byOrganization.length === 0 ? (
                <NoData />
              ) : (
                <DataTable columns={["Organization", "So‘rov", "Tokenlar"]}>
                  {data.byOrganization.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2">{r.label}</td>
                      <td className="px-3 py-2 tabular-nums">{fmtNumber(r.requests)}</td>
                      <td className="px-3 py-2 tabular-nums">{fmtNumber(r.tokens)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </Panel>

            <Panel title="Foydalanuvchilar bo‘yicha">
              {data.byUser.length === 0 ? (
                <NoData />
              ) : (
                <DataTable columns={["Foydalanuvchi", "So‘rov", "Tokenlar"]}>
                  {data.byUser.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2">{r.label}</td>
                      <td className="px-3 py-2 tabular-nums">{fmtNumber(r.requests)}</td>
                      <td className="px-3 py-2 tabular-nums">{fmtNumber(r.tokens)}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </Panel>
          </div>

          <Panel title="Funksiyalar bo‘yicha">
            {data.byFeature.length === 0 ? (
              <NoData />
            ) : (
              <DataTable columns={["Funksiya", "So‘rov"]}>
                {data.byFeature.map((r) => (
                  <tr key={r.feature}>
                    <td className="px-3 py-2">{r.feature}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtNumber(r.requests)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Panel>

          <Panel title="Oxirgi so‘rovlar">
            {data.recent.length === 0 ? (
              <NoData />
            ) : (
              <DataTable columns={["Vaqt", "Funksiya", "Model", "Kirish", "Chiqish"]}>
                {data.recent.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-xs">{fmtDate(r.created_at)}</td>
                    <td className="px-3 py-2">{r.feature}</td>
                    <td className="px-3 py-2 text-xs">{r.model ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtNumber(r.input_tokens ?? 0)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmtNumber(r.output_tokens ?? 0)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
