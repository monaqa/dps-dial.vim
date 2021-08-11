import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import { execute } from "https://deno.land/x/denops_std@v1.0.0/helper/mod.ts";
import { globals } from "https://deno.land/x/denops_std@v1.0.0/variable/mod.ts";
import {
ensureBoolean,
  ensureNumber,
  ensureString,
} from "https://deno.land/x/unknownutil@v1.1.0/mod.ts";
import {
  Augend,
  Direction,
  ensureDirection,
  TextRange,
} from "./type.ts";
import * as fn from "https://deno.land/x/denops_std@v1.0.0/function/mod.ts";
import { toByteIdx, toStringIdx } from "./util.ts";
import { AugendConfig, generateAugendConfig } from "./augend.ts";

// dps-dial.vim の中核をなす処理を記述する。
// Denops インスタンスを内部に持たないため、
// Vim に関する副作用は augend 内部の実装で行わない限り一切起こせない。
class DialHandler {
  // ユーザ指定されたカウンタの値。
  private count: number;
  // テキストオブジェクトとして指定する範囲。
  private range: TextRange | null;
  // 現在アクティブな augend.
  private activeAugend: Augend | null;
  // 現在有効な（<C-a> などを押したときに候補として考慮される） augend のリスト。
  private augendCandidates: Augend[];

  constructor(augendCandidates: Augend[]) {
    this.count = 1;
    this.range = null;
    this.activeAugend = null;
    this.augendCandidates = augendCandidates;
  }

  setCount(n: number) {
    this.count = n;
  }

  getAddend(direction: Direction): number {
    return (direction === "increment") ? this.count : -this.count;
  }

  getRange(): TextRange | null {
    return this.range;
  }

  setRange(range: TextRange | null) {
    this.range = range;
  }

  getActiveAugend(): Augend | null {
    return this.activeAugend;
  }

  setActiveAugend(augend: Augend) {
    this.activeAugend = augend;
  }

  getAugends(): Augend[] {
    return this.augendCandidates;
  }

  // 現在行、カーソル位置、カウンタの値を受け取り、
  // 最適な augend を選んで count, activeAugend を更新する。
  // <C-a> や <C-x> が呼ばれた場合はこの関数も呼ばれるが、
  // ドットリピートのときはこの処理が飛ばされる。
  async selectAugend(
    line: string,
    cursor: number,
    count: number,
    customAugends?: Augend[],
  ) {
    this.count = count;
    const augends = customAugends ?? this.augendCandidates;

    let interimAugend = null;
    let interimScore: [number, number, number] = [3, 0, 0];

    for (const augend of augends) {
      let range = null;
      if (augend.findStateful === undefined) {
        range = await augend.find(line, cursor);
      } else {
        range = await augend.findStateful(line, cursor);
      }
      if (range === null) {
        continue;
      }

      /// cursor が range に含まれている場合は最優先 (0)
      /// cursor が range より手前にある場合は次に優先 (1)
      /// cursor が range より後ろにある場合は最も優先度が低い (2)
      const firstScore = (cursor > range.to)
        ? 2
        : ((cursor < range.from) ? 1 : 0);
      /// firstScore が同じなら、 range は前にあればあるほど優先度が高い
      const secondScore = range.from;
      /// secondScore も同じなら、range が広いほど優先度が高い
      const thirdScore = -range.to;
      const score: [number, number, number] = [
        firstScore,
        secondScore,
        thirdScore,
      ];

      if (this.isLessScore(score, interimScore)) {
        interimAugend = augend;
        interimScore = score;
      }
    }
    this.activeAugend = interimAugend;
  }

  // スコアを辞書式に比較する。
  private isLessScore(
    x: [number, number, number],
    y: [number, number, number],
  ): boolean {
    if (x[0] < y[0]) return true;
    if (x[0] > y[0]) return false;
    if (x[1] < y[1]) return true;
    if (x[1] > y[1]) return false;
    if (x[2] < y[2]) return true;
    if (x[2] > y[2]) return false;
    return false;
  }

  // 対象行、選択範囲、カーソル位置、増減の方向を受け取り、
  // 現在の count, range, activeAugend に基づいて検索 + 増減を行い、
  // 結果得られる新しい行とカーソル位置を返す。
  // ただし、行内容に更新がないときは line フィールドは無い。
  // 同様にカーソル位置に変更がないときは cursor フィールドは無い。
  async operateVisual(
    line: string,
    selectedRange: { from: number; to?: number },
    direction: Direction,
    tier?: number,
  ): Promise<{ line?: string }> {
    if (this.activeAugend === null) {
      return {};
    }
    tier = tier ?? 1;
    const { from: selectedFrom, to: selectedTo } = selectedRange;
    const selectedFromUtf16 = toStringIdx(line, selectedFrom);
    const selectedToUtf16 = (selectedTo === undefined)
      ? line.length
      : toStringIdx(line, selectedTo);
    const linePartial = line.substring(selectedFromUtf16, selectedToUtf16 + 1);
    const range = await this.activeAugend.find(linePartial, 0);
    if (range === null) {
      return {};
    }
    const addend = this.getAddend(direction);
    const fromUtf16 = selectedFromUtf16 + toStringIdx(linePartial, range.from);
    const toUtf16 = selectedFromUtf16 + toStringIdx(linePartial, range.to);
    const text = line.substring(fromUtf16, toUtf16);
    const addResult = await this.activeAugend.add(
      text,
      addend * tier,
      selectedFromUtf16 - fromUtf16,
    );
    console.log({ line, fromUtf16, toUtf16, text, addResult });
    let newLine = undefined;
    if (addResult.text !== undefined) {
      newLine = this.replaceRange(line, fromUtf16, toUtf16, addResult.text);
    }
    return { line: newLine };
  }

