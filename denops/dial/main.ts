import { Denops } from "https://deno.land/x/denops_std@v1.0.0/mod.ts";
import { execute } from "https://deno.land/x/denops_std@v1.0.0/helper/mod.ts";
import { globals } from "https://deno.land/x/denops_std@v1.0.0/variable/mod.ts";
import { ensureNumber } from "https://deno.land/x/unknownutil@v1.1.0/mod.ts";
import {
  AddOperation,
  Augend,
  Direction,
  ensureDirection,
  FindResult,
  TextRange,
} from "./type.ts";
import * as fn from "https://deno.land/x/denops_std@v1.0.0/function/mod.ts";
import { toStringIdx } from "./util.ts";
import {
  defaultAugendConfigs,
  ensureAugendConfigs,
  generateAugendConfig,
} from "./augend.ts";

// dps-dial.vim の中核をなす処理を記述する。
// Denops インスタンスを内部に持たないため、
// Vim に関する副作用は augend 内部の実装で行わない限り一切起こせない。
class DialHandler {
  // ユーザ指定されたカウンタの値。
  private count: number;
  // テキストオブジェクトとして指定する範囲。
  private range: TextRange | null;
  // オペレータとして実際に行うテキスト編集。
  private addOperation: AddOperation | null;
  // 現在アクティブな augend.
  private activeAugend: Augend;
  // 現在有効な（<C-a> などを押したときに候補として考慮される） augend のリスト。
  private augendCandidates: Augend[];

  constructor(augendCandidates: Augend[]) {
    this.count = 1;
    this.range = null;
    this.addOperation = null;
    this.activeAugend = (_line, _cursor) => null;
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

  getAddOperation(): AddOperation | null {
    return this.addOperation;
  }

  setAddOperation(addOperation: AddOperation | null) {
    this.addOperation = addOperation;
  }

  getActiveAugend(): Augend {
    return this.activeAugend;
  }

  setActiveAugend(augend: Augend) {
    this.activeAugend = augend;
  }

  getAugendCandidates(): Augend[] {
    return this.augendCandidates;
  }

  setAugendCandidates(augends: Augend[]) {
    this.augendCandidates = augends;
  }

  // 現在行、カーソル位置、カウンタの値を受け取り、
  // 最適な augend を選んで count, activeAugend, addOperation を更新する。
  // <C-a> や <C-x> が呼ばれた場合はこの関数も呼ばれるが、
  // ドットリピートのときはこの処理が飛ばされる。
  selectAugend(line: string, cursor: number, count: number) {
    this.count = count;

    let interimAugend = null;
    let interimScore: [number, number, number] = [3, 0, 0];
    let interimResult = null;

    for (const augend of this.augendCandidates) {
      const result = augend(line, cursor);
      if (result === null) {
        continue;
      }
      const range = result.range;

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
        interimResult = result;
        interimScore = score;
      }
    }
    if (interimAugend === null) {
      return;
    }
    this.activeAugend = interimAugend;
    // interimAugend が非 null 値を持つ時点で interimResult には値が入っているので安全。
    this.addOperation = (interimResult as FindResult).add;
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

  // 現在行、カーソル位置、増減の方向を受け取り、
  // 現在の count, range, addOperation に基づいて新しい行とカーソル位置を返す。
  // ただし、行内容に更新がないときは line フィールドは無い。
  // 同様にカーソル位置に変更がないときは cursor フィールドは無い。
  operate(
    line: string,
    cursor: number,
    direction: Direction,
  ): { line?: string; cursor?: number } {
    if (this.range === null || this.addOperation === null) {
      return {};
    }
    const { from, to } = this.range;
    const fromUtf16 = toStringIdx(line, from);
    const toUtf16 = toStringIdx(line, to);
    const text = line.substr(fromUtf16, toUtf16 - fromUtf16);
    const addend = this.getAddend(direction);
    const addResult = this.addOperation(text, cursor, addend);
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
  findTextRange(line: string, cursor: number) {
    const result = this.activeAugend(line, cursor);
    if (result === null) {
      this.range = null;
    } else {
      this.range = result.range;
    }
  }
}

export async function main(denops: Denops): Promise<void> {
  let augends: Augend[] = [];

  try {
    const configarray = await globals.get(denops, "dps_dial#augends");
    ensureAugendConfigs(configarray);
    augends = configarray.map(generateAugendConfig);
  } catch (e) {
    console.error(e)
    augends = defaultAugendConfigs.map(generateAugendConfig);
  }

  const dialHandler = new DialHandler(augends);

  denops.dispatcher = {
    async selectAugend(count: unknown): Promise<void> {
      ensureNumber(count);
      const col = await fn.col(denops, ".");
      const line = await fn.getline(denops, ".");

      dialHandler.selectAugend(line, col, count);

      return Promise.resolve();
    },

    async operator(_type: unknown, direction: unknown): Promise<void> {
      ensureDirection(direction);
      const col = await fn.col(denops, ".");
      const lineNum = await fn.line(denops, ".");
      const line = await fn.getline(denops, ".");

      const result = dialHandler.operate(line, col, direction);

      if (result.line !== undefined) {
        await fn.setline(denops, ".", result.line);
      }
      if (result.cursor !== undefined) {
        await fn.cursor(denops, lineNum, result.cursor);
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

      dialHandler.findTextRange(line, col);

      return Promise.resolve();
    },
  };

  const cmdSelect =
    `<Cmd>call denops#request("${denops.name}", "selectAugend", [v:count1])<CR>`;
  const cmdTextobj =
    `<Cmd>call denops#request("${denops.name}", "textobj", [v:count])<CR>`;
  function cmdOperator(direction: "increment" | "decrement") {
    return `<Cmd>let &opfunc="dps_dial#operator_${direction}"<CR>g@`;
  }

  await execute(
    denops,
    `
    nnoremap <Plug>(dps-dial-increment) ${cmdSelect}${
      cmdOperator("increment")
    }${cmdTextobj}
    nnoremap <Plug>(dps-dial-decrement) ${cmdSelect}${
      cmdOperator("decrement")
    }${cmdTextobj}
    `,
  );
}
