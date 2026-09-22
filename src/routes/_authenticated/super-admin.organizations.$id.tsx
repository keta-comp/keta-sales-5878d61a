import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, LoadingState, PageHeader } from "@/components/app/primitives";
import { DataTable, Field, NoData, Panel, Pill, fmtDate, fmtMoney, fmtNumber } from "@/components/app/super-admin-ui";
import { getOrganization, setOrganizationPlan, setOrganizationStatus } from "@/lib/super-admin.functions";

export const Route = createFileRoute("/_authenticated/super-admin/organizations/$id")({
  head: () => ({
    meta: [
      { title: "Organization profili — KETA CRM Control Center" },
      { name: "description", content: "Bitta biznesning platforma darajasidagi profili: jamoa, CRM, faollik va AI ishlatilishi." },
      { property: "og:title", content: "Organization profili — KETA CRM Control Center" },
      { property: "og:description", content: "Biznes profili, jamoa va faollik tarixi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrganizationDetailPage,
});

const PLANS = ["free", "starter", "business", "enterprise"] as const;

function OrganizationDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const load = useServerFn(getOrganization);
  const statusFn = useServerFn(setOrganizationStatus);
  const planFn = useServerFn(setOrganizationPlan);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [reason, setReason] = useState("");

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["super-admin-org", id],
    queryFn: () => load({ data: { id } }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["super-admin-org", id] });
    void queryClient.invalidateQueries({ queryKey: ["super-admin-orgs"] });
  };

  const changeStatus = useMutation({
    mutationFn: (input: { status: "active" | "suspended"; reason?: string }) =>
      statusFn({ data: { id, status: input.status, reason: input.reason } }),
    onSuccess: (_r, input) => {
      toast.success(input.status === "suspended" ? "Organization bloklandi" : "Organization qayta faollashtirildi");
      setConfirmSuspend(false);
      setReason("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Amal bajarilmadi"),
  });

  const changePlan = useMutation({
    mutationFn: (plan: (typeof PLANS)[number]) => planFn({ data: { id, plan } }),
    onSuccess: () => {
      toast.success("Plan o‘zgartirildi");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Amal bajarilmadi"),
  });

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data) return <NoData />;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link to="/super-admin/organizations">
          <ArrowLeft className="size-4" /> Organizationlar
        </Link>
      </Button>

      <PageHeader
        title={data.business.name}
        description={`${data.industry ?? "Soha ko‘rsatilmagan"} · ${data.members.length} foydalanuvchi`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={data.business.plan} onValueChange={(v) => changePlan.mutate(v as (typeof PLANS)[number])}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            {data.business.status === "suspended" ? (
              <Button size="sm" onClick={() => changeStatus.mutate({ status: "active" })}>
                Qayta faollashtirish
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={() => setConfirmSuspend(true)}>
                Bloklash
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Asosiy ma’lumot">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Holat" value={<Pill value={data.business.status} />} />
            <Field label="Plan" value={data.business.plan} />
            <Field label="Egasi" value={data.owner?.name ?? "—"} />
            <Field label="Egasining emaili" value={data.owner?.email ?? "—"} />
            <Field label="Telefon" value={data.owner?.phone ?? "—"} />
            <Field label="Yaratilgan" value={fmtDate(data.business.createdAt)} />
            {data.business.status === "suspended" ? (
              <>
                <Field label="Bloklangan vaqt" value={fmtDate(data.business.suspendedAt)} />
                <Field label="Sabab" value={data.business.suspendReason ?? "—"} />
              </>
            ) : null}
          </div>
        </Panel>
        <Panel title="Hajm va foydalanish">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mijozlar" value={fmtNumber(data.counts.customers)} />
            <Field label="Murojaatlar" value={fmtNumber(data.counts.leads)} />
            <Field label="Buyurtmalar" value={fmtNumber(data.counts.orders)} />
            <Field label="Vazifalar" value={fmtNumber(data.counts.tasks)} />
            <Field label="Tushum (jami)" value={fmtMoney(data.revenue.crmTurnoverTotal)} />
            <Field label="AI so‘rovlari" value={fmtNumber(data.ai.total)} />
          </div>
        </Panel>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users">Jamoa</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
          <TabsTrigger value="activity">Faollik</TabsTrigger>
          <TabsTrigger value="usage">AI va foydalanish</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Panel>
            {data.members.length === 0 ? (
              <NoData label="Jamoa a’zolari yo‘q" />
            ) : (
              <DataTable columns={["Ism", "Email", "Rol", "Holat", "Qo‘shilgan", "Oxirgi faollik"]}>
                {data.members.map((m) => (
                  <tr key={m.userId}>
                    <td className="px-3 py-2">{m.name ?? "—"}</td>
                    <td className="px-3 py-2">{m.email ?? "—"}</td>
                    <td className="px-3 py-2">{m.role}</td>
                    <td className="px-3 py-2"><Pill value={m.status} /></td>
                    <td className="px-3 py-2 text-xs">{fmtDate(m.joinedAt)}</td>
                    <td className="px-3 py-2 text-xs">{fmtDate(m.lastActiveAt)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="crm" className="mt-4">
          <Panel title="CRM konfiguratsiyasi">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Soha" value={data.industry ?? "—"} />
              <Field label="Modullar" value={data.modules.length ? data.modules.join(", ") : "—"} />
            </div>
            {data.businessDescription ? (
              <p className="mt-4 text-sm text-muted-foreground">{data.businessDescription}</p>
            ) : null}
          </Panel>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Panel>
            {data.activities.length === 0 ? (
              <NoData label="Faollik yozuvlari yo‘q" />
            ) : (
              <DataTable columns={["Vaqt", "Bo‘lim", "Amal", "Izoh", "Kim"]}>
                {data.activities.map((a, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-xs">{fmtDate(a.created_at)}</td>
                    <td className="px-3 py-2">{a.entity_type}</td>
                    <td className="px-3 py-2">{a.action}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.detail ?? "—"}</td>
                    <td className="px-3 py-2">{a.actor}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <Panel title="AI ishlatilishi">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Jami so‘rov" value={fmtNumber(data.ai.total)} />
              <Field label="Bugun" value={fmtNumber(data.ai.today)} />
              <Field label="Bu oy" value={fmtNumber(data.ai.thisMonth)} />
              <Field label="Kirish tokenlari" value={fmtNumber(data.ai.inputTokens)} />
              <Field label="Chiqish tokenlari" value={fmtNumber(data.ai.outputTokens)} />
              <Field label="Taxminiy narx" value={<span className="text-muted-foreground">Narx ma’lumoti mavjud emas</span>} />
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Panel>
            {data.audit.length === 0 ? (
              <NoData label="Audit yozuvlari yo‘q" />
            ) : (
              <DataTable columns={["Vaqt", "Amal", "Kim", "Holat"]}>
                {data.audit.map((a, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-xs">{fmtDate(a.created_at)}</td>
                    <td className="px-3 py-2">{a.action}</td>
                    <td className="px-3 py-2">{a.actor_email ?? "—"}</td>
                    <td className="px-3 py-2"><Pill value={a.status} /></td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ushbu organizationni vaqtincha bloklamoqchimisiz?</DialogTitle>
            <DialogDescription>
              Xodimlar CRMga kira olmaydi. Hech qanday ma’lumot o‘chirilmaydi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Sabab (ixtiyoriy)</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSuspend(false)}>Bekor qilish</Button>
            <Button
              variant="destructive"
              disabled={changeStatus.isPending}
              onClick={() => changeStatus.mutate({ status: "suspended", reason: reason.trim() || undefined })}
            >
              Bloklash
            </Button>
          </DialogFooter>
      </Dialog>
    </div>
  );
}