  // 現在行、カーソル位置、増減の方向を受け取り、
  // 現在の count, range, addOperation に基づいて新しい行とカーソル位置を返す。
  // ただし、行内容に更新がないときは line フィールドは無い。
  // 同様にカーソル位置に変更がないときは cursor フィールドは無い。
  async operate(
    line: string,
    cursor: number,
    direction: Direction,
  ): Promise<{ line?: string; cursor?: number }> {
    if (this.range === null) {
      return {};
    }
    if (this.activeAugend === null) {
      return {};
    }
    const { from, to } = this.range;
    const fromUtf16 = toStringIdx(line, from);
    const toUtf16 = toStringIdx(line, to);
    const text = line.substr(fromUtf16, toUtf16 - fromUtf16);
    const addend = this.getAddend(direction);
    const addResult = await this.activeAugend.add(text, addend, cursor);
    let newLine = undefined;
    let newCursor = undefined;
    if (addResult.text !== undefined) {
      newLine = this.replaceRange(line, fromUtf16, toUtf16, addResult.text);
    }
    if (addResult.cursor !== undefined) {
      newCursor = from + addResult.cursor;
    }
    return { line: newLine, cursor: newCursor };
  }

  private replaceRange(
    s: string,
    start: number,
    end: number,
    substitute: string,
  ): string {
    return s.substr(0, start) + substitute + s.substr(end);
  }

  // 現在行、カーソル位置をもとに、現在の activeAugend に基づいて変更対象の range を更新する。
  // その結果、range が null になることもある。
  async findTextRange(line: string, cursor: number) {
    if (this.activeAugend === null) {
      this.range = null;
      return;
    }
    this.range = await this.activeAugend.find(line, cursor);
  }
}

