import { ensure, isString } from "./deps.ts";

/**
 * ユーザが <C-a> を押しているか <C-x> を押しているか。
 */
export type Direction = "increment" | "decrement";

export function isDirection(x: unknown): x is Direction {
  return isString(x) && (x === "increment" || x === "decrement");
}

export function ensureDirection(x: unknown): asserts x is Direction {
  ensure(x, isDirection, "direction must be 'increment' or 'decrement'.");
}

/**
 * 被加数のルールを定める interface。
 *
 * このメソッドを実装するものはすべて被加数とみなせる。
 */
export interface Augend {
  /**
   * 対象のカーソル行とカーソル位置が与えられたときに、
   * 自身の定める被加数のルールを満たす文字列があれば、その範囲を返却する。
   */
  find(line: string, cursor: number | null): Promise<TextRange | null>;

  /**
   * 実際に加算を行う。
   */
  add: AddOperation;

  /**
   * 基本的には find と同じで省略可能。
   *
   * しかし、こちらは <C-a> や <C-x> を実施したときに
   * （augend rule 決定のタイミングで）呼び出されるものの、
   * ドットリピートのときには呼び出されない。
   */
  findStateful?(line: string, cursor: number | null): Promise<TextRange | null>;
}

export type TextRange = { from: number; to: number };

/**
 * 増減対象の文字列、加数、そしてカーソル位置が与えられたときに、
 * 増減後のテキスト及び新たなカーソル位置を返す。
 * なお戻り値の text 及び cursor メンバは省略することができ、
 * 省略した場合は入力から変化がないことを表す。
 */
export type AddOperation = (
  text: string,
  addend: number,
  cursor: number | null,
) => Promise<AddResult>;

export type AddResult = { text?: string; cursor?: number };
