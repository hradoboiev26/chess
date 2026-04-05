/**
 * Тексти для користувача (українською).
 */

export const KB_START = "🏠 Старт";

/** Reply-клавіатура: за натиском бот відповідає повідомленням із посиланням (url-кнопки в reply-клавіатурі в клієнтах часто глючать). */
export const KB_FSHU_WEB = "🌐 ФШУ";
export const FSHU_WEB_URL = "https://www.ukrchess.org.ua/";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Відповідь на кнопку «ФШУ»: клікабельне посилання в HTML. */
export function fshuSiteHtml() {
  const u = esc(FSHU_WEB_URL);
  return (
    "🌐 Офіційний сайт Федерації шахів України:\n" +
    `<a href="${u}">https://www.ukrchess.org.ua/</a>`
  );
}

/**
 * Після /start або кнопки «Старт» (HTML).
 */
export function welcomeHtml() {
  return (
    "Привіт! 👋\n\n" +
    "Бот створений для <b>швидкого пошуку</b> потрібного гравця в списках Федерації шахів України — уся інформація (рейтинги, звання тощо) в одному повідомленні.\n\n" +
    "✍️ Напишіть <b>прізвище</b> або його частину. Кілька збігів — оберіть людину кнопкою нижче."
  );
}

export function textOnlyHtml() {
  return (
    "📎 Надішліть, будь ласка, лише <b>текст</b> (прізвище). " +
    "Фото, файли й інші вкладення я не обробляю."
  );
}

export function dbUnavailableHtml() {
  return (
    "😔 Зараз не вдається показати дані. Спробуйте трохи пізніше або надішліть запит знову."
  );
}

export function needMoreCharsHtml() {
  return "⌨️ Напишіть хоча б <b>2 літери</b> прізвища.";
}

export function tryLongerSurnameHtml() {
  return (
    "🤔 Нікого не знайшов за цим початком.\n" +
    "Можливо, прізвище <b>не дописане</b> — додайте ще кілька літер і надішліть знову."
  );
}

export function notFoundHtml(query) {
  const q = esc(query);
  return (
    `🔍 За запитом «${q}» нікого не знайдено.\n` + "Перевірте написання. 📝"
  );
}

export function pickOneHtml(count, query) {
  return (
    `👥 Знайшов <b>${count}</b> варіантів для «${esc(query)}».\n` +
    "Оберіть потрібного нижче 👇"
  );
}

/** Підказка під списком при кількох «сторінках» (offset — індекс першого показаного). */
export function pickPageFooterHtml(offset, pageSize, total) {
  const from = offset + 1;
  const to = Math.min(offset + pageSize, total);
  if (total <= pageSize) return "";
  let s = `\n\n📎 Показано <b>${from}–${to}</b> з ${total}.`;
  if (offset + pageSize < total) {
    s += " Натисніть <b>Ще ▶️</b> для наступних.";
  } else if (offset > 0) {
    s += " <b>◀️ Попередні</b> — попередня порція.";
  }
  return s;
}

export function stalePickText() {
  return "Список застарів — знайдіть гравця знову 🔎";
}

export function staleNavText() {
  return "Спочатку надішліть прізвище пошуку знову 🔎";
}
