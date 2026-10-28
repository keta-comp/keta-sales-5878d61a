/** SQL matnini operatorlarga ajratadi. `--`, /* *\/, '...' va dollar-quote ($$, $tag$)
 *  ichidagi `;` larni hisobga oladi — Shu sababli funksiya tanalari bo'linmaydi. */
export function splitStatements(sql) {
  const out = [];
  let buf = "";
  let i = 0;
  let tag = null;

  const push = () => {
    const stmt = buf.trim();
    // Faqat izoh bo'lsa — kerak emas.
    if (stmt && stmt.split("\n").some((l) => l.trim() && !l.trim().startsWith("--"))) out.push(stmt.endsWith(";") ? stmt : stmt + ";");
    buf = "";
  };

  while (i < sql.length) {
    const rest = sql.slice(i);

    if (tag) {
      const end = rest.indexOf(tag);
      if (end === -1) {
        buf += rest;
        i = sql.length;
        break;
      }
      buf += rest.slice(0, end + tag.length);
      i += end + tag.length;
      tag = null;
      continue;
    }

    if (rest.startsWith("--")) {
      const nl = rest.indexOf("\n");
      const c = nl === -1 ? rest : rest.slice(0, nl + 1);
      buf += c;
      i += c.length;
      continue;
    }

    if (rest.startsWith("/*")) {
      const close = rest.indexOf("*/");
      const block = close === -1 ? rest : rest.slice(0, close + 2);
      buf += block;
      i += block.length;
      continue;
    }

    if (rest[0] === "'") {
      let j = 1;
      while (j < rest.length) {
        if (rest[j] === "'" && rest[j + 1] === "'") j += 2;
        else if (rest[j] === "'") break;
        else j++;
      }
      buf += rest.slice(0, j + 1);
      i += j + 1;
      continue;
    }

    const dollar = /^\$(?:([A-Za-z_0-9]*))\$/.exec(rest);
    if (dollar) {
      tag = dollar[0];
      buf += tag;
      i += tag.length;
      continue;
    }

    if (rest[0] === ";") {
      push();
      i += 1;
      continue;
    }

    buf += rest[0];
    i += 1;
  }

  const tail = buf.trim();
  if (tail) out.push(tail + ";");
  return out;
}
