import { findPatternAfterCursor } from "../augend.ts";
import { ensureObject } from "../deps.ts";
import { Augend } from "../type.ts";
import { toStringIdx } from "../util.ts";

export type AugendConfigColor = Record<never, never>

export function ensureAugendConfigColor(
  x: unknown,
): asserts x is AugendConfigColor {
  ensureObject(x);
}

type ColorKind = "r" | "g" | "b" | "all";

const COLOR_PTN = /#[0-9a-fA-F]{6}/g;

function clip255(n: number): number {
  if (n < 0) {
    return 0
  }
  if (n > 255) {
    return 255
  }
  return n
}

class AugendColor implements Augend {

  kind: ColorKind;

  constructor() {
    this.kind = "all";
  }

  async find(line: string, cursor: number | null) {
    return await findPatternAfterCursor(COLOR_PTN)(line, cursor);
  }

  async findStateful(line: string, cursor: number | null) {
    const range = await this.find(line, cursor);
    if (range === null) {
      return Promise.resolve(null);
    }
    const relCursor = (cursor != null) ? (cursor - range.from) : null;

    if (relCursor == null) {
      this.kind = "all"
    } else if (relCursor <= 1) {
      this.kind = "all"
    } else if (relCursor <= 3) {
      this.kind = "r"
    } else if (relCursor <= 5) {
      this.kind = "g"
    } else if (relCursor <= 7) {
      this.kind = "b"
    }
    return Promise.resolve(range);
  }

  add(text: string, addend: number, cursor: number | null) {
    let red = parseInt(text.substr(1, 2), 16);
    let green = parseInt(text.substr(3, 2), 16);
    let blue = parseInt(text.substr(5, 2), 16);

    switch (this.kind) {
      case "all": {
        red = clip255(red + addend);
        green = clip255(green + addend);
        blue = clip255(blue + addend);
        cursor = 1;
        break;
      }
      case "r": {
        red = clip255(red + addend);
        cursor = 3;
        break;
      }
      case "g": {
        green = clip255(green + addend);
        cursor = 5;
        break;
      }
      case "b": {
        blue = clip255(blue + addend);
        cursor = 7;
        break;
      }
    }

    const redText = red.toString(16).padStart(2, "0").toLowerCase();
    const greenText = green.toString(16).padStart(2, "0").toLowerCase();
    const blueText = blue.toString(16).padStart(2, "0").toLowerCase();

    text = `#${redText}${greenText}${blueText}`
    return Promise.resolve({ text, cursor });
  }

}

export function augendColor(config: AugendConfigColor): Augend {
  return new AugendColor();
}
