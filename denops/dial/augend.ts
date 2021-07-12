/*
 * 被加数の型や被加数そのものの定義。
 */

export type findResult = { range: textRange; add: addOperation };
export type addOperation = (
  text: string,
  addend: number,
) => { text: string; cursor: number } | null;
export type textRange = { from: number; to: number };

type Augend = {
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
        // const from = toByteIdx(line, match.index);
        // const to = toByteIdx(line, endpos);
        const from = match.index;
        const to = endpos;
        console.log({matchText, from, to})
        range = { from, to };
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

// type Augend<T> = {
//   desc: string;
//   find: (
//     line: string,
//     cursor: number,
//   ) => { from: number; to: number; meta: T } | null;
//   add: (
//     text: string,
//     addend: number,
//     meta: T,
//   ) => { text: string; cursor: number };
// };
//
// export const augendDecimalNumber: Augend<undefined> = {
//   desc: "Decimal nonnegative integer.",
//   find(line: string, cursor: number) {
//     const re = /\d+/g;
//     const matches = line.matchAll(re);
//     for (const match of matches) {
//       if (match.index === undefined) {
//         continue;
//       }
//       console.log({ index: match.index, match: match[0], cursor: cursor });
//       if (match.index + match[0].length >= cursor) {
//         return {
//           from: match.index,
//           to: match.index + match[0].length,
//           meta: undefined,
//         };
//       }
//     }
//     return null;
//   },
//   add(text, addend, _) {
//     let num = parseInt(text);
//     num = num + addend;
//     text = String(num);
//     return {
//       text,
//       cursor: text.length,
//     };
//   },
// };
