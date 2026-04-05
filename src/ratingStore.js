import { readFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

/** @typedef {{ fideNo: string, name: string, title: string, fed: string, rtgNat: string, rtgInt: string, birthday: string }} Player */

/**
 * Resolve path to the rating CSV (VEGA-style `;`-separated UTF-8 file).
 */
export function resolveRatingPath() {
  const fromEnv = process.env.RATING_CSV_PATH;
  if (fromEnv) return fromEnv;
  const name = process.env.RATING_CSV_FILE || "NAT2604V.CSV";
  return join(PROJECT_ROOT, "data", "rating", name);
}

/**
 * Дата рейтинг-листа з імені файлу (NAT2604V → «1 квітня 2026 р.»). Інакше null.
 */
export function asOfDateFromRatingFile() {
  const name = basename(resolveRatingPath());
  const m = name.match(/NAT(\d{2})(\d{2})/i);
  if (!m) return null;
  const yy = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return null;
  const d = new Date(Date.UTC(2000 + yy, mm - 1, 1));
  return d.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * @param {string} path
 * @returns {{ list: Player[], byFide: Map<string, Player>, error: Error | null }}
 */
export function loadRatingFile(path) {
  if (!existsSync(path)) {
    const err = new Error(`Rating file not found: ${path}`);
    return { list: [], byFide: new Map(), error: err };
  }
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    return { list: [], byFide: new Map(), error: e instanceof Error ? e : new Error(String(e)) };
  }

  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return { list: [], byFide: new Map(), error: new Error("Rating file is empty or has no data rows.") };
  }

  const header = lines[0].split(";").map((c) => c.trim());
  const idx = (name) => header.indexOf(name);

  const iFide = idx("Fide_No");
  const iName = idx("Name");
  const iTitle = idx("Title");
  const iFed = idx("Fed");
  const iNat = idx("Rtg_Nat");
  const iInt = idx("Rtg_Int");
  const iBirth = idx("Birthday");

  if (iName < 0) {
    return {
      list: [],
      byFide: new Map(),
      error: new Error('Rating CSV must contain a "Name" column.'),
    };
  }

  /** @type {Player[]} */
  const list = [];
  const byFide = new Map();

  for (let r = 1; r < lines.length; r++) {
    const parts = lines[r].split(";");
    const get = (i) => (i >= 0 && i < parts.length ? parts[i].trim() : "");

    const player = {
      fideNo: get(iFide),
      name: get(iName),
      title: get(iTitle),
      fed: get(iFed),
      rtgNat: get(iNat),
      rtgInt: get(iInt),
      birthday: get(iBirth),
    };
    if (!player.name) continue;
    list.push(player);
    if (player.fideNo && !byFide.has(player.fideNo)) {
      byFide.set(player.fideNo, player);
    }
  }

  return { list, byFide, error: null };
}

/**
 * First word of full name = surname (as in ФШУ export).
 * @param {string} name
 */
export function surnameFromFullName(name) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first;
}

/**
 * @param {string} s
 */
function normalizeToken(s) {
  return s.trim().toLocaleLowerCase("uk");
}

/** Мінімум символів у запиті, щоб шукати (менше — просимо дописати). */
export const MIN_SURNAME_QUERY_LEN = 2;

/**
 * Якщо збігів немає і довжина запиту не більша за це число — радимо додати літери, а не «не знайдено».
 */
export const SHORT_QUERY_LEN = 3;

/**
 * Пошук за початком прізвища (перше слово в Name), без урахування регістру.
 * @param {Player[]} list
 * @param {string} rawQuery
 * @returns {Player[]}
 */
export function findBySurnamePrefix(list, rawQuery) {
  const q = normalizeToken(rawQuery);
  if (q.length < MIN_SURNAME_QUERY_LEN) return [];

  const out = [];
  for (const p of list) {
    const sur = normalizeToken(surnameFromFullName(p.name));
    if (sur.startsWith(q)) out.push(p);
  }

  out.sort((a, b) => a.name.localeCompare(b.name, "uk"));
  return out;
}
