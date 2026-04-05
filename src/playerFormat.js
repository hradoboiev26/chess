/** @typedef {import("./ratingStore.js").Player} Player */

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @param {string} v
 */
function ratingLine(v) {
  const t = v.trim();
  if (!t || t === "0") return "—";
  return t;
}

/**
 * @param {string} raw
 */
function birthdayUk(raw) {
  const t = raw.trim();
  if (!t || t === ".  ." || /^\.+\s*\.+$/.test(t)) return "—";
  const date = esc(t);
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return date;
  const birth = new Date(+m[3], +m[2] - 1, +m[1]);
  const now = new Date();
  if (Number.isNaN(birth.getTime()) || birth > now) return date;
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  if (age < 0 || age > 130) return date;
  return `${date} (<b>${age}</b>)`;
}

/**
 * Емодзі + текст. Після емодзі — U+FE0F (emoji style) і звичайний пробіл:
 * на десктопі Telegram інколи вирівнює краще, ніж лише NBSP.
 * Повністю однаковий вигляд на телефоні й ноуті API не гарантує (різні шрифти).
 */
function emLine(emoji, htmlRest) {
  return `${emoji}\uFE0F ${htmlRest}`;
}

/**
 * Картка гравця: порядок полів як домовились, важливе виділено &lt;b&gt;.
 * @param {Player} p
 * @param {{ asOfDate?: string | null }} [opts]
 */
export function formatPlayerCardHtml(p, opts = {}) {
  const { asOfDate } = opts;

  const title = p.title?.trim();
  const head = title
    ? emLine("👤", `<b>${esc(p.name)}</b> (${esc(title)})`)
    : emLine("👤", `<b>${esc(p.name)}</b>`);

  const nat = ratingLine(p.rtgNat);
  const intl = ratingLine(p.rtgInt);

  const blocks = [
    head,
    "",
    emLine("📈", `Національний рейтинг: <b>${esc(nat)}</b>`),
    emLine("🌐", `FIDE рейтинг: <b>${esc(intl)}</b>`),
    emLine("🎂", birthdayUk(p.birthday)),
    emLine("📍", `Регіон (ФШУ): ${esc(p.fed || "—")}`),
    emLine("🆔", `FIDE ID: ${esc(p.fideNo || "—")}`),
  ];

  let out = blocks.join("\n");

  if (asOfDate) {
    out += `\n\n${emLine("📅", `<i>Дані актуальні станом на ${esc(asOfDate)}</i>`)}`;
  }

  return out;
}

/**
 * Підпис на inline-кнопці (обрізати ззовні).
 * @param {Player} p
 */
export function formatPlayerButtonLabel(p) {
  const nat = ratingLine(p.rtgNat);
  const intl = ratingLine(p.rtgInt);
  const r = nat !== "—" || intl !== "—" ? `${nat}/${intl}` : "—";
  return `${p.name} · ${r}`;
}

/**
 * @param {string} s
 * @param {number} max
 */
export function truncate(s, max) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}
