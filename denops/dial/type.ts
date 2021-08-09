import {
  ensure,
  isString,
} from "https://deno.land/x/unknownutil@v1.1.0/mod.ts";

export type Direction = "increment" | "decrement";

export function isDirection(x: unknown): x is Direction {
  return isString(x) && (x === "increment" || x === "decrement");
}

export function ensureDirection(x: unknown): asserts x is Direction {
  ensure(x, isDirection, "direction must be 'increment' or 'decrement'.");
}

export type Augend = (line: string, cursor: number) => FindResult | null;

export type FindResult = { range: TextRange; add: AddOperation };

export type TextRange = { from: number; to: number };

export type AddOperation = (
  text: string,
  cursor: number,
  addend: number,
) => addResult;

export type addResult = { text?: string; cursor?: number };
