import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState, LoadingState, PageHeader } from "@/components/app/primitives";
import {
  DataTable,
  Field,
  NoData,
  Panel,
  Pill,
  downloadBase64Xlsx,
  fmtDate,
  fmtNumber,
} from "@/components/app/super-admin-ui";
import {
  exportPlatformExcel,
  getPlatformUser,
  listUsersFn,
  sendPasswordResetFor,
  setUserRole,
  setUserStatus,
} from "@/lib/super-admin.functions";

export const Route = createFileRoute("/_authenticated/super-admin/users")({
  head: () => ({
    meta: [
      { title: "Foydalanuvchilar — KETA CRM Control Center" },
      { name: "description", content: "KETA CRM platformasidagi barcha foydalanuvchilar, rollari va holati." },
      { property: "og:title", content: "Foydalanuvchilar — KETA CRM Control Center" },
      { property: "og:description", content: "Barcha foydalanuvchilar: organization, rol, holat, faollik." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

const ROLES = ["owner", "admin", "manager", "operator"] as const;

function UserDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const load = useServerFn(getPlatformUser);
  const statusFn = useServerFn(setUserStatus);
  const roleFn = useServerFn(setUserRole);
  const resetFn = useServerFn(sendPasswordResetFor);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["super-admin-user", userId],
    queryFn: () => load({ data: { id: userId } }),
  });

  const invalidate = () => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
  };

  const changeStatus = useMutation({
    mutationFn: (status: "active" | "suspended") => statusFn({ data: { id: userId, status } }),
    onSuccess: () => {
      toast.success("Holat yangilandi");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Amal bajarilmadi"),
  });

  const changeRole = useMutation({
    mutationFn: (role: (typeof ROLES)[number]) => roleFn({ data: { id: userId, role } }),
    onSuccess: () => {
      toast.success("Rol yangilandi");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Amal bajarilmadi"),
  });

  const sendReset = useMutation({
    mutationFn: () => resetFn({ data: { id: userId } }),
    onSuccess: () => toast.success("Parolni tiklash havolasi emailga yuborildi"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Yuborilmadi"),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Foydalanuvchi profili</DialogTitle>
          <DialogDescription>
            Parol va maxfiy kalitlar hech qachon ko‘rsatilmaydi — faqat tiklash havolasi yuboriladi.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !data ? (
          <NoData />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ism" value={data.profile.name ?? "—"} />
              <Field label="Email" value={data.profile.email ?? "—"} />
              <Field label="Telefon" value={data.profile.phone ?? "—"} />
              <Field label="Holat" value={<Pill value={data.profile.status} />} />
              <Field label="Ro‘yxatdan o‘tgan" value={fmtDate(data.profile.createdAt)} />
              <Field label="Oxirgi faollik" value={fmtDate(data.profile.lastActiveAt)} />
              <Field label="AI so‘rovlari" value={fmtNumber(data.usage.aiRequests)} />
              <Field
                label="Platforma roli"
                value={data.profile.isSuperAdmin ? "Super Admin" : data.memberships[0]?.role ?? "—"}
              />
            </div>

            {data.memberships.length ? (
              <DataTable columns={["Organization", "Rol", "Holat", "Plan"]}>
                {data.memberships.map((m) => (
                  <tr key={m.businessId}>
                    <td className="px-3 py-2">
                      <Link to="/super-admin/organizations/$id" params={{ id: m.businessId }} className="underline-offset-4 hover:underline">
                        {m.organization ?? "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{m.role}</td>
                    <td className="px-3 py-2"><Pill value={m.organizationStatus} /></td>
                    <td className="px-3 py-2">{m.plan ?? "—"}</td>
                  </tr>
                ))}
              </DataTable>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={data.memberships[0]?.role ?? "operator"}
                onValueChange={(v) => changeRole.mutate(v as (typeof ROLES)[number])}
                disabled={data.profile.isSuperAdmin}
              >
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {data.profile.status === "suspended" ? (
                <Button size="sm" onClick={() => changeStatus.mutate("active")}>Qayta faollashtirish</Button>
              ) : (
                <Button size="sm" variant="destructive" disabled={data.profile.isSuperAdmin} onClick={() => changeStatus.mutate("suspended")}>
                  Bloklash
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => sendReset.mutate()}>
                <KeyRound className="size-4" /> Parolni tiklash havolasi
              </Button>
            </div>

            {data.audit.length ? (
              <DataTable columns={["Vaqt", "Amal", "Holat", "IP"]}>
                {data.audit.map((a, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-xs">{fmtDate(a.created_at)}</td>
                    <td className="px-3 py-2">{a.action}</td>
                    <td className="px-3 py-2"><Pill value={a.status} /></td>
                    <td className="px-3 py-2 text-xs">{a.ip ?? "—"}</td>
                  </tr>
                ))}
              </DataTable>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);

  const load = useServerFn(listUsersFn);
  const exportFn = useServerFn(exportPlatformExcel);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["super-admin-users", search, status, role],
    queryFn: () => load({ data: { search, status, role } }),
  });

  const exportExcel = async () => {
    try {
      const file = await exportFn({ data: { kind: "users" } });
      downloadBase64Xlsx(file.base64, file.filename);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Eksport qilinmadi");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Foydalanuvchilar"
        description="Platformadagi barcha hisoblar. Parol va maxfiy kalitlar ko‘rsatilmaydi."
        actions={
          <Button variant="outline" size="sm" onClick={() => void exportExcel()}>
            <Download className="size-4" /> Excel
          </Button>
        }
      />

      <Panel>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ism, email, organization" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Holat" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha holatlar</SelectItem>
              <SelectItem value="active">Faol</SelectItem>
              <SelectItem value="suspended">Bloklangan</SelectItem>
              <SelectItem value="pending">Kutilmoqda</SelectItem>
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue placeholder="Rol" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha rollar</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Panel>

      <Panel>
        {isPending ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (data ?? []).length === 0 ? (
          <NoData label="Foydalanuvchi topilmadi" />
        ) : (
          <DataTable columns={["Ism", "Email", "Organization", "Rol", "Soha", "Holat", "Yaratilgan", "Oxirgi faollik"]}>
            {(data ?? []).map((u) => (
              <tr key={u.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(u.id)}>
                <td className="px-3 py-2 font-medium">{u.name ?? "—"}</td>
                <td className="px-3 py-2">{u.email ?? "—"}</td>
                <td className="px-3 py-2">{u.organization ?? "—"}</td>
                <td className="px-3 py-2">{u.role === "super_admin" ? "Super Admin" : u.role}</td>
                <td className="px-3 py-2">{u.industry ?? "—"}</td>
                <td className="px-3 py-2"><Pill value={u.status} /></td>
                <td className="px-3 py-2 text-xs">{fmtDate(u.createdAt)}</td>
                <td className="px-3 py-2 text-xs">{fmtDate(u.lastActiveAt)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      {selected ? <UserDialog userId={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
