import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import {
  AugendConfigConstant,
  augendConstant,
  ensureAugendConfigConstant,
} from "./augend/constant.ts";
import { augendDate } from "./augend/date.ts";
import {
  AugendConfigNumber,
  augendNumber,
  defaultAugendConfigNumber,
} from "./augend/number.ts";
import { AugendConfigUser, augendUser } from "./augend/user.ts";
import { Augend } from "./type.ts";

type RequiredConfig<Kind, Opts> = { kind: Kind; opts: Opts };
type OptionalConfig<Kind, Opts> = Kind | { kind: Kind; opts: Opts };

export type AugendConfig =
  | OptionalConfig<"number", AugendConfigNumber>
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
      case "date":
        return augendDate();
    }
  }

  switch (conf.kind) {
    case "number":
      return augendNumber(conf.opts);
    case "constant":
      return augendConstant(conf.opts);
    case "user":
      return augendUser(denops, conf.opts);
  }
}
