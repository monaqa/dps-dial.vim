import { findPatternAfterCursor } from "../augend.ts";
import { format, parse } from "../deps.ts";
import { Augend } from "../type.ts";

class AugendDate implements Augend {
  kind: "year" | "month" | "day";

  constructor() {
    this.kind = "day";
  }

  find(line: string, cursor: number | null) {
    const re = /(\d{4})\/(\d{2})\/(\d{2})/g;
    return Promise.resolve(findPatternAfterCursor(re)(line, cursor));
  }

  async findStateful(line: string, cursor: number | null) {
    const range = await this.find(line, cursor);
    if (range === null) {
      return Promise.resolve(null);
    }
    if (cursor === null) {
      this.kind = "day";
      return Promise.resolve(range);
    }
    const relCursor = cursor - range.from;
    if (relCursor > 0 && relCursor <= 4) {
      this.kind = "year";
    } else if (relCursor > 4 && relCursor <= 7) {
      this.kind = "month";
    } else {
      this.kind = "day";
    }
    return Promise.resolve(range);
  }

  add(text: string, addend: number, _cursor: number | null) {
    const dateFormat = "yyyy/MM/dd";
    const date: Date = parse(text, dateFormat);
    let cursor = text.length;
    switch (this.kind) {
      case "year":
        {
          const year = date.getFullYear();
          date.setFullYear(year + addend);
          cursor = 4;
        }
        break;
      case "month":
        {
          const month = date.getMonth();
          date.setMonth(month + addend);
          cursor = 7;
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
    return Promise.resolve({ text, cursor });
  }
}

export function augendDate(): Augend {
  return new AugendDate();
}
