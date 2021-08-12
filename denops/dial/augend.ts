import { Denops } from "./deps.ts";
import { AugendConfigConstant, augendConstant } from "./augend/constant.ts";
import { augendDate } from "./augend/date.ts";
import {
  AugendConfigNumber,
  augendNumber,
  defaultAugendConfigNumber,
} from "./augend/number.ts";
import { AugendConfigUser, augendUser } from "./augend/user.ts";
import { Augend, TextRange } from "./type.ts";
import { toByteIdx } from "./util.ts";
import {
  augendCase,
  AugendConfigCase,
  defaultAugendConfigCase,
} from "./augend/case.ts";

type RequiredConfig<Kind, Opts> = { kind: Kind; opts: Opts };
type OptionalConfig<Kind, Opts> = Kind | { kind: Kind; opts: Opts };

export type AugendConfig =
  | OptionalConfig<"number", AugendConfigNumber>
  | OptionalConfig<"case", AugendConfigCase>
  | RequiredConfig<"constant", AugendConfigConstant>
  | RequiredConfig<"user", AugendConfigUser>
  | "date";

export function generateAugendConfig(
  denops: Denops,
  conf: AugendConfig,
): Augend {
  if (typeof conf === "string") {
    switch (conf) {
      case "number":
        return augendNumber(defaultAugendConfigNumber);
      case "case":
        return augendCase(defaultAugendConfigCase);
      case "date":
        return augendDate();
    }
  }

  switch (conf.kind) {
    case "number":
      return augendNumber(conf.opts);
    case "case":
      return augendCase(conf.opts);
    case "constant":
      return augendConstant(conf.opts);
    case "user":
      return augendUser(denops, conf.opts);
  }
}

export function findPatternAfterCursor(
  re: RegExp,
): (line: string, cursor: number | null) => Promise<TextRange | null> {
  return (line: string, cursor: number | null) => {
    const matches = line.matchAll(re);
    for (const match of matches) {
      if (match.index === undefined) {
        continue;
      }
      const matchText = match[0];
      const endpos = match.index + matchText.length;
      const endposByte = toByteIdx(line, endpos);
      if (cursor === null || endposByte >= cursor) {
        const from = toByteIdx(line, match.index);
        const to = endposByte;
        return Promise.resolve({ from, to });
      }
    }
    return Promise.resolve(null);
  };
}
