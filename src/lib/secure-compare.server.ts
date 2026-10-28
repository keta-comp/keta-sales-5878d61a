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
