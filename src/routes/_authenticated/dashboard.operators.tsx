import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { deleteOperator, listOperators, saveOperator } from "@/lib/orders.functions";
import { formatMoney } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard/operators")({
  head: () => ({
    meta: [
      { title: "Operators — SalesPilot AI" },
      { name: "description", content: "Manage human sales operators and track their conversion performance." },
      { property: "og:title", content: "Operators — SalesPilot AI" },
      { property: "og:description", content: "Operator roster and performance for your AI sales team." },
    ],
  }),
  component: OperatorsPage,
});

function OperatorsPage() {
  const queryClient = useQueryClient();
  const fetchOperators = useServerFn(listOperators);
  const save = useServerFn(saveOperator);
  const remove = useServerFn(deleteOperator);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [phone, setPhone] = useState("");

  const operators = useQuery({ queryKey: ["operators"], queryFn: () => fetchOperators() });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["operators"] });

  const saveMutation = useMutation({
    mutationFn: (input: {
      id?: string;
      full_name: string;
      telegram_username?: string | null;
      telegram_user_id?: string | null;
      phone?: string | null;
      is_active: boolean;
    }) => save({ data: input }),
    onSuccess: () => {
      toast.success("Operator saved");
      setFullName("");
      setUsername("");
      setTelegramId("");
      setPhone("");
      invalidate();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Save failed"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Operator removed");
      invalidate();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Delete failed"),
  });

  return (
    <>
      <PageHeader title="Operators" description="Humans who close what the AI escalates." />

      <form
        className="surface-panel grid gap-3 p-4 sm:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate({
            full_name: fullName,
            telegram_username: username || null,
            telegram_user_id: telegramId || null,
            phone: phone || null,
            is_active: true,
          });
        }}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="op-name">Full name</Label>
          <Input id="op-name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
        </div>
        <div>
          <Label htmlFor="op-username">Telegram @</Label>
          <Input id="op-username" value={username} onChange={(event) => setUsername(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="op-phone">Phone</Label>
          <Input id="op-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
            Add operator
          </Button>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="op-tgid">Telegram user ID (optional)</Label>
          <Input id="op-tgid" value={telegramId} onChange={(event) => setTelegramId(event.target.value)} />
        </div>
      </form>

      {operators.isPending ? (
        <LoadingState />
      ) : operators.error ? (
        <ErrorState error={operators.error} onRetry={() => void operators.refetch()} />
      ) : operators.data.length === 0 ? (
        <EmptyState title="No operators yet" description="Add your sales staff so the AI can hand off hot leads." />
      ) : (
        <div className="surface-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Operator</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Contacted</th>
                <th className="px-4 py-3">Won</th>
                <th className="px-4 py-3">Conversion</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {operators.data.map((operator) => (
                <tr key={operator.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{operator.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {operator.telegram_username ? `@${operator.telegram_username}` : (operator.phone ?? "—")}
                    </p>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{operator.assigned_leads}</td>
                  <td className="px-4 py-3 tabular-nums">{operator.contacted_leads}</td>
                  <td className="px-4 py-3 tabular-nums">{operator.won_leads}</td>
                  <td className="px-4 py-3 tabular-nums">{operator.conversion_rate}%</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(operator.revenue)}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={operator.is_active}
                      onCheckedChange={(checked) =>
                        saveMutation.mutate({
                          id: operator.id,
                          full_name: operator.full_name,
                          telegram_username: operator.telegram_username,
                          telegram_user_id: operator.telegram_user_id,
                          phone: operator.phone,
                          is_active: checked,
                        })
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove operator"
                      onClick={() => removeMutation.mutate(operator.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}