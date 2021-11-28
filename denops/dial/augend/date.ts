import { findPatternAfterCursor } from "../augend.ts";
import {
  ensureBoolean,
  ensureObject,
  ensureString,
  format,
  parse,
} from "../deps.ts";
import { Augend } from "../type.ts";
import { toStringIdx } from "../util.ts";

type DateKind =
  | "year"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "millis";

type DetermineDateKind = (text: string, cursor: number | null) => DateKind;
type DetermineCursorPos = (text: string, item: DateKind) => number | undefined;

const AVAILABLE_FORMATS = [
  "yyyy-MM-dd",
  "yyyy/MM/dd",
  "MM/dd",
  "M/d",
  "HH:mm",
  "HH:mm:ss",
] as const;
type AvailableFormats = typeof AVAILABLE_FORMATS[number];

export type AugendConfigDate = {
  format: AvailableFormats;
  "only_valid"?: boolean;
};

export function ensureAugendConfigDate(
  x: unknown,
): asserts x is AugendConfigDate {
  ensureObject(x);
  if (Object.prototype.hasOwnProperty.call(x, "format")) {
    ensureString(x.format);
    if (!(AVAILABLE_FORMATS as unknown as string[]).includes(x.format)) {
      throw new Error(
        "Date format is invalid. Available formats: " +
          AVAILABLE_FORMATS.join(", "),
      );
    }
  }
  if (Object.prototype.hasOwnProperty.call(x, "only_valid")) {
    ensureBoolean(x["only_valid"]);
  }
}

class AugendDate implements Augend {
  readonly pattern: RegExp;
  readonly format: string;
  readonly determineDateKind: DetermineDateKind;
  readonly determineCursorPos: DetermineCursorPos;
  readonly onlyValid: boolean;

  kind: DateKind;

  constructor(
    pattern: RegExp,
    format: string,
    determineDateKind: DetermineDateKind,
    determineCursorPos: DetermineCursorPos,
    onlyValid: boolean,
  ) {
    this.pattern = pattern;
    this.format = format;
    this.determineDateKind = determineDateKind;
    this.determineCursorPos = determineCursorPos;
    this.onlyValid = onlyValid;

    this.kind = "day";
  }

  async find(line: string, cursor: number | null) {
    const range = await findPatternAfterCursor(this.pattern)(line, cursor);
    if (!this.onlyValid || range == null) {
      return Promise.resolve(range);
    }
    const { from, to } = range;
    const fromUtf16 = toStringIdx(line, from);
    const toUtf16 = toStringIdx(line, to);
    const text = line.substr(fromUtf16, toUtf16 - fromUtf16);
    const date: Date = parse(text, this.format);
    const reconstructedText = format(date, this.format);
    if (text == reconstructedText) {
      return Promise.resolve(range);
    } else {
      return Promise.resolve(null);
    }
  }

  async findStateful(line: string, cursor: number | null) {
    const range = await this.find(line, cursor);
    if (range === null) {
      return Promise.resolve(null);
    }
    const relCursor = (cursor != null) ? (cursor - range.from) : null;
    const { from, to } = range;
    const fromUtf16 = toStringIdx(line, from);
    const toUtf16 = toStringIdx(line, to);
    const text = line.substr(fromUtf16, toUtf16 - fromUtf16);
    this.kind = this.determineDateKind(text, relCursor);
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
      case "hour":
        {
          const hour = date.getHours();
          date.setHours(hour + addend);
        }
        break;
      case "minute":
        {
          const minute = date.getMinutes();
          date.setMinutes(minute + addend);
        }
        break;
      case "second":
        {
          const second = date.getSeconds();
          date.setSeconds(second + addend);
        }
        break;
      case "millis":
        {
          const millis = date.getMilliseconds();
          date.setMilliseconds(millis + addend);
        }
        break;
    }
    text = format(date, dateFormat);
    const cursor = this.determineCursorPos(text, this.kind) ?? text.length;
    return Promise.resolve({ text, cursor });
  }
}

export function augendDate(config: AugendConfigDate): Augend {
  const onlyValid = config["only_valid"] ?? false;

  switch (config.format) {
    case "yyyy/MM/dd": {
      const determineDateKind = (_: string, cursor: number | null) => {
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
      const determineCursorPos = (_: string, item: DateKind) => {
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
        /\d{4}\/\d{2}\/\d{2}/g,
        "yyyy/MM/dd",
        determineDateKind,
        determineCursorPos,
        onlyValid,
      );
    }

    case "yyyy-MM-dd": {
      const determineDateKind = (_: string, cursor: number | null) => {
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
      const determineCursorPos = (_: string, item: DateKind) => {
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
        /\d{4}-\d{2}-\d{2}/g,
        "yyyy-MM-dd",
        determineDateKind,
        determineCursorPos,
        onlyValid,
      );
    }

    case "MM/dd": {
      const determineDateKind = (_: string, cursor: number | null) => {
        if (cursor == null) {
          return "day";
        }
        if (cursor > 0 && cursor <= 2) {
          return "month";
        }
        return "day";
      };
      const determineCursorPos = (_: string, item: DateKind) => {
        switch (item) {
          case "month":
            return 2;
          default:
            break;
        }
      };
      return new AugendDate(
        /\d{2}\/\d{2}/g,
        "MM/dd",
        determineDateKind,
        determineCursorPos,
        onlyValid,
      );
    }

    case "M/d": {
      const determineDateKind = (text: string, cursor: number | null) => {
        if (cursor == null) {
          return "day";
        }
        const slash = text.search("/");
        if (cursor > 0 && cursor <= slash) {
          return "month";
        }
        return "day";
      };
      const determineCursorPos = (text: string, item: DateKind) => {
        switch (item) {
          case "month": {
            const slash = text.search("/");
            return slash;
          }
          default:
            break;
        }
      };
      return new AugendDate(
        /\d{1,2}\/\d{1,2}/g,
        "M/d",
        determineDateKind,
        determineCursorPos,
        onlyValid,
      );
    }

    case "HH:mm:ss": {
      const determineDateKind = (_: string, cursor: number | null) => {
        if (cursor == null) {
          return "second";
        }
        if (cursor > 0 && cursor <= 2) {
          return "hour";
        }
        if (cursor > 2 && cursor <= 5) {
          return "minute";
        }
        return "second";
      };
      const determineCursorPos = (_: string, item: DateKind) => {
        switch (item) {
          case "hour":
            return 2;
          case "minute":
            return 5;
          default:
            break;
        }
      };
      return new AugendDate(
        /\d{2}:\d{2}:\d{2}/g,
        "HH:mm:ss",
        determineDateKind,
        determineCursorPos,
        onlyValid,
      );
    }

    case "HH:mm": {
      const determineDateKind = (_: string, cursor: number | null) => {
        if (cursor == null) {
          return "minute";
        }
        if (cursor > 0 && cursor <= 2) {
          return "hour";
        }
        return "minute";
      };
      const determineCursorPos = (_: string, item: DateKind) => {
        switch (item) {
          case "hour":
            return 2;
          default:
            break;
        }
      };
      return new AugendDate(
        /\d{2}:\d{2}/g,
        "HH:mm",
        determineDateKind,
        determineCursorPos,
        onlyValid,
      );
    }
  }
}
