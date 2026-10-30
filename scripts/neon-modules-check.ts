// Soha presetlarining ma'lumot qatlamini haqiqiy Neon bazasida tekshiradi:
// har modul maydonlari, bog'lanish (relation) maqsadlari va crm_records CRUD.
import "dotenv/config";

import { INDUSTRY_PRESETS, presetForIndustry, relationIdKey } from "@/lib/crm-config";
import type { CrmConfigData, CrmField, CrmModule } from "@/lib/crm-config";
import { PRESETS } from "@/lib/presets";
import { closePool, ownerSql } from "@/lib/db";
import { userClient } from "@/lib/pg-rest.server";

let pass = 0;
let fail = 0;
const notes: string[] = [];

function check(name: string, ok: boolean, extra?: unknown) {
  if (ok) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`  FAIL ${name}`, extra ?? "");
  }
}

/** Maydon turi uchun bazaga yozib bo'ladigan namunaviy qiymat. */
function sampleValue(field: CrmField, index: number): unknown {
  switch (field.type) {
    case "money":
    case "number":
      return 1000 + index;
    case "date":
      return "2026-10-29";
    case "select":
      return field.options?.[0] ?? "Variant";
    case "relation":
      return index === 0 ? "__target__" : null;
    case "phone":
      return "+998900000099";
    case "file":
      return `crm_attachments/tekshiruv/namuna-${index}.txt`;
    default:
      return `${field.label} tekshiruv ${index}`;
  }
}

function buildData(moduleDef: CrmModule, targets: Map<string, string>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of moduleDef.fields ?? []) {
    const value = sampleValue(field, 0);
    if (field.type === "relation") {
      const name = String(value);
      data[field.key] = name;
      const targetId = field.targetModule ? targets.get(field.targetModule) : undefined;
      if (targetId) data[relationIdKey(field.key)] = targetId;
    } else {
      data[field.key] = value;
    }
  }
  return data;
}

