import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Phone, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEAD_STATUS_LABELS } from "@/lib/lead-kanban";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/types";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Customer = {
  id?: string;
  full_name: string | null;
  telegram_username: string | null;
  phone: string | null;
} | null;

/** Clickable stage progress bar for a lead. */
export function LeadStageBar({
  status,
  disabled,
  onChange,
}: {
  status: LeadStatus;
  disabled?: boolean;
  onChange: (next: LeadStatus) => void;
}) {
  const current = LEAD_STATUSES.indexOf(status);
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{t("Bosqich")}</p>
      <div className="flex gap-1" role="group" aria-label={t("Bosqich")}>
        {LEAD_STATUSES.map((value, index) => {
          const active = value === status;
          const passed = status !== "lost" && index < current && value !== "lost";
          return (
            <button
              key={value}
              type="button"
              disabled={disabled || active}
              title={t(LEAD_STATUS_LABELS[value])}
              aria-pressed={active}
              onClick={() => onChange(value)}
              className={cn(
                "h-2 flex-1 rounded-full transition-colors",
                active ? "bg-foreground" : passed ? "bg-foreground/50" : "bg-muted hover:bg-foreground/30",
              )}
            />
          );
        })}
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="size-3" /> {t(LEAD_STATUS_LABELS[status])}
      </p>
    </div>
  );
}

/** Customer contact block with link to the 360° customer profile. */
export function LeadContact({ customer }: { customer: Customer }) {
  if (!customer) return null;
  return (
    <div className="clay-panel space-y-2 p-4 text-sm">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <User className="size-4" /> {customer.full_name ?? t("Telegram mijozi")}
      </div>
      {customer.phone ? (
        <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <Phone className="size-4" /> {customer.phone}
        </a>
      ) : null}
      {customer.telegram_username ? (
        <a
          href={`https://t.me/${customer.telegram_username}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Send className="size-4" /> @{customer.telegram_username}
        </a>
      ) : null}
      {customer.id ? (
        <Button asChild size="sm" variant="outline" className="clay-raised mt-1">
          <Link to="/dashboard/customers/$id" params={{ id: customer.id }}>
            {t("Mijoz profili")}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

/** Editable lead facts (phone, budget, location). */
export function LeadFacts({
  initial,
  disabled,
  onSave,
}: {
  initial: { phone: string; budget: string; location: string };
  disabled?: boolean;
  onSave: (value: { phone: string; budget: string; location: string }) => void;
}) {
  const [value, setValue] = useState(initial);
  const fields = [
    { key: "phone", label: t("Telefon") },
    { key: "budget", label: t("Byudjet") },
    { key: "location", label: t("Manzil") },
  ] as const;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {fields.map((field) => (
          <div key={field.key}>
            <Label htmlFor={`lead-${field.key}`}>{field.label}</Label>
            <Input
              id={`lead-${field.key}`}
              value={value[field.key]}
              onChange={(event) => setValue({ ...value, [field.key]: event.target.value })}
            />
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" className="clay-raised" disabled={disabled} onClick={() => onSave(value)}>
        {t("Saqlash")}
      </Button>
    </div>
  );
}
