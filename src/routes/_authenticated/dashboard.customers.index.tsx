import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus } from "lucide-react";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/app/primitives";
import { CustomerDialog, usePickers } from "@/components/app/crm-dialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { crmLabel, CUSTOMER_SOURCES, CUSTOMER_STATUSES } from "@/lib/crm-core";
import { listCrmCustomers } from "@/lib/customers.functions";
import { getMyCrmConfig } from "@/lib/crm-config.functions";
import { formatMoney } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard/customers/")({
  head: () => ({
    meta: [
      { title: "Mijozlar — NEXORA CRM" },
      {
        name: "description",
        content: "Mijozlar bazasi: aloqa ma’lumotlari, holati, manbasi va sotib olish tarixi.",
      },
      { property: "og:title", content: "Mijozlar — NEXORA CRM" },
      { property: "og:description", content: "Har bir mijoz uchun to‘liq profil va tarix." },
    ],
  }),
  component: CustomersPage,
});

type CustomerRow = Awaited<ReturnType<typeof listCrmCustomers>>[number];

function CustomersPage() {
  const fetchCustomers = useServerFn(listCrmCustomers);
  const fetchConfig = useServerFn(getMyCrmConfig);
  const pickers = usePickers(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [operatorId, setOperatorId] = useState("all");
  const [sort, setSort] = useState<"recent" | "name" | "spent">("recent");
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [open, setOpen] = useState(false);

  const crm = useQuery({ queryKey: ["crm-config"], queryFn: () => fetchConfig() });
  const query = useQuery({
    queryKey: ["crm-customers", search, status, source, operatorId, sort],
    queryFn: () => fetchCustomers({ data: { search, status, source, operatorId, sort } }),
  });

  const term = crm.data?.config?.terminology?.["customer"] ?? "Mijozlar";
  const currency = "UZS";

  return (
    <>
      <PageHeader
        title={term}
        description="Qidiruv, filtr va saralash bilan bazani boshqaring."
        actions={
          <Button
            size="sm"
            className="gap-1"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Yangi
          </Button>
        }
      />

      <div className="clay-panel flex flex-wrap items-center gap-2 p-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ism, telefon yoki email…"
          className="h-9 w-full sm:w-64"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Holat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha holat</SelectItem>
            {CUSTOMER_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {crmLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Manba" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha manba</SelectItem>
            {CUSTOMER_SOURCES.map((value) => (
              <SelectItem key={value} value={value}>
                {crmLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={operatorId} onValueChange={setOperatorId}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Mas’ul" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha mas’ul</SelectItem>
            {(pickers.data?.operators ?? []).map((operator) => (
              <SelectItem key={operator.id} value={operator.id}>
                {operator.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Saralash" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Oxirgi aloqa</SelectItem>
            <SelectItem value="name">Ism bo‘yicha</SelectItem>
            <SelectItem value="spent">Xarid summasi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isPending ? (
        <LoadingState label="Mijozlar yuklanmoqda…" />
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (query.data ?? []).length === 0 ? (
        <EmptyState title="Mijoz topilmadi" description="Filtrni o‘zgartiring yoki yangi mijoz qo‘shing." />
      ) : (
        <div className="clay-panel overflow-x-auto p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ism</TableHead>
                <TableHead>Aloqa</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Manba</TableHead>
                <TableHead>Buyurtma</TableHead>
                <TableHead>Xarid</TableHead>
                <TableHead>Mas’ul</TableHead>
                <TableHead className="text-right">Amal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(query.data ?? []).map((row) => {
                const operator = row.operators as { full_name: string | null } | null;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link
                        to="/dashboard/customers/$id"
                        params={{ id: row.id }}
                        className="underline-offset-4 hover:underline"
                      >
                        {row.full_name ?? "Ismsiz"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[row.phone, row.email].filter(Boolean).join(" • ") || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={row.status} />
                    </TableCell>
                    <TableCell className="text-xs">{crmLabel(row.source)}</TableCell>
                    <TableCell className="tabular-nums">{row.total_orders}</TableCell>
                    <TableCell className="tabular-nums">{formatMoney(row.total_spent, currency)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {operator?.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Tahrirlash"
                        onClick={() => {
                          setEditing(row);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CustomerDialog
        open={open}
        onOpenChange={setOpen}
        customer={
          editing
            ? {
                id: editing.id,
                full_name: editing.full_name,
                phone: editing.phone,
                email: editing.email,
                location: editing.location,
                status: editing.status,
                source: editing.source,
                assigned_operator_id: editing.assigned_operator_id,
                notes: editing.notes,
              }
            : undefined
        }
        title={editing ? "Mijozni tahrirlash" : "Yangi mijoz"}
      />
    </>
  );
}
