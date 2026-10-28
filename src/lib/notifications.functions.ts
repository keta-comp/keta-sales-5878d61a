import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Announcements written in the Control Center, read here through the caller's own
 *  session. Which rows come back is decided by the database targeting policy
 *  (all / organization / plan / industry), never by a filter written in the browser. */

export interface PlatformAnnouncement {
  id: string;
  title: string;
  body: string;
  kind: string;
  targetKind: string;
  createdAt: string;
  read: boolean;
}

const ANNOUNCEMENT_WINDOW_DAYS = 30;
const ANNOUNCEMENT_LIMIT = 20;

export const getMyAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformAnnouncement[]> => {
    const since = new Date(Date.now() - ANNOUNCEMENT_WINDOW_DAYS * 86_400_000).toISOString();
    const [{ data: rows, error }, reads] = await Promise.all([
      context.supabase
        .from("system_notifications")
        .select("id, title, body, kind, target_kind, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(ANNOUNCEMENT_LIMIT),
      // Read receipts live in their own table; before that migration lands every
      // announcement is honestly reported as unread instead of failing the bell.
      context.supabase.from("notification_reads").select("notification_id"),
    ]);
    if (error) throw new Error(error.message);
    const readIds = new Set((reads.data ?? []).map((r) => r.notification_id));
    return (rows ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      kind: row.kind,
      targetKind: row.target_kind,
      createdAt: row.created_at,
      read: readIds.has(row.id),
    }));
  });

export const markAnnouncementRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notification_reads")
      .upsert({ user_id: context.userId, notification_id: data.id }, { onConflict: "user_id,notification_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Why the workspace refuses data access right now (maintenance mode / blocked account). */
export const getPlatformNotice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { platformNotice } = await import("./tenant.server");
    return platformNotice(context.supabase);
  });
