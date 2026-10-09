import { createFileRoute } from "@tanstack/react-router";

// Click SHOP API: /api/public/click/prepare and /api/public/click/complete
export const Route = createFileRoute("/api/public/click/$action")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const form = new URLSearchParams(await request.text());
        const f = (k: string) => form.get(k) ?? "";
        const base = {
          click_trans_id: f("click_trans_id"),
          merchant_trans_id: f("merchant_trans_id"),
        };
        const out = (error: number, error_note: string, extra: object = {}) =>
          Response.json({ ...base, ...extra, error, error_note });

        const secret = process.env["CLICK_SECRET_KEY"];
        const serviceId = process.env["CLICK_SERVICE_ID"];
        if (!secret || f("service_id") !== serviceId) return out(-8, "Error in request from click");

        const { md5, getAdmin, activateInvoice } = await import("@/lib/billing.server");
        const isComplete = params.action === "complete";
        if (!isComplete && params.action !== "prepare") return out(-3, "Action not found");

        const sign = md5(
          f("click_trans_id") + f("service_id") + secret + f("merchant_trans_id") +
            (isComplete ? f("merchant_prepare_id") : "") + f("amount") + f("action") + f("sign_time"),
        );
        if (sign !== f("sign_string")) return out(-1, "SIGN CHECK FAILED!");

        const admin = await getAdmin();
        const { data: inv } = await admin
          .from("billing_invoices")
          .select("*")
          .eq("provider", "click")
          .eq("invoice_no", Number(f("merchant_trans_id")))
          .maybeSingle();
        if (!inv) return out(-5, "User does not exist");
        if (Math.abs(Number(inv.amount) - Number(f("amount"))) > 0.01) return out(-2, "Incorrect parameter amount");
        if (inv.status === "paid") return out(-4, "Already paid");
        if (inv.status === "cancelled") return out(-9, "Transaction cancelled");

        if (!isComplete) {
          await admin.from("billing_invoices").update({ provider_txn_id: f("click_trans_id"), provider_state: 1 }).eq("id", inv.id);
          return out(0, "Success", { merchant_prepare_id: inv.invoice_no });
        }

        if (String(inv.invoice_no) !== f("merchant_prepare_id")) return out(-6, "Transaction does not exist");
        if (Number(f("error")) < 0) {
          await admin.from("billing_invoices").update({ status: "cancelled", provider_state: -1, cancel_time: new Date().toISOString() }).eq("id", inv.id);
          return out(-9, "Transaction cancelled");
        }
        await activateInvoice(admin, inv.id);
        await admin.from("billing_invoices").update({ provider_state: 2 }).eq("id", inv.id);
        return out(0, "Success", { merchant_confirm_id: inv.invoice_no });
      },
    },
  },
});
