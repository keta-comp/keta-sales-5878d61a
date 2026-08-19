import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getCustomer, listCustomers, updateCustomer } from "@/lib/crm.functions";
import { formatMoney } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard/customers")({
  head: () => ({
    meta: [
      { title: "Customers — SalesPilot AI" },
      { name: "description", content: "Telegram customer records with spend, orders and conversation history." },
      { property: "og:title", content: "Customers — SalesPilot AI" },
      { property: "og:description", content: "Customer CRM built from real Telegram sales conversations." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const queryClient = useQueryClient();
  const fetchCustomers = useServerFn(listCustomers);
  const fetchCustomer = useServerFn(getCustomer);
  const save = useServerFn(updateCustomer);

  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const customers = useQuery({
    queryKey: ["customers", search],
    queryFn: () => fetchCustomers({ data: { search } }),
  });
  const detail = useQuery({
    queryKey: ["customer", openId],
    queryFn: () => fetchCustomer({ data: { id: openId! } }),
    enabled: Boolean(openId),
  });

  const mutation = useMutation({
    mutationFn: (input: { id: string; full_name?: string | null; phone?: string | null; location?: string | null; notes?: string | null }) =>
      save({ data: input }),
    onSuccess: () => {
      toast.success("Customer saved");
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      void queryClient.invalidateQueries({ queryKey: ["customer"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Save failed"),
  });

  const customer = detail.data?.customer;

  return (
    <>
      <PageHeader title="Customers" description="Auto-created from Telegram, enriched by the AI agent." />

      <div className="max-w-sm">
        <Label htmlFor="customer-search">Search</Label>
        <Input
          id="customer-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, @username or phone"
        />
      </div>

      {customers.isPending ? (
        <LoadingState />
      ) : customers.error ? (
        <ErrorState error={customers.error} onRetry={() => void customers.refetch()} />
      ) : customers.data.length === 0 ? (
        <EmptyState title="No customers yet" description="They are created when someone messages your bot." />
      ) : (
        <div className="surface-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Total spent</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.data.map((row) => (
                <tr key={row.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-foreground">{row.full_name ?? "Telegram customer"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.telegram_username ? `@${row.telegram_username}` : (row.phone ?? "—")}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.total_orders}</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(row.total_spent)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(row.last_interaction_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setOpenId(row.id)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={Boolean(openId)} onOpenChange={(next) => setOpenId(next ? openId : null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Customer profile</SheetTitle>
          </SheetHeader>
          {detail.isPending ? (
            <LoadingState />
          ) : detail.error ? (
            <ErrorState error={detail.error} />
          ) : customer ? (
            <CustomerForm
              key={customer.id}
              customer={customer}
              leads={detail.data?.leads ?? []}
              orders={detail.data?.orders ?? []}
              onSave={(patch) => mutation.mutate({ id: customer.id, ...patch })}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function CustomerForm({
  customer,
  leads,
  orders,
  onSave,
}: {
  customer: { full_name: string | null; phone: string | null; location: string | null; notes: string | null };
  leads: { id: string; status: string; requested_product: string | null }[];
  orders: { id: string; order_number: string; total: number; status: string }[];
  onSave: (patch: { full_name: string | null; phone: string | null; location: string | null; notes: string | null }) => void;
}) {
  const [fullName, setFullName] = useState(customer.full_name ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [location, setLocation] = useState(customer.location ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");

  return (
    <div className="space-y-5 px-4 pb-8">
      <div className="grid gap-3">
        <div>
          <Label htmlFor="c-name">Full name</Label>
          <Input id="c-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="c-phone">Phone</Label>
          <Input id="c-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="c-location">Location</Label>
          <Input id="c-location" value={location} onChange={(event) => setLocation(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="c-notes">Notes</Label>
          <Textarea id="c-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <Button
          onClick={() =>
            onSave({
              full_name: fullName || null,
              phone: phone || null,
              location: location || null,
              notes: notes || null,
            })
          }
        >
          Save customer
        </Button>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">Leads ({leads.length})</p>
        <div className="mt-2 space-y-2">
          {leads.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-xs">
              <span className="truncate text-muted-foreground">{lead.requested_product ?? "Enquiry"}</span>
              <StatusBadge value={lead.status} />
            </div>
          ))}
          {leads.length === 0 ? <p className="text-xs text-muted-foreground">No leads yet.</p> : null}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">Orders ({orders.length})</p>
        <div className="mt-2 space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-xs">
              <span className="text-foreground">{order.order_number}</span>
              <span className="text-muted-foreground">{formatMoney(order.total)}</span>
              <StatusBadge value={order.status} />
            </div>
          ))}
          {orders.length === 0 ? <p className="text-xs text-muted-foreground">No orders yet.</p> : null}
        </div>
      </div>
    </div>
  );
}