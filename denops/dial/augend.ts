import { Denops, ensureArray, ensureObject } from "./deps.ts";
import {
  AugendConfigConstant,
  augendConstant,
  ensureAugendConfigConstant,
} from "./augend/constant.ts";
import {
  AugendConfigDate,
  augendDate,
  ensureAugendConfigDate,
} from "./augend/date.ts";
import {
  AugendConfigNumber,
  augendNumber,
  ensureAugendConfigNumber,
} from "./augend/number.ts";
import {
  AugendConfigUser,
  augendUser,
  ensureAugendConfigUser,
} from "./augend/user.ts";
import { Augend, TextRange } from "./type.ts";
import { toByteIdx } from "./util.ts";
import {
  augendCase,
  AugendConfigCase,
  ensureAugendConfigCase,
} from "./augend/case.ts";

export type AugendConfig =
  | { kind: "number"; opts: AugendConfigNumber }
  | { kind: "constant"; opts: AugendConfigConstant }
  | { kind: "case"; opts: AugendConfigCase }
  | { kind: "date"; opts: AugendConfigDate }
  | { kind: "user"; opts: AugendConfigUser };

export function ensureAugendConfig(
  conf: unknown,
): asserts conf is AugendConfig {
  ensureObject(conf);
  if (
    !Object.prototype.hasOwnProperty.call(conf, "kind") ||
    !Object.prototype.hasOwnProperty.call(conf, "opts")
  ) {
    throw new Error(
      "Any augend config must have a field named 'kind' and 'opts'.",
    );
  }
  switch (conf["kind"]) {
    case "number":
      ensureAugendConfigNumber(conf["opts"]);
      break;
    case "constant":
      ensureAugendConfigConstant(conf["opts"]);
      break;

    case "case":
      ensureAugendConfigCase(conf["opts"]);
      break;

    case "date":
      ensureAugendConfigDate(conf["opts"]);
      break;

    case "user":
      ensureAugendConfigUser(conf["opts"]);
      break;

    default:
      throw new Error(`Unknown augend kind: ${conf["kind"]}`);
  }
}

export type AugendConfigOrString = string | AugendConfig;

export function ensureAugendConfigOrStringList(
  xs: unknown,
): asserts xs is AugendConfigOrString[] {
  ensureArray(xs);
  for (const x of xs) {
    if (typeof x != "string") {
      ensureAugendConfig(x);
    }
  }
}

export type AugendAliases = Record<string, AugendConfig>;

export function ensureAugendAliases(
  map: unknown,
): asserts map is AugendAliases {
  ensureObject(map);
  for (const key in map) {
    ensureAugendConfig(map[key]);
  }
}

/**
 * AugendConfigOrString の中に入っている文字列に対して aliases マップを適用する。
 */
export function applyAlias(
  x: AugendConfigOrString,
  aliases: AugendAliases,
): AugendConfig {
  if (typeof x == "string") {
    if (aliases[x] === undefined) {
      throw new Error(`Undefined alias. Add '${x}' key in alias map.`);
    }
    return aliases[x];
  } else {
    return x;
  }
}

export function generateAugendConfig(
  denops: Denops,
  conf: AugendConfig,
): Augend {
  switch (conf.kind) {
    case "number":
      return augendNumber(conf.opts);
    case "case":
      return augendCase(conf.opts);
    case "constant":
      return augendConstant(conf.opts);
    case "user":
      return augendUser(denops, conf.opts);
    case "date":
      return augendDate(conf.opts);
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
