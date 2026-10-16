import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveAiRuntime } from "./ai-gateway.server";
import {
  applyRelations,
  presetForIndustry,
  type CrmConfigData,
  type CrmField,
  type CrmModule,
  type CrmModuleLink,
  type CrmWidget,
} from "./crm-config";
import { invalidateCrmAgentContext } from "./crm-config.server";
import { requireBusinessId } from "./tenant.server";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function normalizeField(raw: unknown): CrmField | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r["key"] !== "string" || !r["key"].trim()) return null;
  const types = ["text", "phone", "number", "money", "date", "select", "textarea", "relation"] as const;
  const type = types.includes(r["type"] as (typeof types)[number]) ? (r["type"] as CrmField["type"]) : "text";
  return {
    key: r["key"].trim(),
    label: typeof r["label"] === "string" && r["label"].trim() ? r["label"] : r["key"],
    type,
    required: r["required"] === true,
    ...(Array.isArray(r["options"])
      ? { options: r["options"].filter((o) => typeof o === "string") as string[] }
      : {}),
    ...(typeof r["targetModule"] === "string" && r["targetModule"] ? { targetModule: r["targetModule"] } : {}),
  };
}

function normalizeModule(raw: unknown): CrmModule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r["key"] !== "string" || !r["key"].trim()) return null;
  const module: CrmModule = {
    key: r["key"].trim(),
    label: typeof r["label"] === "string" && r["label"].trim() ? r["label"] : r["key"],
  };
  if (typeof r["icon"] === "string") module.icon = r["icon"];
  if (typeof r["link"] === "string" && r["link"].startsWith("/dashboard")) module.link = r["link"] as CrmModuleLink;
  if (r["pipeline"] === true) module.pipeline = true;
  if (Array.isArray(r["fields"])) {
    const fields = r["fields"].map(normalizeField).filter((f): f is CrmField => f !== null);
    if (fields.length) module.fields = fields;
  }
  return module;
}

function normalizeWidget(raw: unknown, fallbackKey: string): CrmWidget | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const kinds = [
    "module_count",
    "module_count_today",
    "field_sum",
    "legacy_today_revenue",
    "legacy_today_orders",
    "legacy_today_leads",
    "legacy_hot_leads",
    "legacy_handoffs",
  ] as const;
  if (typeof r["kind"] !== "string" || !kinds.includes(r["kind"] as (typeof kinds)[number])) return null;
  const widget: CrmWidget = {
    key: typeof r["key"] === "string" && r["key"].trim() ? r["key"] : fallbackKey,
    label: typeof r["label"] === "string" && r["label"].trim() ? r["label"] : fallbackKey,
    kind: r["kind"] as CrmWidget["kind"],
  };
  if (typeof r["moduleKey"] === "string") widget.moduleKey = r["moduleKey"];
  if (typeof r["fieldKey"] === "string") widget.fieldKey = r["fieldKey"];
  if (r["where"] && typeof r["where"] === "object") {
    const w = r["where"] as Record<string, unknown>;
    if (typeof w["field"] === "string" && typeof w["value"] === "string") {
      widget.where = { field: w["field"], value: w["value"] };
    }
  }
  return widget;
}

/** Merges AI output over the industry preset — invalid shapes fall back to preset values. */
export function normalizeConfig(raw: unknown, preset: CrmConfigData): CrmConfigData {
  if (!raw || typeof raw !== "object") return preset;
  const r = raw as Record<string, unknown>;

  const modules = Array.isArray(r["modules"])
    ? (r["modules"].map(normalizeModule).filter((m): m is CrmModule => m !== null))
    : [];
  const pipelineStages = Array.isArray(r["pipelineStages"])
    ? r["pipelineStages"].filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];
  const widgets = Array.isArray(r["dashboardWidgets"])
    ? (r["dashboardWidgets"]
        .map((w, i) => normalizeWidget(w, `widget_${i + 1}`))
        .filter((w): w is CrmWidget => w !== null))
    : [];
  const automations = Array.isArray(r["automations"])
    ? r["automations"].filter((a): a is string => typeof a === "string")
    : [];

  return {
    modules: modules.length ? modules : preset.modules,
    pipelineStages: pipelineStages.length ? pipelineStages : preset.pipelineStages,
    terminology:
      r["terminology"] && typeof r["terminology"] === "object"
        ? (Object.fromEntries(
            Object.entries(r["terminology"] as Record<string, unknown>).filter(
              ([, v]) => typeof v === "string",
            ),
          ) as Record<string, string>)
        : preset.terminology,
    dashboardWidgets: widgets.length ? widgets : preset.dashboardWidgets,
    automations: automations.length ? automations : preset.automations,
  };
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? (fenced[1] ?? text) : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI javobida JSON topilmadi");
  return JSON.parse(candidate.slice(start, end + 1));
}

