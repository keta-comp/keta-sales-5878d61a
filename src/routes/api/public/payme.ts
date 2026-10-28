import { createFileRoute } from "@tanstack/react-router";

// Payme Merchant API (JSON-RPC). Amounts are in tiyin.
const msg = (uz: string) => ({ uz, ru: uz, en: uz });

export const Route = createFileRoute("/api/public/payme")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { id?: number; method?: string; params?: { id?: string; time?: number; amount?: number; reason?: number; from?: number; to?: number; account?: { invoice_id?: string } } } = {};
        const reply = (payload: object) => Response.json({ id: body.id ?? null, ...payload });
        const fail = (code: number, text: string, data?: string) =>
          reply({ error: { code, message: msg(text), data } });
        try {
          body = await request.json();
        } catch {
          return fail(-32700, "Parse error");
        }

        const key = process.env["PAYME_KEY"];
        const auth = request.headers.get("authorization") ?? "";
        const { matchesSecret } = await import("@/lib/secure-compare.server");
        if (!key || !matchesSecret(auth, `Basic ${btoa(`Paycom:${key}`)}`)) return fail(-32504, "Ruxsat yo'q");

        const { getAdmin, activateInvoice } = await import("@/lib/billing.server");
        const admin = await getAdmin();
        const p = body.params ?? {};

        const findInvoice = async () => {
          const no = Number(p.account?.invoice_id);
          if (!Number.isFinite(no)) return null;
          const { data } = await admin.from("billing_invoices").select("*").eq("invoice_no", no).eq("provider", "payme").maybeSingle();
          return data;
        };
        const findTxn = async () => {
          const { data } = await admin.from("billing_invoices").select("*").eq("provider", "payme").eq("provider_txn_id", String(p.id)).maybeSingle();
          return data;
        };
        const ms = (t: string | null) => (t ? new Date(t).getTime() : 0);

        switch (body.method) {
          case "CheckPerformTransaction": {
            const inv = await findInvoice();
            if (!inv || inv.status !== "pending") return fail(-31050, "Hisob topilmadi", "invoice_id");
            if (Number(inv.amount) * 100 !== Number(p.amount)) return fail(-31001, "Noto'g'ri summa");
            return reply({ result: { allow: true } });
          }
          case "CreateTransaction": {
            const existing = await findTxn();
            if (existing) {
              if (existing.provider_state !== 1) return fail(-31008, "Amalni bajarib bo'lmaydi");
              return reply({ result: { create_time: Number(existing.provider_time), transaction: existing.id, state: 1 } });
            }
            const inv = await findInvoice();
            if (!inv || inv.status !== "pending") return fail(-31050, "Hisob topilmadi", "invoice_id");
            if (Number(inv.amount) * 100 !== Number(p.amount)) return fail(-31001, "Noto'g'ri summa");
            if (inv.provider_txn_id && inv.provider_state === 1) return fail(-31050, "Hisob band", "invoice_id");
            await admin
              .from("billing_invoices")
              .update({ provider_txn_id: String(p.id), provider_state: 1, provider_time: Number(p.time) })
              .eq("id", inv.id);
            return reply({ result: { create_time: Number(p.time), transaction: inv.id, state: 1 } });
          }
          case "PerformTransaction": {
            const inv = await findTxn();
            if (!inv) return fail(-31003, "Tranzaksiya topilmadi");
            if (inv.provider_state === 1) {
              await activateInvoice(admin, inv.id);
              await admin.from("billing_invoices").update({ provider_state: 2 }).eq("id", inv.id);
              const { data: fresh } = await admin.from("billing_invoices").select("perform_time").eq("id", inv.id).single();
              return reply({ result: { transaction: inv.id, perform_time: ms(fresh?.perform_time ?? null), state: 2 } });
            }
            if (inv.provider_state === 2) return reply({ result: { transaction: inv.id, perform_time: ms(inv.perform_time), state: 2 } });
            return fail(-31008, "Amalni bajarib bo'lmaydi");
          }
          case "CancelTransaction": {
            const inv = await findTxn();
            if (!inv) return fail(-31003, "Tranzaksiya topilmadi");
            if (inv.provider_state === 1 || inv.provider_state === 2) {
              const state = inv.provider_state === 1 ? -1 : -2;
              const cancel_time = new Date().toISOString();
              await admin
                .from("billing_invoices")
                .update({ provider_state: state, status: state === -1 ? "cancelled" : "refunded", cancel_time, cancel_reason: Number(p.reason) })
                .eq("id", inv.id);
              return reply({ result: { transaction: inv.id, cancel_time: ms(cancel_time), state } });
            }
            return reply({ result: { transaction: inv.id, cancel_time: ms(inv.cancel_time), state: inv.provider_state } });
          }
          case "CheckTransaction": {
            const inv = await findTxn();
            if (!inv) return fail(-31003, "Tranzaksiya topilmadi");
            return reply({
              result: {
                create_time: Number(inv.provider_time),
                perform_time: ms(inv.perform_time),
                cancel_time: ms(inv.cancel_time),
                transaction: inv.id,
                state: inv.provider_state,
                reason: inv.cancel_reason ?? null,
              },
            });
          }
          case "GetStatement": {
            const { data } = await admin
              .from("billing_invoices")
              .select("*")
              .eq("provider", "payme")
              .gte("provider_time", Number(p.from))
              .lte("provider_time", Number(p.to));
            return reply({
              result: {
                transactions: (data ?? []).map((inv) => ({
                  id: inv.provider_txn_id,
                  time: Number(inv.provider_time),
                  amount: Number(inv.amount) * 100,
                  account: { invoice_id: String(inv.invoice_no) },
                  create_time: Number(inv.provider_time),
                  perform_time: ms(inv.perform_time),
                  cancel_time: ms(inv.cancel_time),
                  transaction: inv.id,
                  state: inv.provider_state,
                  reason: inv.cancel_reason ?? null,
                })),
              },
            });
          }
          default:
            return fail(-32601, "Metod topilmadi");
        }
      },
    },
  },
});
