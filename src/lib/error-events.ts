// Browser-safe pieces of the error trail: bucketing and fingerprinting rules that
// the capture helper and the Control Center both need.

/** Repeat failures inside one bucket collapse into a single row. */
export const ERROR_BUCKET_MS = 600_000;

export function errorBucket(now: Date = new Date()): string {
  return new Date(Math.floor(now.getTime() / ERROR_BUCKET_MS) * ERROR_BUCKET_MS).toISOString();
}

/** UUIDs and digit runs become placeholders so /customers/:id is one series, not thousands. */
export function normalizeRoute(route: string): string {
  const path = (route.split("?")[0] ?? "").split("#")[0] ?? "";
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
    .replace(/\d+/g, ":n")
    .slice(0, 300);
}

export function errorFingerprint(input: {
  route: string;
  message: string;
  status?: number | null;
}): string {
  const firstLine = (input.message.split("\n")[0] ?? "").trim().slice(0, 240);
  return `${input.status ?? 0}|${normalizeRoute(input.route)}|${firstLine}`;
}
