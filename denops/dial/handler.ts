import { Augend, Direction, TextRange } from "./type.ts";
import { toStringIdx } from "./util.ts";

/**
 * dps-dial.vim の中核をなす処理を記述する。
 * Denops インスタンスを内部に持たないため、
 * Vim に関する副作用は augend 内部の実装で行わない限り一切起こせない。
 */
export class DialContextHandler {
  /** ユーザ指定されたカウンタの値。*/
  private count: number;
  /** テキストオブジェクトとして指定する範囲。 */
  private range: TextRange | null;
  // 現在アクティブな augend.
  private activeAugend: Augend | null;
  // 現在有効な（<C-a> などを押したときに候補として考慮される） augend のリスト。
  private augendCandidates: Augend[];

  constructor() {
    this.count = 1;
    this.range = null;
    this.activeAugend = null;
    this.augendCandidates = [];
  }

  /**
   * this.count の値を見て addend を取得する。
   * direction が "increment" なら this.count を、"decrement" なら -this.count を返す。
   */
  private getAddend(direction: Direction): number {
    return (direction === "increment") ? this.count : -this.count;
  }

  /**
   * this.count の値を n にセットする。
   */
  setCount(n: number) {
    this.count = n;
  }

  /**
   * 現在行、カーソル位置、カウンタの値を受け取り、
   * 最適な augend を選んで count, activeAugend を更新する。
   * <C-a> や <C-x> が呼ばれた場合はこの関数も呼ばれるが、
   * ドットリピートのときはこの処理が飛ばされる。
   */
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

  /** スコアを辞書式に比較する。 */
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
    let newLine = undefined;
    if (addResult.text !== undefined) {
      newLine = this.replaceRange(line, fromUtf16, toUtf16, addResult.text);
    }
    return { line: newLine };
  }

  /**
   * 現在行、カーソル位置、増減の方向を受け取り、
   * 現在の count, range, addOperation に基づいて新しい行とカーソル位置を返す。
   * ただし、行内容に更新がないときは line フィールドは無い。
   * 同様にカーソル位置に変更がないときは cursor フィールドは無い。
   */
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

  /**
   * 現在行、カーソル位置をもとに、現在の activeAugend に基づいて変更対象の range を更新する。
   * その結果、range が null になることもある。
   */
  async findTextRange(line: string, cursor: number) {
    if (this.activeAugend === null) {
      this.range = null;
      return;
    }
    this.range = await this.activeAugend.find(line, cursor);
  }
}

