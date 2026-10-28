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
          databaseUrl: process.env["NEON_DATABASE_URL"] ? "ok" : "missing",
          authIssuer: process.env["NEON_AUTH_ISSUER"] ? "ok" : "missing",
        };

        let database = "unchecked";
        try {
          const { serviceClient } = await import("@/lib/pg-rest.server");
          const { error } = await serviceClient()
            .from("businesses")
            .select("id", { count: "exact", head: true });
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
