import {
  ensureBoolean,
  ensureObject,
} from "https://deno.land/x/unknownutil@v1.1.0/mod.ts";
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
    find(line, cursor) {
      const re = (natural) ? (/\d+/g) : (/-?\d+/g);
      const matches = line.matchAll(re);
      for (const match of matches) {
        if (match.index === undefined) {
          continue;
        }
        const matchText = match[0];
        const endpos = match.index + matchText.length;
        const endposByte = toByteIdx(line, endpos);
        if (endposByte >= cursor) {
          const from = toByteIdx(line, match.index);
          const to = endposByte;
          return Promise.resolve({ from, to });
        }
      }
      return Promise.resolve(null);
    },

    add(text: string, addend: number, _cursor?: number) {
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
