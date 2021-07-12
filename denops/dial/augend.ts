/*
 * 被加数の型や被加数そのものの定義。
 */

import { format, parse } from "./deps.ts"

// let moment: moment.Moment = moment();

export type findResult = { range: textRange; add: addOperation };
export type addOperation = (
  text: string,
  addend: number,
) => { text: string; cursor: number } | null;
export type textRange = { from: number; to: number };

export type Augend = {
  desc: string;
  find(
    line: string,
    cursor: number,
  ): findResult | null;
};

/// 文字列のインデックスをバイトインデックスに変換する。
export function toByteIdx(line: string, idx: number) {
  const text = line.substr(0, idx);
  return (new TextEncoder()).encode(text).length;
}

/// バイトインデックスを文字列のインデックスに変換する。
export function toStringIdx(line: string, idx: number) {
  const encodedValues = (new TextEncoder()).encode(line).subarray(0, idx);
  return (new TextDecoder()).decode(encodedValues).length;
}

export const augendDecimalNumber: Augend = {
  desc: "Decimal nonnegative number.",
  find(line, cursor) {
    const re = /\d+/g;
    const matches = line.matchAll(re);
    let range = null;
    for (const match of matches) {
      if (match.index === undefined) {
        continue;
      }
      const matchText = match[0];
      const endpos = match.index + matchText.length;
      if (endpos >= cursor) {
        const from = match.index;
        const to = endpos;
        console.log({matchText, from, to})
        range = { from, to };
        break;
      }
    }
    if (range === null) {
      return null;
    }

    function add(text: string, addend: number) {
      let num = parseInt(text);
      num = num + addend;
      text = String(num);
      return { text, cursor: text.length };
    }

    return { range, add };
  },
};

export const augendDate: Augend = {
  desc: "'2021/07/12' style date.",
  find(line, cursor) {
    const re = /(\d{4})\/(\d{2})\/(\d{2})/g;
    const matches = line.matchAll(re);
    let range = null;
    let kind: "year" | "month" | "day" = "day";

    for (const match of matches) {
      if (match.index === undefined) {
        continue;
      }
      const matchText = match[0];
      const endpos = match.index + matchText.length;
      if (endpos >= cursor) {
        const from = match.index;
        const to = endpos;
        console.log({matchText, from, to})
        const relCursor = cursor - match.index;
        if (relCursor >= 0 && relCursor <= 4) {
          kind = "year";
        }
        if (relCursor > 4 && relCursor <= 7) {
          kind = "month";
        }
        range = { from, to };
        break;
      }
    }
    if (range === null) {
      return null;
    }

    function add(text: string, addend: number) {
      let date: Date = parse(text, "yyyy/MM/dd");
      let cursor = text.length;
      switch (kind) {
        case "year": {
          const year = date.getFullYear();
          date.setFullYear(year + addend);
          cursor = 4;
        }
          break;
        case "month": {
          const month = date.getMonth();
          date.setMonth(month + addend);
          cursor = 7;
        }
          break;
        case "day": {
          const day = date.getDate();
          date.setDate(day + addend);
        }
          break;
      }
      text = format(date, "yyyy/MM/dd");
      return { text, cursor };
    }

    return { range, add };
  },
};
