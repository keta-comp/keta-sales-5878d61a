import { createFileRoute } from "@tanstack/react-router";

type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string; last_name?: string };
  };
  edited_message?: TelegramUpdate["message"];
};

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ getTelegramToken, telegramWebhookSecret, safeEqual, sendTelegramMessage }, agent, { supabaseAdmin }] =
          await Promise.all([
            import("@/lib/telegram.server"),
            import("@/lib/agent.server"),
            import("@/integrations/supabase/client.server"),
          ]);

        let token: string;
        try {
          token = getTelegramToken();
        } catch {
          console.error("[telegram-webhook] TELEGRAM_BOT_TOKEN missing");
          return Response.json({ ok: false, error: "bot_not_configured" }, { status: 503 });
        }

        const provided = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
        if (!safeEqual(provided, telegramWebhookSecret(token))) {
          return new Response("Unauthorized", { status: 401 });
        }

        let update: TelegramUpdate;
        try {
          update = (await request.json()) as TelegramUpdate;
        } catch {
          return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
        }

        const message = update.message ?? update.edited_message;
        const text = message?.text?.trim();
        if (!message || !message.from || !text) {
          return Response.json({ ok: true, ignored: true });
        }

        // Idempotency: Telegram retries deliveries.
        if (typeof update.update_id === "number") {
          const { error } = await supabaseAdmin
            .from("telegram_updates")
            .insert({ update_id: update.update_id, payload: update as never });
          if (error) return Response.json({ ok: true, duplicate: true });
        }

        try {
          const customer = await agent.getOrCreateCustomer({
            telegramUserId: String(message.from.id),
            telegramUsername: message.from.username ?? null,
            fullName: [message.from.first_name, message.from.last_name].filter(Boolean).join(" ") || null,
          });
          const conversation = await agent.getOrCreateConversation(customer.id, String(message.chat.id));

          await agent.saveMessage({
            conversationId: conversation.id,
            role: "customer",
            content: text,
            telegramMessageId: message.message_id,
          });
          await supabaseAdmin
            .from("conversations")
            .update({ unread_count: (conversation.unread_count ?? 0) + 1 })
            .eq("id", conversation.id);

          const { data: settings } = await supabaseAdmin
            .from("ai_settings")
            .select("enabled")
            .limit(1)
            .maybeSingle();

          // A conversation taken over by a human, or a disabled agent, is not answered by AI.
          const { data: current } = await supabaseAdmin
            .from("conversations")
            .select("mode")
            .eq("id", conversation.id)
            .single();

          if (settings?.enabled === false || current?.mode === "human") {
            return Response.json({ ok: true, mode: current?.mode ?? "ai", ai: false });
          }

          const result = await agent.runSalesAgent({
            customerId: customer.id,
            conversationId: conversation.id,
          });

          if (result.error) {
            await agent.saveMessage({
              conversationId: conversation.id,
              role: "system",
              content: `AI error: ${result.error}`,
            });
            await sendTelegramMessage(
              message.chat.id,
              "Kechirasiz, hozir texnik nosozlik. Operatorimiz tez orada siz bilan bog'lanadi.",
            );
            return Response.json({ ok: false, error: result.error }, { status: 200 });
          }

          const sent = await sendTelegramMessage(message.chat.id, result.reply);
          await agent.saveMessage({
            conversationId: conversation.id,
            role: "ai",
            content: result.reply,
            telegramMessageId: sent.message_id,
            metadata: { escalated: result.escalated, lead_id: result.leadId },
          });

          return Response.json({ ok: true, escalated: result.escalated });
        } catch (error) {
          console.error("[telegram-webhook]", error);
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});