/* ------------------------------------------------------------------ */
/* Server functions                                                    */
/* ------------------------------------------------------------------ */

export const getMyCrmConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const [{ data: row }, { data: business }] = await Promise.all([
      context.supabase
        .from("crm_configs")
        .select("industry, business_description, config")
        .eq("business_id", businessId)
        .maybeSingle(),
      context.supabase.from("businesses").select("name").eq("id", businessId).maybeSingle(),
    ]);
    return {
      hasConfig: !!row,
      businessId,
      businessName: business?.name ?? null,
      industry: row?.industry ?? null,
      businessDescription: row?.business_description ?? null,
      config: row ? applyRelations(row.industry, row.config as unknown as CrmConfigData) : null,
    };
  });

/** Relation search inside the caller's own business (RLS + explicit business filter). */
export const searchRelatedRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ targetModule: z.string().min(1), search: z.string().max(100).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const term = (data.search ?? "").replace(/[%,()]/g, " ").trim();
    if (data.targetModule === "customers") {
      let q = context.supabase
        .from("customers")
        .select("id, full_name, phone, telegram_username")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (term) q = q.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,telegram_username.ilike.%${term}%`);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      return (rows ?? []).map((r) => ({
        id: r.id,
        label: r.full_name || r.telegram_username || r.phone || "—",
        hint: r.phone ?? null,
      }));
    }
    let q = context.supabase
      .from("crm_records")
      .select("id, title")
      .eq("business_id", businessId)
      .eq("module_key", data.targetModule)
      .order("created_at", { ascending: false })
      .limit(20);
    if (term) q = q.ilike("title", `%${term}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ id: r.id, label: r.title, hint: null as string | null }));
  });

/** Dynamic-module records linked to a customer (via any relation field). */
export const listCustomerLinkedRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ customerId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const { data: cfgRow } = await context.supabase
      .from("crm_configs")
      .select("industry, config")
      .eq("business_id", businessId)
      .maybeSingle();
    if (!cfgRow) return [];
    const cfg = applyRelations(cfgRow.industry, cfgRow.config as unknown as CrmConfigData);
    const filters: { moduleKey: string; moduleLabel: string; idKey: string }[] = [];
    for (const m of cfg.modules) {
      if (m.link) continue;
      for (const f of m.fields ?? []) {
        if (f.type === "relation" && f.targetModule === "customers") {
          filters.push({ moduleKey: m.key, moduleLabel: m.label, idKey: `${f.key}_id` });
        }
      }
    }
    if (filters.length === 0) return [];
    const results = await Promise.all(
      filters.map(async (f) => {
        const { data: rows } = await context.supabase
          .from("crm_records")
          .select("id, title, stage, created_at, data")
          .eq("business_id", businessId)
          .eq("module_key", f.moduleKey)
          .contains("data", { [f.idKey]: data.customerId } as never)
          .order("created_at", { ascending: false })
          .limit(50);
        return (rows ?? []).map((r) => ({
          id: r.id,
          title: r.title,
          stage: r.stage,
          created_at: r.created_at,
          moduleKey: f.moduleKey,
          moduleLabel: f.moduleLabel,
        }));
      }),
    );
    const seen = new Set<string>();
    return results
      .flat()
      .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  });

const generateInput = z.object({
  industryKey: z.string().min(1),
  industryOther: z.string().optional(),
  businessDescription: z.string().min(1),
  businessName: z.string().optional(),
});

