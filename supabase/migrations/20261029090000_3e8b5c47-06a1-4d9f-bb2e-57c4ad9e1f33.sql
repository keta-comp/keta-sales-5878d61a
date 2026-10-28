-- PostgREST moslik qatlami jsonb qiymatlarini ikki marta kodlab yozgan edi:
-- obyekt JSON.stringify qilinib, keyin postgres.js uni yana kodlagan, natijada
-- jsonb ichida obyekt emas, satr saqlangan. Shim tuzatildi; mavjud qatorlar
-- shu yerda tiklanadi.
--
-- Faqat matni `{` yoki `[` bilan boshlanadigan jsonb satrlar tegiladi — haqiqiy
-- matnli jsonb qiymatlar (masalan "ok") o'zgarmaydi. Takroriy ishga tushirishda
-- hech narsa o'zgarmaydi, chunki tuzatilgandan keyin jsonb_typeof endi 'string' emas.

update crm_configs
   set config = (config #>> '{}')::jsonb
 where config is not null
   and jsonb_typeof(config) = 'string'
   and left(ltrim(config #>> '{}'), 1) in ('{', '[');

update audit_logs
   set metadata = (metadata #>> '{}')::jsonb
 where metadata is not null
   and jsonb_typeof(metadata) = 'string'
   and left(ltrim(metadata #>> '{}'), 1) in ('{', '[');
