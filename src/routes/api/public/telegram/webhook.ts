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

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [telegram, agentMod, single, { supabaseAdmin }, perf] = await Promise.all([
          import("@/lib/telegram.server"),
          import("@/lib/agent.server"),
          import("@/lib/single-bot.server"),
          import("@/integrations/supabase/client.server"),
          import("@/lib/perf.server"),
        ]);
        const timer = perf.createTimer();

        let token: string;
        try {
          token = single.singleBotToken();
        } catch (error) {
          console.error("[telegram-webhook] missing token", error);
          return Response.json({ ok: false, error: "bot_not_configured" }, { status: 500 });
        }

        const header = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
        if (!telegram.safeEqual(header, single.singleBotHeaderSecret(token))) {
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
        if (!message || !message.from || !text) return Response.json({ ok: true, ignored: true });

        const businessId = await single.singleBusinessId();

        // Idempotency: Telegram retries deliveries. Unique update_id rejects duplicates.
        if (typeof update.update_id === "number") {
          const { error } = await supabaseAdmin
            .from("telegram_updates")
            .insert({ business_id: businessId, update_id: update.update_id, payload: update as never });
          if (error) return Response.json({ ok: true, duplicate: true });
        }
        timer.mark("webhook_ack_ms");
        const ackMs = timer.total();

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
                .select("mode, last_message_at")
                .eq("id", conversation.id)
                .maybeSingle(),
            ]);
            work.mark("context_load_ms");

            supabaseAdmin
              .from("conversations")
              .update({ unread_count: (conversation.unread_count ?? 0) + 1 })
              .eq("id", conversation.id)
              .then(undefined, (e: unknown) => console.error("[unread]", e));

            if (settingsRes.ai?.enabled === false) return;

            // Human takeover: the AI stays silent while an operator is actually active,
            // and resumes on /start or after 30 idle minutes so it can never stay mute.
            if (currentRes.data?.mode === "human") {
              const { data: lastOperator } = await supabaseAdmin
                .from("messages")
                .select("created_at")
                .eq("conversation_id", conversation.id)
                .eq("role", "operator")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              const lastAt = lastOperator?.created_at ? Date.parse(lastOperator.created_at) : 0;
              const restarted = /^\/start\b/.test(text);
              if (!restarted && Date.now() - lastAt < 30 * 60 * 1000) return;
              await supabaseAdmin.from("conversations").update({ mode: "ai" }).eq("id", conversation.id);
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
              console.error("[telegram-latency]", { ...work.result(), webhook_ack_ms: ackMs, ai_error: result.error });
              return;
            }

            const sendStart = Date.now();
            const sent = await telegram.sendTelegramMessage(token, message.chat.id, result.reply);
            work.set("telegram_send_ms", Date.now() - sendStart);

            const timings = { webhook_ack_ms: ackMs, ...work.result(), ...(result.timings ?? {}) };
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
          await perf.drainBackground();
        }

        return Response.json({ ok: true, ack_ms: ackMs });
      },
    },
  },
});