async function main() {
  const sql = ownerSql();
  const [owner] = await sql<{ id: string; name: string; email: string }[]>`
    select b.owner_id as id, b.name, u.email
    from public.businesses b
    join neon_auth."user" u on u.id = b.owner_id
    where u.email like '%ketaone.test'
    order by b.created_at desc
    limit 1
  `;
  if (!owner) throw new Error("Tekshiruv uchun test biznesi topilmadi (email like %ketaone.test).");
  const [biz] = await sql<{ id: string }[]>`
    select id from public.businesses where owner_id = ${owner.id} limit 1
  `;
  const businessId = biz!.id;
  console.log(`Aktyor: ${owner.email}, biznes: ${owner.name} (${businessId})\n`);
  const db = userClient(owner.id);

  // 1) Preset reyestri va soha konfiguratsiyalari mosligi
  const registryKeys = Object.values(PRESETS).map((p) => p.industryKey);
  for (const [industry, config] of Object.entries(INDUSTRY_PRESETS)) {
    check(`${industry}: preset reyestrida mavjud`, registryKeys.includes(industry), "reyestrda yo'q");
    check(`${industry}: presetForIndustry qaytaradi`, presetForIndustry(industry) === config);
  }

  // 2) Har soha bo'yicha modul maydonlari, relation maqsadlari, CRUD
  for (const industry of Object.keys(INDUSTRY_PRESETS)) {
    const config: CrmConfigData = INDUSTRY_PRESETS[industry]!;
    const moduleKeys = new Set(config.modules.map((m) => m.key));
    const dynamic = config.modules.filter((m) => !m.link && m.fields?.length);

    // relation maqsadi har doim "customers" yoki shu sohadagi modul bo'lishi kerak
    for (const m of config.modules) {
      for (const f of m.fields ?? []) {
        if (f.type !== "relation") continue;
        const target = f.targetModule;
        check(
          `${industry}/${m.key}.${f.key}: relation maqsadi`,
          !!target && (target === "customers" || moduleKeys.has(target)),
          target ?? "targetModule yo'q",
        );
      }
    }

    // dashboard vidgetlari mavjud modulga ishora qilishi kerak
    for (const w of config.dashboardWidgets) {
      if (w.moduleKey) check(`${industry}: vidget ${w.key} moduli`, moduleKeys.has(w.moduleKey), w.moduleKey);
    }

    // har dinamik modulga yozuv qo'yish, o'qish, yangilash, o'chirish
    const targets = new Map<string, string>();
    const created: string[] = [];
    for (const m of dynamic) {
      const title = `Tekshiruv ${industry} — ${m.label}`;
      const required = (m.fields ?? []).filter((f) => f.required);
      const insert = await db
        .from("crm_records")
        .insert({
          business_id: businessId,
          module_key: m.key,
          title,
          stage: m.pipeline ? config.pipelineStages[0] : null,
          data: buildData(m, targets) as never,
        })
        .select("id")
        .single();
      check(`${industry}/${m.key}: insert`, !insert.error && !!insert.data?.id, insert.error);
      if (insert.error || !insert.data) continue;
      created.push(insert.data.id);
      targets.set(m.key, insert.data.id);

      const listed = await db
        .from("crm_records")
        .select("*")
        .eq("business_id", businessId)
        .eq("module_key", m.key)
        .order("created_at", { ascending: false })
        .limit(500);
      check(
        `${industry}/${m.key}: list`,
        !listed.error && (listed.data?.some((r: any) => r.id === insert.data.id && r.title === title)) === true,
        listed.error ?? listed.data?.length,
      );

      const searched = await db
        .from("crm_records")
        .select("id")
        .eq("business_id", businessId)
        .eq("module_key", m.key)
        .ilike("title", `%${industry}%`);
      check(`${industry}/${m.key}: qidiruv (ilike title)`, !searched.error && (searched.data?.length ?? 0) >= 1, searched.error);

      // majburiy maydonlar to'liq bo'lishi kerak — UI ularni talab qiladi
      const row = (listed.data ?? []).find((r: any) => r.id === insert.data.id) as any;
      for (const f of required) {
        const v = row?.data?.[f.key];
        check(`${industry}/${m.key}.${f.key}: majburiy maydon`, v != null && v !== "", f.key);
      }

      // ikkinchi yozuvdagi relation qiymati birinchi yozuvga ishora qilsin
      const withRelations = (m.fields ?? []).filter((f) => f.type === "relation");
      if (withRelations.length) {
        const second = await db
          .from("crm_records")
          .insert({
            business_id: businessId,
            module_key: m.key,
            title: `${title} (bog'liq)`,
            stage: null,
            data: buildData(m, targets) as never,
          })
          .select("id, data")
          .single();
        check(`${industry}/${m.key}: relationli insert`, !second.error && !!second.data?.id, second.error);
        if (!second.error && second.data) {
          created.push(second.data.id);
          for (const f of withRelations) {
            const idKey = relationIdKey(f.key);
            if (targets.has(f.targetModule ?? "")) {
              check(
                `${industry}/${m.key}.${f.key}: relation id saqlandi`,
                second.data.data?.[idKey] === targets.get(f.targetModule ?? ""),
                { got: second.data.data?.[idKey], want: targets.get(f.targetModule ?? "") },
              );
            }
          }
        }
      }

      const updated = await db
        .from("crm_records")
        .update({ stage: config.pipelineStages[config.pipelineStages.length - 1], data: { holat: "yangilandi" } })
        .eq("id", insert.data.id)
        .eq("business_id", businessId)
        .select("id, stage, data")
        .maybeSingle();
      check(
        `${industry}/${m.key}: update + returning`,
        !updated.error && updated.data?.stage === config.pipelineStages.at(-1),
        updated.error ?? updated.data,
      );

      const jsonbPath = await db
        .from("crm_records")
        .select("id")
        .eq("business_id", businessId)
        .eq("module_key", m.key)
        .eq("data->>holat", "yangilandi");
      check(`${industry}/${m.key}: jsonb yo'l filtri`, !jsonbPath.error && (jsonbPath.data?.length ?? 0) === 1, jsonbPath.error);
    }

    // tozalash
    for (const id of created) await db.from("crm_records").delete().eq("id", id);
    const leftover = await db
      .from("crm_records")
      .select("id")
      .eq("business_id", businessId)
      .ilike("title", "%Tekshiruv %");
    check(`${industry}: test yozuvlari tozalandi`, (leftover.data?.length ?? 0) === 0, leftover.data?.length);

    notes.push(`${industry}: ${config.modules.length} modul, ${dynamic.length} dinamik yozuv sinovdan o'tdi`);
    console.log(`  ${industry.padEnd(16)} ${notes.at(-1)!.split(", ").slice(1).join(", ")}`);
  }

  console.log(`\nModul tekshiruvi: ${pass} OK, ${fail} FAIL`);
  await closePool();
  if (fail) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await closePool();
  process.exit(1);
});
