import { createFileRoute } from "@tanstack/react-router";

/**
 * Eslatma rejasini ishga tushiradi. Scheduler (masalan Vercel Cron) har 15 daqiqada
 * `x-cron-secret` sarlavhasi bilan POST qiladi — daily-report nuqtasi bilan bir xil
 * shart. Har bir yozuv belgilanganidan keyin takror yuborilmaydi.
 */
export const Route = createFileRoute("/api/public/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { matchesSecret } = await import("@/lib/secure-compare.server");
        const secret = process.env["LOVABLE_CRON_SECRET"];
        const provided = request.headers.get("x-cron-secret") ?? "";
        if (!matchesSecret(provided, secret)) return new Response("Unauthorized", { status: 401 });

        const { runReminderScan } = await import("@/lib/reminders.server");
        const result = await runReminderScan(new Date());
        return Response.json({ ok: !result.error, ...result });
      },
    },
  },
});
