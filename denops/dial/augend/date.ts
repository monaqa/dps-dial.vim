import { format, parse } from "https://deno.land/std@0.103.0/datetime/mod.ts";
import { Augend } from "../type.ts";

class AugendDate implements Augend {
  kind: "year" | "month" | "day";

  constructor() {
    this.kind = "day";
  }

  find(line: string, cursor: number) {
    const re = /(\d{4})\/(\d{2})\/(\d{2})/g;
    const matches = line.matchAll(re);

    for (const match of matches) {
      if (match.index === undefined) {
        continue;
      }
      const matchText = match[0];
      const endpos = match.index + matchText.length;
      if (endpos >= cursor) {
        const from = match.index;
        const to = endpos;
        return Promise.resolve({ from, to });
      }
    }
    return Promise.resolve(null);
  }

  findStateful(line: string, cursor: number) {
    const re = /(\d{4})\/(\d{2})\/(\d{2})/g;
    const matches = line.matchAll(re);

    for (const match of matches) {
      if (match.index === undefined) {
        continue;
      }
      const matchText = match[0];
      const endpos = match.index + matchText.length;
      if (endpos >= cursor) {
        const from = match.index;
        const to = endpos;
        const relCursor = cursor - match.index;
        if (relCursor >= 0 && relCursor <= 4) {
          this.kind = "year";
        } else if (relCursor > 4 && relCursor <= 7) {
          this.kind = "month";
        } else {
          this.kind = "day";
        }
        return Promise.resolve({ from, to });
      }
    }
    return Promise.resolve(null);
  }

  add(text: string, _cursor: number, addend: number) {
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
