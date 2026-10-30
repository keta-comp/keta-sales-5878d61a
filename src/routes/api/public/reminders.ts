import { createFileRoute } from "@tanstack/react-router";

/**
 * Eslatma rejasini ishga tushiradi. Scheduler har 15 daqiqada GET yoki POST
 * qilib, kalitni `x-cron-secret` yoki `Authorization: Bearer` sarlavhasida
 * yuboradi (Vercel Cron, GitHub Actions, tashqi soatlar). Har bir yozuv
 * belgilanganidan keyin takror yuborilmaydi.
 */
export const Route = createFileRoute("/api/public/reminders")({
  server: {
    handlers: {
      GET: run,
      POST: run,
    },
  },
});

async function run({ request }: { request: Request }) {
  const { cronAuthorized } = await import("@/lib/secure-compare.server");
  if (!cronAuthorized(request)) return new Response("Unauthorized", { status: 401 });

  const { runReminderScan } = await import("@/lib/reminders.server");
  const result = await runReminderScan(new Date());
  return Response.json({ ok: !result.error, ...result });
}
