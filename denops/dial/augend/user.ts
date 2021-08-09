import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import { ensureLike } from "https://deno.land/x/unknownutil@v1.1.0/mod.ts";
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
    async add(text, addend, cursor?) {
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
