import { createFileRoute } from "@tanstack/react-router";

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: { id: number; type: string };
  from?: { id: number; username?: string; first_name?: string; last_name?: string };
};

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

export const Route = createFileRoute("/api/public/telegram/webhook/$botId/$secret")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const [telegram, agent, { getBotById }, { supabaseAdmin }] = await Promise.all([
          import("@/lib/telegram.server"),
          import("@/lib/agent.server"),
          import("@/lib/bots.server"),
          import("@/integrations/supabase/client.server"),
        ]);

        const bot = await getBotById(params.botId);
        if (!bot) return new Response("Not found", { status: 404 });
        if (!bot.is_active) return new Response("Bot is disconnected", { status: 403 });

        // Path secret + Telegram header secret must both match this bot.
        if (!telegram.safeEqual(params.secret, bot.webhook_secret)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const header = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
        if (!telegram.safeEqual(header, telegram.webhookHeaderSecret(bot.webhook_secret))) {
          return new Response("Unauthorized", { status: 401 });
        }

        let token: string;
        try {
          token = telegram.decryptBotToken(bot.bot_token_encrypted);
        } catch (error) {
          console.error("[telegram-webhook] token decrypt failed", error);
          return Response.json({ ok: false, error: "token_unreadable" }, { status: 500 });
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

        const businessId = bot.business_id;

        // Idempotency: Telegram retries deliveries.
        if (typeof update.update_id === "number") {
          const { error } = await supabaseAdmin
            .from("telegram_updates")
            .insert({ business_id: businessId, update_id: update.update_id, payload: update as never });
          if (error) return Response.json({ ok: true, duplicate: true });
        }

        try {
          const customer = await agent.getOrCreateCustomer({
            businessId,
            telegramUserId: String(message.from.id),
            telegramUsername: message.from.username ?? null,
            fullName: [message.from.first_name, message.from.last_name].filter(Boolean).join(" ") || null,
          });
          const conversation = await agent.getOrCreateConversation(
            businessId,
            customer.id,
            String(message.chat.id),
          );

          await agent.saveMessage({
            businessId,
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
            .eq("business_id", businessId)
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
            businessId,
            customerId: customer.id,
            conversationId: conversation.id,
          });

          if (result.error) {
            await agent.saveMessage({
              businessId,
              conversationId: conversation.id,
              role: "system",
              content: `AI error: ${result.error}`,
            });
            await telegram.sendTelegramMessage(
              token,
              message.chat.id,
              "Kechirasiz, hozir texnik nosozlik. Operatorimiz tez orada siz bilan bog'lanadi.",
            );
            return Response.json({ ok: false, error: result.error }, { status: 200 });
          }

          const sent = await telegram.sendTelegramMessage(token, message.chat.id, result.reply);
          await agent.saveMessage({
            businessId,
            conversationId: conversation.id,
            role: "ai",
            content: result.reply,
            telegramMessageId: sent.message_id,
            metadata: { escalated: result.escalated, lead_id: result.leadId },
          });

          return Response.json({ ok: true, escalated: result.escalated });
        } catch (error) {
          console.error("[telegram-webhook]", error);
          await supabaseAdmin
            .from("telegram_bots")
            .update({ last_error: error instanceof Error ? error.message : "webhook failure" })
            .eq("id", bot.id);
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
