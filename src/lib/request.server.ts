import { getRequest } from "@tanstack/react-start/server";

/** Server-side helpers that read the current HTTP request. Both return null when
 *  there is no request context (cron jobs, background scripts) — callers must not
 *  treat null as an error. */

function headers(): Headers | null {
  try {
    return getRequest()?.headers ?? null;
  } catch {
    return null;
  }
}

/** Best-effort client address behind proxies and Cloudflare. */
export function requestIp(): string | null {
  const h = headers();
  if (!h) return null;
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return h.get("cf-connecting-ip") || forwarded || h.get("x-real-ip") || null;
}

/** Origin of the request — used to build callback URLs we hand to third parties. */
export function requestOrigin(): string | null {
  const h = headers();
  if (!h) return null;
  const fromUrl = h.get("referer");
  if (fromUrl) {
    try {
      return new URL(fromUrl).origin;
    } catch {
      /* fall through */
    }
  }
  return h.get("origin");
}