export const generateCrmConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => generateInput.parse(input))
  .handler(async ({ data, context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const preset = presetForIndustry(data.industryKey);
    const industryLabel =
      data.industryKey === "boshqa"
        ? (data.industryOther?.trim() || "Boshqa soha")
        : data.industryKey;

    let config = preset;
    let aiError: string | null = null;
    try {
      const runtime = resolveAiRuntime();
      if ("error" in runtime) throw new Error(runtime.error);
      const prompt = [
        "Siz CRM konfiguratsiya dizaynerisiz. Foydalanuvchi biznesini tavsifladi.",
        `Soha: ${industryLabel}`,
        `Biznes tavsifi: ${data.businessDescription}`,
        "",
        "Quyidagi boshlang'ich konfiguratsiyani ushbu biznesga moslab, FAQAT JSON qaytaring.",
        "Qoidalar:",
        "- modules: har bir obyektda key (lotin-harflar, chiziqcha), label (o'zbekcha), ixtiyoriy icon, link (faqat mavjud sahifalar uchun: /dashboard/leads, /dashboard/customers, /dashboard/conversations, /dashboard/orders, /dashboard/inventory, /dashboard/products), pipeline (true — pipeline bosqichlari qo'llaniladigan modul), fields (universal modullar uchun maydonlar: key, label, type: text|phone|number|money|date|select|textarea, ixtiyoriy required, select uchun options).",
        "- pipelineStages: savdo/qiziqish oqimi bosqichlari nomlari o'zbekcha.",
        "- terminology: customer/lead/order uchun ushbu biznesdagi atamalar.",
        "- dashboardWidgets: widgetlar (key, label, kind: module_count|module_count_today|field_sum|legacy_today_revenue|legacy_today_orders|legacy_today_leads|legacy_hot_leads|legacy_handoffs, universal widgetlar uchun moduleKey, field_sum uchun fieldKey, ixtiyoriy where: {field, value}).",
        "- 5-8 ta widget yetarli. 6-10 ta modul yetarli.",
        "Boshlang'ich konfiguratsiya:",
        JSON.stringify(preset),
      ].join("\n");
      const result = await generateText({
        model: runtime.model(runtime.defaultModel),
        prompt,
        maxOutputTokens: 3000,
      });
      config = normalizeConfig(extractJson(result.text), preset);
    } catch (error) {
      // AI unavailable → the industry preset is already a complete, working CRM.
      aiError = error instanceof Error ? error.message : "AI sozlash xatosi";
    }

    const upsert = {
      business_id: businessId,
      industry: industryLabel,
      business_description: data.businessDescription,
      config: config as never,
    };
    const { error } = await context.supabase
      .from("crm_configs")
      .upsert(upsert, { onConflict: "business_id" });
    if (error) throw new Error(error.message);

    if (data.businessName?.trim()) {
      const name = data.businessName.trim();
      await context.supabase.from("businesses").update({ name }).eq("id", businessId);
      await context.supabase
        .from("business_settings")
        .update({ business_name: name })
        .eq("business_id", businessId);
    }

    invalidateCrmAgentContext(businessId);
    return { config, aiError };
  });

export const updateCrmConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ config: z.unknown() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const { data: row } = await context.supabase
      .from("crm_configs")
      .select("industry, config")
      .eq("business_id", businessId)
      .maybeSingle();
    if (!row) throw new Error("CRM konfiguratsiyasi topilmadi");
    const normalized = normalizeConfig(data.config, row.config as unknown as CrmConfigData);
    const { error } = await context.supabase
      .from("crm_configs")
      .update({ config: normalized as never })
      .eq("business_id", businessId);
    if (error) throw new Error(error.message);
    invalidateCrmAgentContext(businessId);
    return { config: normalized };
  });

const builderInput = z.object({ message: z.string().min(1) });

