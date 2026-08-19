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
        const [telegram, agentMod, { getBotById }, { supabaseAdmin }, perf] = await Promise.all([
          import("@/lib/telegram.server"),
          import("@/lib/agent.server"),
          import("@/lib/bots.server"),
          import("@/integrations/supabase/client.server"),
          import("@/lib/perf.server"),
        ]);
        const timer = perf.createTimer();

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

        // Idempotency: Telegram retries deliveries. Unique update_id rejects duplicates.
        if (typeof update.update_id === "number") {
          const { error } = await supabaseAdmin
            .from("telegram_updates")
            .insert({ business_id: businessId, update_id: update.update_id, payload: update as never });
          if (error) return Response.json({ ok: true, duplicate: true });
        }
        timer.mark("webhook_ack_ms");
        const ackMs = timer.total();

        // Everything below happens AFTER Telegram gets its 200 when the runtime
        // supports waitUntil; otherwise we await it so the reply is never lost.
        const task = perf.runBackground(async () => {
          const work = perf.createTimer();
          try {
            const from = message.from!;
            const customer = await agentMod.getOrCreateCustomer({
              businessId,
              telegramUserId: String(from.id),
              telegramUsername: from.username ?? null,
              fullName: [from.first_name, from.last_name].filter(Boolean).join(" ") || null,
            });
            work.mark("customer_lookup_ms");

            const conversation = await agentMod.getOrCreateConversation(
              businessId,
              customer.id,
              String(message.chat.id),
            );
            work.mark("conversation_lookup_ms");

            // Persist the inbound message (needed for correctness) while reading agent gates.
            const [, settingsRes, currentRes] = await Promise.all([
              agentMod.saveMessage({
                businessId,
                conversationId: conversation.id,
                role: "customer",
                content: text,
                telegramMessageId: message.message_id,
              }),
              agentMod.getSettings(businessId),
              supabaseAdmin
                .from("conversations")
                .select("mode")
                .eq("id", conversation.id)
                .maybeSingle(),
            ]);
            work.mark("context_load_ms");

            supabaseAdmin
              .from("conversations")
              .update({ unread_count: (conversation.unread_count ?? 0) + 1 })
              .eq("id", conversation.id)
              .then(undefined, (e: unknown) => console.error("[unread]", e));

            // A conversation taken over by a human, or a disabled agent, is not answered by AI.
            if (settingsRes.ai?.enabled === false || currentRes.data?.mode === "human") {
              return;
            }

            const result = await agentMod.runSalesAgent({
              businessId,
              customerId: customer.id,
              conversationId: conversation.id,
              latestText: text,
            });

            if (result.error) {
              await telegram.sendTelegramMessage(
                token,
                message.chat.id,
                "Bir ozdan keyin yana urinib ko'ring yoki operator bilan bog'lanishingiz mumkin.",
              );
              perf.runBackground(
                () =>
                  agentMod.saveMessage({
                    businessId,
                    conversationId: conversation.id,
                    role: "system",
                    content: `AI error: ${result.error}`,
                  }),
                "ai-error-log",
              );
              console.error("[telegram-latency]", {
                ...work.result(),
                webhook_ack_ms: ackMs,
                ai_error: result.error,
              });
              return;
            }

            // Send to the customer first; persistence happens right after.
            const sendStart = Date.now();
            const sent = await telegram.sendTelegramMessage(token, message.chat.id, result.reply);
            work.set("telegram_send_ms", Date.now() - sendStart);

            const timings = {
              webhook_ack_ms: ackMs,
              ...work.result(),
              ...(result.timings ?? {}),
            };
            console.error("[telegram-latency]", timings);

            perf.runBackground(
              () =>
                agentMod.saveMessage({
                  businessId,
                  conversationId: conversation.id,
                  role: "ai",
                  content: result.reply,
                  telegramMessageId: sent.message_id,
                  metadata: { escalated: result.escalated, lead_id: result.leadId, timings },
                }),
              "save-ai-message",
            );
          } catch (error) {
            console.error("[telegram-webhook]", error);
            await supabaseAdmin
              .from("telegram_bots")
              .update({ last_error: error instanceof Error ? error.message : "webhook failure" })
              .eq("id", bot.id);
            try {
              await telegram.sendTelegramMessage(
                token,
                message.chat.id,
                "Bir ozdan keyin yana urinib ko'ring yoki operator bilan bog'lanishingiz mumkin.",
              );
            } catch (sendError) {
              console.error("[telegram-webhook] fallback send failed", sendError);
            }
          }
        }, "telegram-message");

        if (!perf.hasWaitUntil()) {
          await task;
        }

        return Response.json({ ok: true, ack_ms: ackMs });
      },
    },
  },
});
