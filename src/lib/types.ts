export type LeadStatus =
  | "new"
  | "needs_operator"
  | "assigned"
  | "contacted"
  | "negotiating"
  | "won"
  | "lost";
export type LeadScore = "hot" | "warm" | "cold";
export type OrderStatus =
  | "new"
  | "confirming"
  | "confirmed"
  | "preparing"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "needs_operator",
  "assigned",
  "contacted",
  "negotiating",
  "won",
  "lost",
];
export const LEAD_SCORES: LeadScore[] = ["hot", "warm", "cold"];
export const ORDER_STATUSES: OrderStatus[] = [
  "new",
  "confirming",
  "confirmed",
  "preparing",
  "delivered",
  "cancelled",
];
export const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "partial", "paid", "refunded"];

export function formatMoney(value: number | string | null | undefined, currency = "UZS") {
  const n = Number(value ?? 0);
  return `${new Intl.NumberFormat("en-US").format(Math.round(n))} ${currency}`;
}

export function stockState(stock: number, reserved: number, threshold: number) {
  const free = stock - reserved;
  if (free <= 0) return "out_of_stock" as const;
  if (free <= threshold) return "low_stock" as const;
  return "in_stock" as const;
}