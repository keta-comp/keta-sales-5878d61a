/**
 * Timing-safe comparison for webhook/cron secrets. Fail-closed: a missing
 * expected secret denies, so an unconfigured environment can never be bypassed
 * by sending an empty header.
 */
export function matchesSecret(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!expected || !provided || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/**
 * Cron chaqiruvini tekshiradi. Platform schedulerlari (Vercel Cron, GitHub
 * Actions, tashqi soatlar) ko'pincha GET va `Authorization: Bearer` yuboradi,
 * shuning uchun ikkala usul ham qabul qilinadi; kalit bo'lmasa fail-closed.
 * Vercel so'rovni `CRON_SECRET` bilan imzolaydi: LOVABLE_CRON_SECRET o'rni bo'lsa
 * u asosiy, bo'lmasa CRON_SECRET ishlatiladi (Vercel'da faqat shu bittasini
 * to'ldirish kifoya).
 */
export function cronAuthorized(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "POST") return false;
  const custom = request.headers.get("x-cron-secret") ?? "";
  const bearer = request.headers.get("authorization") ?? "";
  const provided = custom || (bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : "");
  return matchesSecret(provided, process.env["LOVABLE_CRON_SECRET"] || process.env["CRON_SECRET"]);
}