export async function main(denops: Denops): Promise<void> {
  // const configarray = await globals.get(denops, "dps_dial#augends", []) as AugendConfig[];
  // const augends = (configarray ?? []).map((conf) => generateAugendConfig(denops, conf));
  const dialHandler = new DialHandler([]);

  denops.dispatcher = {
    async selectAugendNormal(count: unknown, register: unknown): Promise<void> {
      ensureString(register);
      ensureNumber(count);
      const col = await fn.col(denops, ".");
      const line = await fn.getline(denops, ".");

      const varName = (['"', "+", "*"].includes(register))
        ? `dps_dial#augends`
        : `dps_dial#augends#register#${register}`;
      const configarray = await globals.get(
        denops,
        varName,
        [],
      ) as AugendConfig[];
      const augends = (configarray ?? []).map((conf) =>
        generateAugendConfig(denops, conf)
      );
      await dialHandler.selectAugend(line, col, count, augends);

      return Promise.resolve();
    },

    async selectAugendVisual(count: unknown, register: unknown): Promise<void> {
      ensureString(register);
      ensureNumber(count);

      const mode = await fn.mode(denops, 0) as "v" | "V" | "\x16";
      const c1 = await fn.getpos(denops, "v");
      const c2 = await fn.getpos(denops, ".");

      let text: string;
      switch (mode) {
        case "v": {
          const lineNum = Math.min(c1[1], c2[1]);
          text = await fn.getline(denops, lineNum);
          if (c1[1] == c2[1]) {
            text = text.substring(
              toStringIdx(text, Math.min(c1[2], c2[2])) - 1,
              toStringIdx(text, Math.max(c1[2], c2[2])),
            );
            console.log({ text });
          } else {
            text = text.substr(toStringIdx(text, c1[2]) - 1);
          }
          break;
        }

        case "V": {
          const lineNum = Math.min(c1[1], c2[1]);
          text = await fn.getline(denops, lineNum);
          break;
        }

        case "\x16": {
          const lineNum = Math.min(c1[1], c2[1]);
          const cs = Math.min(c1[2], c2[2]);
          const ce = Math.max(c1[2], c2[2]);
          text = await fn.getline(denops, lineNum);
          text = text.substring(
            toStringIdx(text, cs) - 1,
            toStringIdx(text, ce),
          );
          break;
        }
      }

      const varName = (['"', "+", "*"].includes(register))
        ? `dps_dial#augends`
        : `dps_dial#augends#register#${register}`;
      const configarray = await globals.get(
        denops,
        varName,
        [],
      ) as AugendConfig[];
      const augends = (configarray ?? []).map((conf) =>
        generateAugendConfig(denops, conf)
      );
      await dialHandler.selectAugend(text, 0, count, augends);

      return Promise.resolve();
    },

    async operatorNormal(_type: unknown, direction: unknown): Promise<void> {
      ensureDirection(direction);
      const col = await fn.col(denops, ".");
      const lineNum = await fn.line(denops, ".");
      const line = await fn.getline(denops, ".");

      const result = await dialHandler.operate(line, col, direction);

      if (result.line !== undefined) {
        await fn.setline(denops, ".", result.line);
      }
      if (result.cursor !== undefined) {
        await fn.cursor(denops, lineNum, result.cursor);
      }

      return Promise.resolve();
    },

    async operatorVisual(_type: unknown, direction: unknown, stairlike: unknown): Promise<void> {
      ensureDirection(direction);
      ensureBoolean(stairlike);
      // 一度 VISUAL モードを抜けてしまうらしい
      const mode = await fn.visualmode(denops, 0) as "v" | "V" | "\x16";
      const pos1 = await fn.getpos(denops, "'[");
      const pos2 = await fn.getpos(denops, "']");

      let tier = 1;

      // 1行に対して行の置換処理を行う関数
      async function replaceText(
        lnum: number,
        range: { from: number; to?: number },
        direction: Direction,
      ) {
        const line = await fn.getline(denops, lnum);
        const result = await dialHandler.operateVisual(line, range, direction, tier);
        if (result.line !== undefined) {
          await fn.setline(denops, lnum, result.line);
          if (stairlike) {
            tier++;
          }
        }
      }

      // 行ごとに順に置換処理を行っていく
      const posStart = (pos1[1] < pos2[1]) ? pos1 : pos2;
      const posEnd = (pos1[1] < pos2[1]) ? pos2 : pos1;
      switch (mode) {
        case "v": {
          if (pos1[1] == pos2[1]) {
            await replaceText(pos1[1], {
              from: Math.min(pos1[2], pos2[2]) - 1,
              to: Math.max(pos1[2], pos2[2]) - 1,
            }, direction);
          } else {
            let lnum = posStart[1];
            await replaceText(lnum, { from: posStart[2] - 1 }, direction);
            lnum++;
            for (lnum; lnum < posEnd[1]; lnum++) {
              await replaceText(lnum, { from: 0 }, direction);
            }
            await replaceText(
              posEnd[1],
              { from: 0, to: posEnd[2] - 1 },
              direction,
            );
          }
          break;
        }
        case "V": {
          for (let lnum = posStart[1]; lnum <= posEnd[1]; lnum++) {
            await replaceText(lnum, { from: 0 }, direction);
          }
          break;
        }
        case "\x16": {
          const colStart = (pos1[2] < pos2[2]) ? pos1[2] : pos2[2];
          const colEnd = (pos1[2] < pos2[2]) ? pos2[2] : pos1[2];
          for (let lnum = posStart[1]; lnum <= posEnd[1]; lnum++) {
            await replaceText(
              lnum,
              { from: colStart - 1, to: colEnd - 1 },
              direction,
            );
          }
          break;
        }
      }

      return Promise.resolve();
    },

    async textobj(count: unknown): Promise<void> {
      ensureNumber(count);
      if (count != 0) {
        // count が非 0 の値となるのは、ドットリピートでカウンタを明示したとき。
        dialHandler.setCount(count);
      }
      const col = await fn.col(denops, ".");
      const line = await fn.getline(denops, ".");

      await dialHandler.findTextRange(line, col);

      return Promise.resolve();
    },
  };

  const cmdSelectNormal =
    `<Cmd>call denops#request("${denops.name}", "selectAugendNormal", [v:count1, v:register])<CR>`;
  const cmdSelectVisual =
    `<Cmd>call denops#request("${denops.name}", "selectAugendVisual", [v:count1, v:register])<CR>`;
  const cmdTextobj =
    `<Cmd>call denops#request("${denops.name}", "textobj", [v:count])<CR>`;
  function cmdOperator(
    direction: "increment" | "decrement",
    mode: "normal" | "visual" | "gvisual",
  ) {
    return `<Cmd>let &opfunc="dps_dial#operator_${direction}_${mode}"<CR>g@`;
  }

  await execute(
    denops,
    `
    nnoremap <Plug>(dps-dial-increment) ${cmdSelectNormal}${
      cmdOperator("increment", "normal")
    }${cmdTextobj}
    nnoremap <Plug>(dps-dial-decrement) ${cmdSelectNormal}${
      cmdOperator("decrement", "normal")
    }${cmdTextobj}
    xnoremap <Plug>(dps-dial-increment) ${cmdSelectVisual}${
      cmdOperator("increment", "visual")
    }
    xnoremap <Plug>(dps-dial-decrement) ${cmdSelectVisual}${
      cmdOperator("decrement", "visual")
    }
    xnoremap g<Plug>(dps-dial-increment) ${cmdSelectVisual}${
      cmdOperator("increment", "gvisual")
    }
    xnoremap g<Plug>(dps-dial-decrement) ${cmdSelectVisual}${
      cmdOperator("decrement", "gvisual")
    }
    `,
  );
}
