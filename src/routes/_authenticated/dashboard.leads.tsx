import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { getLead, listLeads, updateLead } from "@/lib/crm.functions";
import { listOperators } from "@/lib/orders.functions";
import { notifyLeadOperators } from "@/lib/settings.functions";
import { LEAD_SCORES, LEAD_STATUSES, type LeadScore, type LeadStatus } from "@/lib/types";

type LeadPatch = {
  id: string;
  status?: LeadStatus;
  score?: LeadScore;
  assigned_operator_id?: string | null;
  notes?: string;
};

export const Route = createFileRoute("/_authenticated/dashboard/leads")({
  head: () => ({
    meta: [
      { title: "Leads — SalesPilot AI" },
      { name: "description", content: "Qualify, assign and close AI-generated Telegram sales leads." },
      { property: "og:title", content: "Leads — SalesPilot AI" },
      { property: "og:description", content: "AI-scored Telegram sales leads with operator assignment." },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const queryClient = useQueryClient();
  const fetchLeads = useServerFn(listLeads);
  const fetchLead = useServerFn(getLead);
  const fetchOperators = useServerFn(listOperators);
  const saveLead = useServerFn(updateLead);
  const notify = useServerFn(notifyLeadOperators);

  const [status, setStatus] = useState("all");
  const [score, setScore] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const leads = useQuery({
    queryKey: ["leads", status, score, search],
    queryFn: () => fetchLeads({ data: { status, score, search } }),
  });

  const detail = useQuery({
    queryKey: ["lead", openId],
    queryFn: () => fetchLead({ data: { id: openId! } }),
    enabled: Boolean(openId),
  });

  const operators = useQuery({ queryKey: ["operators"], queryFn: () => fetchOperators() });

  useEffect(() => {
    const channel = supabase
      .channel("leads-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["leads"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: (input: LeadPatch) => saveLead({ data: input }),
    onSuccess: () => {
      toast.success("Lead updated");
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      void queryClient.invalidateQueries({ queryKey: ["lead"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not update lead"),
  });

  const notifyMutation = useMutation({
    mutationFn: (leadId: string) =>
      notify({ data: { leadId, reason: "Manual escalation from CRM" } }),
    onSuccess: () => toast.success("Sent to the operator group"),
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Telegram notification failed"),
  });

  const lead = detail.data?.lead;

  return (
    <>
      <PageHeader title="Leads" description="Every enquiry the AI agent captured, scored and escalated." />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <Label htmlFor="lead-search">Search product</Label>
          <Input
            id="lead-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="iPhone 15, sneakers…"
          />
        </div>
        <div className="w-44">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LEAD_STATUSES.map((value) => (
                <SelectItem key={value} value={value} className="capitalize">
                  {value.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Label>Score</Label>
          <Select value={score} onValueChange={setScore}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {LEAD_SCORES.map((value) => (
                <SelectItem key={value} value={value} className="capitalize">
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {leads.isPending ? (
        <LoadingState />
      ) : leads.error ? (
        <ErrorState error={leads.error} onRetry={() => void leads.refetch()} />
      ) : leads.data.length === 0 ? (
        <EmptyState
          title="No leads match this filter"
          description="Leads appear here automatically when customers message your Telegram bot."
        />
      ) : (
        <div className="surface-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Interest</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Operator</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.data.map((row) => {
                const customer = row.customers as {
                  full_name: string | null;
                  telegram_username: string | null;
                  phone: string | null;
                } | null;
                const operator = row.operators as { full_name: string } | null;
                return (
                  <tr key={row.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">
                        {customer?.full_name ?? "Telegram customer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer?.telegram_username ? `@${customer.telegram_username}` : (customer?.phone ?? "—")}
                      </p>
                    </td>
                    <td className="max-w-64 px-4 py-3 text-muted-foreground">
                      <p className="truncate">{row.requested_product ?? "—"}</p>
                      <p className="truncate text-xs">{row.ai_summary ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={row.score} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={row.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{operator?.full_name ?? "Unassigned"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => setOpenId(row.id)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={Boolean(openId)} onOpenChange={(next) => setOpenId(next ? openId : null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Lead detail</SheetTitle>
          </SheetHeader>
          {detail.isPending ? (
            <LoadingState />
          ) : detail.error ? (
            <ErrorState error={detail.error} />
          ) : lead ? (
            <div className="space-y-5 px-4 pb-8">
              <div className="surface-panel p-3 text-sm">
                <p className="font-medium text-foreground">
                  {(lead.customers as { full_name: string | null } | null)?.full_name ?? "Telegram customer"}
                </p>
                <p className="text-xs text-muted-foreground">{lead.ai_summary ?? "No AI summary yet"}</p>
                {lead.handoff_reason ? (
                  <p className="mt-2 text-xs text-warning">Handoff: {lead.handoff_reason}</p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={lead.status}
                    onValueChange={(value) =>
                      mutation.mutate({ id: lead.id, status: value as LeadStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((value) => (
                        <SelectItem key={value} value={value} className="capitalize">
                          {value.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Score</Label>
                  <Select
                    value={lead.score}
                    onValueChange={(value) =>
                      mutation.mutate({ id: lead.id, score: value as LeadScore })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SCORES.map((value) => (
                        <SelectItem key={value} value={value} className="capitalize">
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Assigned operator</Label>
                  <Select
                    value={lead.assigned_operator_id ?? "none"}
                    onValueChange={(value) =>
                      mutation.mutate({
                        id: lead.id,
                        assigned_operator_id: value === "none" ? null : value,
                        ...(value === "none" ? {} : { status: "assigned" as LeadStatus }),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {(operators.data ?? []).map((operator) => (
                        <SelectItem key={operator.id} value={operator.id}>
                          {operator.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <LeadNotes
                key={lead.id}
                initial={lead.notes ?? ""}
                onSave={(notes) => mutation.mutate({ id: lead.id, notes })}
              />

              <Button
                variant="secondary"
                className="w-full"
                disabled={notifyMutation.isPending}
                onClick={() => notifyMutation.mutate(lead.id)}
              >
                Push to operator group
              </Button>

              <div>
                <p className="text-sm font-medium text-foreground">Timeline</p>
                <div className="mt-2 space-y-2">
                  {(detail.data?.events ?? []).map((event) => (
                    <div key={event.id} className="rounded-lg border border-border p-2.5 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium capitalize text-foreground">
                          {event.event_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      {event.detail ? <p className="mt-1 text-muted-foreground">{event.detail}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function LeadNotes({ initial, onSave }: { initial: string; onSave: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <Label htmlFor="lead-notes">Operator notes</Label>
      <Textarea
        id="lead-notes"
        value={value}
        rows={4}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Agreed on delivery Friday, waiting for payment…"
      />
      <Button size="sm" variant="outline" className="mt-2" onClick={() => onSave(value)}>
        Save notes
      </Button>
    </div>
  );
}