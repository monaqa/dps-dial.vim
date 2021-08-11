import { ensure, isString } from "./deps.ts";

export type Direction = "increment" | "decrement";

export function isDirection(x: unknown): x is Direction {
  return isString(x) && (x === "increment" || x === "decrement");
}

export function ensureDirection(x: unknown): asserts x is Direction {
  ensure(x, isDirection, "direction must be 'increment' or 'decrement'.");
}

// export type Augend = (line: string, cursor: number) => FindResult | null;
export interface Augend {
  find(line: string, cursor: number): Promise<TextRange | null>;
  add: AddOperation;
  findStateful?(line: string, cursor: number): Promise<TextRange | null>;
}

export const dummyAugend: Augend = {
  find(_line, _cursor) {
    return Promise.resolve(null);
  },
  add(_text, _cursor, _addend) {
    return Promise.resolve({});
  },
};

export type TextRange = { from: number; to: number };

export type AddOperation = (
  text: string,
  addend: number,
  cursor?: number,
) => Promise<AddResult>;
export type AddResult = { text?: string; cursor?: number };
