import "dotenv/config";
import { Bot, GrammyError, HttpError, InlineKeyboard } from "grammy";
import {
  loadRatingFile,
  findBySurnamePrefix,
  resolveRatingPath,
  asOfDateFromRatingFile,
  MIN_SURNAME_QUERY_LEN,
  SHORT_QUERY_LEN,
} from "./ratingStore.js";
import {
  formatPlayerCardHtml,
  formatPlayerButtonLabel,
  truncate,
} from "./playerFormat.js";
import {
  KB_START,
  KB_FSHU_WEB,
  welcomeHtml,
  fshuSiteHtml,
  textOnlyHtml,
  dbUnavailableHtml,
  needMoreCharsHtml,
  tryLongerSurnameHtml,
  notFoundHtml,
  pickOneHtml,
  pickPageFooterHtml,
  stalePickText,
  staleNavText,
} from "./texts/uk.js";
import { mainMenuKeyboard } from "./keyboards.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error(
    "Missing BOT_TOKEN: create a .env file with BOT_TOKEN=<token from @BotFather>."
  );
  process.exit(1);
}

const RATING_PATH = resolveRatingPath();
const { list: ratingList, byFide, error: ratingLoadError } =
  loadRatingFile(RATING_PATH);

if (ratingLoadError) {
  console.error(
    "Failed to load rating file:",
    ratingLoadError.message,
    `(path: ${RATING_PATH})`
  );
} else {
  console.log(
    `Loaded ${ratingList.length} players from rating file (${RATING_PATH}).`
  );
}

const ratingAsOfDate = asOfDateFromRatingFile();

const MAX_DISAMBIGUATION = 10;

/** Поточний список збігів для пагінації (після нового пошуку перезаписується). */
const disambiguationState = new Map();

const bot = new Bot(token);

function buildDisambiguationKeyboard(matches, offset) {
  const kb = new InlineKeyboard();
  const page = matches.slice(offset, offset + MAX_DISAMBIGUATION);
  for (const p of page) {
    kb.text(truncate(formatPlayerButtonLabel(p), 58), `pick:${p.fideNo}`).row();
  }
  const prevOff = offset - MAX_DISAMBIGUATION;
  const nextOff = offset + MAX_DISAMBIGUATION;
  if (prevOff >= 0 || nextOff < matches.length) {
    if (prevOff >= 0) {
      kb.text("◀️ Попередні", `more:${Math.max(0, prevOff)}`);
    }
    if (nextOff < matches.length) {
      const rest = matches.length - nextOff;
      kb.text(`Ще ▶️ (${rest})`, `more:${nextOff}`);
    }
    kb.row();
  }
  return kb;
}

const replyOpts = () => ({
  parse_mode: "HTML",
  reply_markup: mainMenuKeyboard(),
});

function privateChat(ctx) {
  return ctx.chat?.type === "private";
}

/** Медіа й інші типи: не обробляємо, але чітко відповідаємо (прибрати «тишу» після вкладення). */
function messageHasOnlyNonTextPayload(ctx) {
  const m = ctx.message;
  if (!m || m.text != null) return false;
  return (
    m.photo != null ||
    m.document != null ||
    m.video != null ||
    m.animation != null ||
    m.voice != null ||
    m.video_note != null ||
    m.audio != null ||
    m.sticker != null ||
    m.contact != null ||
    m.location != null ||
    m.venue != null ||
    m.poll != null ||
    m.dice != null ||
    m.game != null ||
    m.story != null ||
    m.media_group_id != null
  );
}

bot.command("start", async (ctx) => {
  await ctx.reply(welcomeHtml(), replyOpts());
});

/** /help kept so old links work; same reply as /start (no separate help screen). */
bot.command("help", async (ctx) => {
  await ctx.reply(welcomeHtml(), replyOpts());
});

bot.on("message").filter(privateChat).filter(messageHasOnlyNonTextPayload, async (ctx) => {
  await ctx.reply(textOnlyHtml(), replyOpts());
});

bot.on("message:text").filter(privateChat, async (ctx) => {
  const text = ctx.message.text.trim();

  if (text.startsWith("/")) return;

  if (text === KB_START) {
    await ctx.reply(welcomeHtml(), replyOpts());
    return;
  }
  if (text === KB_FSHU_WEB) {
    await ctx.reply(fshuSiteHtml(), replyOpts());
    return;
  }

  if (ratingLoadError || ratingList.length === 0) {
    await ctx.reply(dbUnavailableHtml(), replyOpts());
    return;
  }

  if (text.length < MIN_SURNAME_QUERY_LEN) {
    await ctx.reply(needMoreCharsHtml(), replyOpts());
    return;
  }

  const matches = findBySurnamePrefix(ratingList, text);

  if (matches.length === 0) {
    if (text.length <= SHORT_QUERY_LEN) {
      await ctx.reply(tryLongerSurnameHtml(), replyOpts());
    } else {
      await ctx.reply(notFoundHtml(text), replyOpts());
    }
    return;
  }

  if (matches.length === 1) {
    await ctx.reply(
      formatPlayerCardHtml(matches[0], { asOfDate: ratingAsOfDate }),
      {
        parse_mode: "HTML",
        reply_markup: mainMenuKeyboard(),
      }
    );
    return;
  }

  disambiguationState.set(ctx.from.id, { query: text, matches });
  const offset = 0;
  let body =
    pickOneHtml(matches.length, text) +
    pickPageFooterHtml(offset, MAX_DISAMBIGUATION, matches.length);
  await ctx.reply(body, {
    parse_mode: "HTML",
    reply_markup: buildDisambiguationKeyboard(matches, offset),
  });
});

bot.callbackQuery(/^more:(\d+)$/).filter(privateChat, async (ctx) => {
  const offset = parseInt(ctx.match[1], 10);
  const state = disambiguationState.get(ctx.from.id);
  if (
    !state ||
    state.matches.length === 0 ||
    offset < 0 ||
    offset >= state.matches.length
  ) {
    await ctx.answerCallbackQuery({ text: staleNavText(), show_alert: false });
    return;
  }
  await ctx.answerCallbackQuery();
  const { query, matches } = state;
  const body =
    pickOneHtml(matches.length, query) +
    pickPageFooterHtml(offset, MAX_DISAMBIGUATION, matches.length);
  try {
    await ctx.editMessageText(body, {
      parse_mode: "HTML",
      reply_markup: buildDisambiguationKeyboard(matches, offset),
    });
  } catch {
    await ctx.reply(body, {
      parse_mode: "HTML",
      reply_markup: buildDisambiguationKeyboard(matches, offset),
    });
  }
});

bot.callbackQuery(/^pick:(.+)$/, async (ctx) => {
  const fide = ctx.match[1];
  const p = byFide.get(fide);
  if (!p) {
    await ctx.answerCallbackQuery({ text: stalePickText(), show_alert: false });
    return;
  }
  await ctx.answerCallbackQuery();
  disambiguationState.delete(ctx.from.id);
  const card = formatPlayerCardHtml(p, { asOfDate: ratingAsOfDate });
  try {
    await ctx.editMessageText(card, { parse_mode: "HTML" });
  } catch {
    await ctx.reply(card, {
      parse_mode: "HTML",
      reply_markup: mainMenuKeyboard(),
    });
  }
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

bot.start({
  onStart: (me) => {
    console.log(`Bot @${me.username} ready (long polling).`);
  },
});
