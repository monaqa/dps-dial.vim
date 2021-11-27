import { findPatternAfterCursor } from "../augend.ts";
import {
  ensureBoolean,
  ensureNumber,
  ensureObject,
  ensureString,
} from "../deps.ts";
import { Augend } from "../type.ts";
import { toByteIdx } from "../util.ts";

export type AugendConfigNumber = {
  natural?: boolean;
  radix?: number;
  prefix?: string;
};

export function ensureAugendConfigNumber(
  x: unknown,
): asserts x is AugendConfigNumber {
  ensureObject(x);
  if (Object.prototype.hasOwnProperty.call(x, "natural")) {
    ensureBoolean(x.natural);
  }
  if (Object.prototype.hasOwnProperty.call(x, "radix")) {
    ensureNumber(x.radix);
  }
  if (Object.prototype.hasOwnProperty.call(x, "prefix")) {
    ensureString(x.prefix);
  }
}

export const defaultAugendConfigNumber: AugendConfigNumber = {};

function radixToCharRange(radix: number) {
  // 面倒なので radix が適正な範囲の整数であるときしか考えない
  if (radix <= 1 || radix >= 37 || !Number.isInteger(radix)) {
    return `0-9`;
  }

  if (radix <= 10) {
    return `0-${radix - 1}`;
  } else {
    const lastLarge = String.fromCodePoint(64 + radix - 10);
    const lastSmall = String.fromCodePoint(96 + radix - 10);
    return `0-9A-${lastLarge}a-${lastSmall}`;
  }
}

export function augendNumber(conf: AugendConfigNumber): Augend {
  const natural = conf.natural ?? true;
  const radix = conf.radix ?? 10;
  const prefix = (conf.prefix ?? "").replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  const regexp = RegExp(
    `${prefix}${natural ? "" : "-?"}[${radixToCharRange(radix)}]+`,
    "g",
  );

  const augend: Augend = {
    find: findPatternAfterCursor(regexp),

    add(text: string, addend: number, _cursor: number | null) {
      text = text.substr(prefix.length);
      let num = parseInt(text, radix);
      const nDigitString = text.length;
      const nDigitActual = String(num).length;
      num = num + addend;
      if (natural && num < 0) num = 0;
      let digits;
      if (nDigitString == nDigitActual) {
        // 増減前の数字が0、もしくは0始まりではない数字の場合は
        // そのままの数字を出力する
        digits = num.toString(radix);
      } else {
        // 増減前の数字が0始まりの正の数だったら0でパディングする
        digits = num.toString(radix).padStart(nDigitString, "0");
      }
      text = `${prefix}${digits}`;
      return Promise.resolve({ text, cursor: toByteIdx(text, text.length) });
    },
  };
  return augend;
}
