import { findPatternAfterCursor } from "../augend.ts";
import { ensureObject, ensureString, format, parse } from "../deps.ts";
import { Augend } from "../type.ts";

type DateKind =
  | "year"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "millis";

type DetermineDateKind = (cursor: number | null) => DateKind;
type DetermineCursorPos = (item: DateKind) => number | undefined;

const AVAILABLE_FORMATS = ["yyyy-MM-dd", "yyyy/MM/dd"] as const;
type AvailableFormats = typeof AVAILABLE_FORMATS[number];

export type AugendConfigDate = {
  format: AvailableFormats;
};

export function ensureAugendConfigDate(
  x: unknown,
): asserts x is AugendConfigDate {
  ensureObject(x);
  if (Object.prototype.hasOwnProperty.call(x, "format")) {
    ensureString(x.format);
    (AVAILABLE_FORMATS as unknown as string[]).includes(x.format);
  }
}

class AugendDate implements Augend {
  readonly pattern: RegExp;
  readonly format: string;
  readonly determineDateKind: DetermineDateKind;
  readonly determineCursorPos: DetermineCursorPos;

  kind: DateKind;

  constructor(
    pattern: RegExp,
    format: string,
    determineDateKind: DetermineDateKind,
    determineCursorPos: DetermineCursorPos,
  ) {
    this.pattern = pattern;
    this.format = format;
    this.determineDateKind = determineDateKind;
    this.determineCursorPos = determineCursorPos;

    this.kind = "day";
  }

  find(line: string, cursor: number | null) {
    return Promise.resolve(findPatternAfterCursor(this.pattern)(line, cursor));
  }

  async findStateful(line: string, cursor: number | null) {
    const range = await this.find(line, cursor);
    if (range === null) {
      return Promise.resolve(null);
    }
    const relCursor = (cursor != null) ? (cursor - range.from) : null;
    this.kind = this.determineDateKind(relCursor);
    return Promise.resolve(range);
  }

  add(text: string, addend: number, _cursor: number | null) {
    const dateFormat = this.format;
    const date: Date = parse(text, dateFormat);
    switch (this.kind) {
      case "year":
        {
          const year = date.getFullYear();
          date.setFullYear(year + addend);
        }
        break;
      case "month":
        {
          const month = date.getMonth();
          date.setMonth(month + addend);
        }
        break;
      case "day":
        {
          const day = date.getDate();
          date.setDate(day + addend);
        }
        break;
    }
    text = format(date, dateFormat);
    const cursor = this.determineCursorPos(this.kind) ?? text.length;
    return Promise.resolve({ text, cursor });
  }
}

export function augendDate(config: AugendConfigDate): Augend {
  switch (config.format) {
    case "yyyy/MM/dd": {
      const determineDateKind = (cursor: number | null) => {
        if (cursor == null) {
          return "day";
        }
        if (cursor > 0 && cursor <= 4) {
          return "year";
        }
        if (cursor > 4 && cursor <= 7) {
          return "month";
        }
        return "day";
      };
      const determineCursorPos = (item: DateKind) => {
        switch (item) {
          case "year":
            return 4;
          case "month":
            return 7;
          default:
            break;
        }
      };
      return new AugendDate(
        /(\d{4})\/(\d{2})\/(\d{2})/g,
        "yyyy/MM/dd",
        determineDateKind,
        determineCursorPos,
      );
    }

    case "yyyy-MM-dd": {
      const determineDateKind = (cursor: number | null) => {
        if (cursor == null) {
          return "day";
        }
        if (cursor > 0 && cursor <= 4) {
          return "year";
        }
        if (cursor > 4 && cursor <= 7) {
          return "month";
        }
        return "day";
      };
      const determineCursorPos = (item: DateKind) => {
        switch (item) {
          case "year":
            return 4;
          case "month":
            return 7;
          default:
            break;
        }
      };
      return new AugendDate(
        /(\d{4})-(\d{2})-(\d{2})/g,
        "yyyy-MM-dd",
        determineDateKind,
        determineCursorPos,
      );
    }
  }
}
