import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listProducts } from "@/lib/catalog.functions";
import { updateLead } from "@/lib/crm.functions";
import { createOrder } from "@/lib/orders.functions";
import { formatMoney } from "@/lib/types";
import { t } from "@/lib/i18n";

/** One-click conversion of a lead into a real order (customer, phone, address prefilled). */
export function LeadToOrder({
  lead,
}: {
  lead: { id: string; customer_id: string | null; product_id: string | null; phone: string | null; location: string | null };
}) {
  const queryClient = useQueryClient();
  const fetchProducts = useServerFn(listProducts);
  const makeOrder = useServerFn(createOrder);
  const saveLead = useServerFn(updateLead);
  const [productId, setProductId] = useState(lead.product_id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [created, setCreated] = useState<string | null>(null);

  const products = useQuery({ queryKey: ["products", "lead-order"], queryFn: () => fetchProducts({ data: {} }) });
  const product = (products.data ?? []).find((p) => p.id === productId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!lead.customer_id) throw new Error(t("Lidda mijoz yo'q"));
      const order = await makeOrder({
        data: {
          customer_id: lead.customer_id,
          phone: lead.phone ?? undefined,
          delivery_address: lead.location ?? undefined,
          items: [{ product_id: productId, quantity }],
        },
      });
      await saveLead({ data: { id: lead.id, status: "won" } });
      return order;
    },
    onSuccess: (order) => {
      setCreated(order.order_number);
      toast.success(t("Buyurtma yaratildi"));
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      void queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : t("Yangilash amalga oshmadi")),
  });

  return (
    <div className="clay-panel space-y-3 p-4 text-sm">
      <p className="flex items-center gap-2 font-medium text-foreground">
        <ShoppingCart className="size-4" /> {t("Buyurtmaga aylantirish")}
      </p>
      {created ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">{t("Buyurtma yaratildi")}: {created}</span>
          <Button asChild size="sm" variant="outline" className="clay-raised">
            <Link to="/dashboard/orders">{t("Buyurtmalar")}</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
            <div>
              <Label>{t("Mahsulot")}</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Mahsulotni tanlang")} />
                </SelectTrigger>
                <SelectContent>
                  {(products.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {formatMoney(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lead-order-qty">{t("Soni")}</Label>
              <Input
                id="lead-order-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>
          {product ? (
            <p className="text-muted-foreground">
              {t("Jami")}: <span className="font-medium text-foreground">{formatMoney(Number(product.price) * quantity)}</span>
            </p>
          ) : null}
          <Button
            size="sm"
            className="clay-raised"
            disabled={!productId || !lead.customer_id || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t("Buyurtma yaratish")}
          </Button>
        </>
      )}
    </div>
  );
}
