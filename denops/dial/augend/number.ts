import { findPatternAfterCursor } from "../augend.ts";
import { ensureBoolean, ensureObject } from "../deps.ts";
import { Augend } from "../type.ts";
import { toByteIdx } from "../util.ts";

export type AugendConfigNumber = {
  natural?: boolean;
};

export function ensureAugendConfigNumber(
  x: unknown,
): asserts x is AugendConfigNumber {
  ensureObject(x);
  if (x.hasOwnProperty("natural")) {
    ensureBoolean(x.natural);
  }
}

export const defaultAugendConfigNumber: AugendConfigNumber = {};

export function augendNumber(conf: AugendConfigNumber): Augend {
  const natural = conf.natural ?? true;

  const augend: Augend = {
    find: findPatternAfterCursor((natural) ? (/\d+/g) : (/-?\d+/g)),

    add(text: string, addend: number, _cursor: number | null) {
      let num = parseInt(text);
      const nDigitString = text.length;
      const nDigitActual = String(num).length;
      num = num + addend;
      if (natural && num < 0) num = 0;
      if (nDigitString == nDigitActual) {
        // 増減前の数字が0、もしくは0始まりではない数字の場合は
        // そのままの数字を出力する
        text = String(num);
      } else {
        // 増減前の数字が0始まりの正の数だったら0でパディングする
        text = String(num).padStart(nDigitString, "0");
      }
      return Promise.resolve({ text, cursor: toByteIdx(text, text.length) });
    },
  };
  return augend;
}
