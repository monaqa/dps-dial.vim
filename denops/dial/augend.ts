import {
  ensureArray,
  isObject,
} from "https://deno.land/x/unknownutil@v1.1.0/mod.ts";
import { AugendConfigConstant, augendConstant, ensureAugendConfigConstant } from "./augend/constant.ts";
import {
  AugendConfigNumber,
  augendNumber,
  defaultAugendConfigNumber,
  ensureAugendConfigNumber,
} from "./augend/number.ts";
import { Augend } from "./type.ts";

type RequiredConfig<Kind, Opts> = {kind: Kind, opts: Opts}
type OptionalConfig<Kind, Opts> = Kind | {kind: Kind, opts: Opts}

export type AugendConfig =
  OptionalConfig<"number", AugendConfigNumber>
  | RequiredConfig<"constant", AugendConfigConstant>

export function ensureAugendConfigs(xs: unknown): asserts xs is AugendConfig[] {
  ensureArray(xs);
  for (const x of xs) {
    if (typeof x === "string") {
      if (!["number"].includes(x)) {
        throw new Error("improper string.");
      }
    }
    if (!isObject(x)) {
      throw new Error("improper type.");
    }
    if (!x.hasOwnProperty("kind") || !x.hasOwnProperty("opts")) {
      throw new Error("object have to include key 'kind' and 'opts'.");
    }
    switch (x.kind) {
      case "number":
        ensureAugendConfigNumber(x.opts);
        break;
      case "constant":
        ensureAugendConfigConstant(x.opts);
        break;
      default:
        throw new Error("unknown kind.");
    }
  }
}

export const defaultAugendConfigs: AugendConfig[] = ["number"];

export function generateAugendConfig(conf: AugendConfig): Augend {
  if (typeof conf === "string") {
    switch (conf) {
      case "number":
        return augendNumber(defaultAugendConfigNumber);
    }
  }

  switch (conf.kind) {
    case "number":
      return augendNumber(conf.opts);
    case "constant":
      return augendConstant(conf.opts);
  }
}
