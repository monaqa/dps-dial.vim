import { ensureArray, ensureBoolean, ensureObject, isString } from "../deps.ts";
import { Augend } from "../type.ts";
import { toByteIdx } from "../util.ts";

export type AugendConfigConstant = {
  elements: [string, string, ...string[]];
  cyclic?: boolean;
  word?: boolean;
};

export function ensureAugendConfigConstant(
  x: unknown,
): asserts x is AugendConfigConstant {
  ensureObject(x);
  ensureArray(x.elements, isString);
  if (x.elements.length <= 1) {
    throw new Error(
      "The number of elements must be greater than or equal to 2.",
    );
  }
  if (x.hasOwnProperty("cyclic")) {
    ensureBoolean(x.cyclic);
  }
  if (x.hasOwnProperty("word")) {
    ensureBoolean(x.word);
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function augendConstant(conf: AugendConfigConstant): Augend {
  const elems: string[] = conf.elements;
  const lenElems = elems.length;
  const cyclic = conf.cyclic ?? true;
  const word = conf.word ?? true;

  const regexpBody = elems.map((text) => escapeRegExp(text)).join("|");
  const re = new RegExp(
    (word) ? `\\b(${regexpBody})\\b` : regexpBody,
    "g",
  );

  const augend: Augend = {
    find(line, cursor) {
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
      let idx = elems.indexOf(text);
      if (cyclic) {
        idx = (lenElems + (idx + addend) % lenElems) % lenElems;
      } else {
        idx = idx + addend;
        if (idx < 0) idx = 0;
        if (idx >= lenElems) idx = lenElems - 1;
      }
      text = elems[idx];
      return Promise.resolve({ text, cursor: toByteIdx(text, text.length) });
    },
  };

  return augend;
}
