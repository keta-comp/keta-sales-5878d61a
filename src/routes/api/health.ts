import { createFileRoute } from "@tanstack/react-router";

/**
 * Liveness/readiness probe for Railway/Vercel monitoring. Unauthenticated and
 * dependency-safe: missing env vars or a DB outage degrade the response, they
 * never throw.
 */
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const checks: Record<string, string> = {
          supabaseUrl: process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] ? "ok" : "missing",
          supabaseKey: process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"] ? "ok" : "missing",
        };

        let database = "unchecked";
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const { error } = await supabase.from("businesses").select("id", { count: "exact", head: true });
          // RLS-filtered anon reads succeed with zero rows; only real failures carry an error.
          database = error ? `error:${error.code || "unreachable"}` : "ok";
        } catch {
          database = "error:unreachable";
        }
        checks["database"] = database;

        // Informational only: a busy error trail must not flip readiness to degraded.
        let errorsLast24h: number | null = null;
        try {
          const { countRecentErrors } = await import("@/lib/error-events.server");
          errorsLast24h = await countRecentErrors(24);
        } catch {
          errorsLast24h = null;
        }

        const healthy = Object.values(checks).every((value) => value === "ok");
        return Response.json(
          {
            status: healthy ? "ok" : "degraded",
            uptime_s: Math.round(process.uptime()),
            checks,
            errors_last_24h: errorsLast24h,
            time: new Date().toISOString(),
          },
          { status: healthy ? 200 : 503 },
        );
      },
    },
  },
});
