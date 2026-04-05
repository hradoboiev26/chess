import { Keyboard } from "grammy";
import { KB_FSHU_WEB, KB_START } from "./texts/uk.js";

export function mainMenuKeyboard() {
  return new Keyboard()
    .text(KB_START)
    .text(KB_FSHU_WEB)
    .resized()
    .persistent();
}