export const aiCrmBuilder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => builderInput.parse(input))
  .handler(async ({ data, context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const { data: row } = await context.supabase
      .from("crm_configs")
      .select("industry, config")
      .eq("business_id", businessId)
      .maybeSingle();
    if (!row) throw new Error("Avval CRMni sozlang");

    const current = row.config as unknown as CrmConfigData;
    const runtime = resolveAiRuntime();
    if ("error" in runtime) throw new Error(runtime.error);

    const prompt = [
      "Siz CRM konfiguratsiya muharririsiz. Foydalanuvchi oddiy o'zbek tilida CRMni o'zgartirishni so'raydi.",
      `Soha: ${row.industry}`,
      "Joriy konfiguratsiya:",
      JSON.stringify(current),
      "",
      "Buyruqni bajaring va FAQAT JSON qaytaring:",
      "'{ \"reply\": \"nima qilinganini bitta-gapda o`zbekcha tushuntiring\", \"config\": { yangilangan to`liq konfiguratsiya } }'",
      "Konfiguratsiya strukturasi joriy bilan bir xil: modules (key, label, icon, link, pipeline, fields), pipelineStages, terminology, dashboardWidgets (key, label, kind: module_count|module_count_today|field_sum|legacy_today_revenue|legacy_today_orders|legacy_today_leads|legacy_hot_leads|legacy_handoffs, moduleKey, fieldKey, where), automations.",
      "Faqat so'ralgan o'zgarishni qiling, qolganini o'zgartirmang.",
    ].join("\n");

    const result = await generateText({
      model: runtime.model(runtime.defaultModel),
      prompt,
      maxOutputTokens: 3000,
    });
    const parsed = extractJson(result.text) as { reply?: unknown; config?: unknown };
    const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply : "CRM yangilandi.";
    const config = normalizeConfig(parsed.config, current);

    const { error } = await context.supabase
      .from("crm_configs")
      .update({ config: config as never })
      .eq("business_id", businessId);
    if (error) throw new Error(error.message);
    invalidateCrmAgentContext(businessId);
    return { reply, config };
  });

/* ------------------------- crm_records CRUD ------------------------ */

export const listCrmRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ moduleKey: z.string().min(1), search: z.string().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("crm_records")
      .select("*")
      .eq("module_key", data.moduleKey)
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.search) query = query.ilike("title", `%${data.search}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows;
  });

const recordInput = z.object({
  id: z.string().optional(),
  moduleKey: z.string().min(1),
  title: z.string().min(1),
  stage: z.string().nullable().optional(),
  data: z.record(z.string(), z.unknown()),
});

export const saveCrmRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => recordInput.parse(input))
  .handler(async ({ data, context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const payload = {
      business_id: businessId,
      module_key: data.moduleKey,
      title: data.title,
      stage: data.stage ?? null,
      data: data.data as never,
    };
    if (data.id) {
      const { error } = await context.supabase.from("crm_records").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("crm_records")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteCrmRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("crm_records").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getWidgetStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const businessId = await requireBusinessId(context.supabase);
    const { data: row } = await context.supabase
      .from("crm_configs")
      .select("config")
      .eq("business_id", businessId)
      .maybeSingle();
    if (!row) return { widgets: {} as Record<string, number> };

    const cfg = row.config as unknown as CrmConfigData;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const stats: Record<string, number> = {};
    const sb = context.supabase;

    await Promise.all(
      cfg.dashboardWidgets.map(async (widget) => {
        try {
          if (
            widget.kind === "module_count" ||
            widget.kind === "module_count_today" ||
            widget.kind === "field_sum"
          ) {
            if (!widget.moduleKey) return;
            let query = sb.from("crm_records").select(widget.kind === "field_sum" ? "data" : "id");
            if (widget.kind === "field_sum") query = query.limit(1000);
            query = query.eq("module_key", widget.moduleKey);
            if (widget.where) query = query.eq(`data->>${widget.where.field}`, widget.where.value);
            if (widget.kind === "module_count_today") query = query.gte("created_at", todayStart.toISOString());
            const { data: rows, error } = await query;
            if (error) return;
            if (widget.kind === "field_sum") {
              const sum = (rows as { data: Record<string, unknown> }[]).reduce((acc, r) => {
                const v = Number(r.data?.[widget.fieldKey ?? ""]);
                return Number.isFinite(v) ? acc + v : acc;
              }, 0);
              stats[widget.key] = Math.round(sum * 100) / 100;
            } else {
              stats[widget.key] = rows?.length ?? 0;
            }
            return;
          }
          if (widget.kind === "legacy_today_revenue") {
            const { data: rows } = await sb
              .from("orders")
              .select("total")
              .gte("created_at", todayStart.toISOString())
              .neq("status", "cancelled");
            stats[widget.key] = (rows ?? []).reduce((acc, o) => acc + Number(o.total), 0);
            return;
          }
          if (widget.kind === "legacy_today_orders") {
            const { count } = await sb
              .from("orders")
              .select("id", { count: "exact", head: true })
              .gte("created_at", todayStart.toISOString());
            stats[widget.key] = count ?? 0;
            return;
          }
          if (widget.kind === "legacy_today_leads") {
            const { count } = await sb
              .from("leads")
              .select("id", { count: "exact", head: true })
              .gte("created_at", todayStart.toISOString());
            stats[widget.key] = count ?? 0;
            return;
          }
          if (widget.kind === "legacy_hot_leads") {
            const { count } = await sb
              .from("leads")
              .select("id", { count: "exact", head: true })
              .eq("score", "hot");
            stats[widget.key] = count ?? 0;
            return;
          }
          if (widget.kind === "legacy_handoffs") {
            const { count } = await sb
              .from("leads")
              .select("id", { count: "exact", head: true })
              .eq("status", "needs_operator");
            stats[widget.key] = count ?? 0;
          }
        } catch {
          // Widget stats must never break the dashboard.
        }
      }),
    );
    return { widgets: stats };
  });
