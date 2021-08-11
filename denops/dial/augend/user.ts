import { Denops, ensureLike } from "../deps.ts";
import { Augend, TextRange } from "../type.ts";

type FuncId = string;

export type AugendConfigUser = {
  find: FuncId;
  add: FuncId;
};

export function ensureAugendConfigUser(
  x: unknown,
): asserts x is AugendConfigUser {
  ensureLike({ find: "", add: "" }, x);
}

export function augendUser(denops: Denops, conf: AugendConfigUser): Augend {
  const augend: Augend = {
    async find(line, cursor) {
      const result = await denops.call(
        "denops#callback#call",
        conf.find,
        line,
        cursor,
      ) as TextRange | null;
      return Promise.resolve(result);
    },
    async add(text, addend, cursor) {
      const result = await denops.call(
        "denops#callback#call",
        conf.add,
        text,
        addend,
        cursor,
      ) as { text?: string; cursor?: number };
      return Promise.resolve(result);
    },
  };

  return augend;
}
