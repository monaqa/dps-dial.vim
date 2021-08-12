import { findPatternAfterCursor } from "../augend.ts";
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
    find: findPatternAfterCursor(re),

    add(text: string, addend: number, _cursor: number | null) {
      const idx = elems.indexOf(text);
      let newIdx;
      if (cyclic) {
        newIdx = (lenElems + (idx + addend) % lenElems) % lenElems;
      } else {
        newIdx = idx + addend;
        if (newIdx < 0) newIdx = 0;
        if (newIdx >= lenElems) newIdx = lenElems - 1;
      }
      if (newIdx == idx) {
        return Promise.resolve({ cursor: text.length });
      }
      text = elems[newIdx];
      return Promise.resolve({ text, cursor: toByteIdx(text, text.length) });
    },
  };

  return augend;
}
