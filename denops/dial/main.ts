import { Denops, ensureNumber, execute, fn, isString } from "./deps.ts";
import { addOperation, Augend, augendDate, augendDecimalNumber, findResult, textRange, toByteIdx, toStringIdx } from "./augend.ts";

export async function main(denops: Denops): Promise<void> {
  function isDirection(x: unknown): x is "increment" | "decrement" {
    return isString(x) && (x === "increment" || x === "decrement");
  }

  let dialCount = 1;
  let range: textRange | null = null;
  let addOperation: addOperation | null = null;
  const validAugends: Augend[] = [
    augendDecimalNumber,
    augendDate
  ];
  let activeAugend: Augend = augendDate;

  function replaceRange(
    s: string,
    start: number,
    end: number,
    substitute: string,
  ) {
    return s.substr(0, start) + substitute + s.substr(end);
  }

  denops.dispatcher = {
    async selectAugend(count: unknown): Promise<unknown> {
      // counter の登録
      ensureNumber(count);
      dialCount = count;

      const col = await fn.col(denops, ".") as number;
      const line = await fn.getline(denops, ".");
      const cursor = toStringIdx(line, col);

      activeAugend = augendDate;
      const findResult = activeAugend.find(line, cursor);
      if (findResult !== null) {
        addOperation = findResult.add;
      }
      return Promise.resolve();
    },

    async operator(_type: unknown, direction: unknown): Promise<unknown> {
      if (!isDirection(direction)) {
        throw new Error("direction must be 'increment' or 'decrement'.");
      }
      if (range === null || addOperation === null) {
        return Promise.resolve();
      }
      const { from, to } = range;

      const line = await fn.getline(denops, ".");
      const text = line.substr(from, to);
      const addend = (direction == "increment") ? dialCount : -dialCount;
      const addResult = addOperation(
        text,
        addend,
      );
      if (addResult === null) {
        return Promise.resolve();
      }
      const newLine = replaceRange(
        line,
        range.from,
        range.to,
        addResult.text,
      );
      await fn.setline(denops, ".", newLine);
      fn.cursor(denops, ".", toByteIdx(line, range.from + addResult.cursor));

      return Promise.resolve();
    },

    async textobj(): Promise<unknown> {
      const col = await fn.col(denops, ".") as number;
      const line = await fn.getline(denops, ".");
      const cursor = toStringIdx(line, col);
      const findResult = activeAugend.find(line, cursor);
      if (findResult === null) {
        range = null;
        return Promise.resolve();
      }
      console.log(findResult);
      range = findResult.range;
      return Promise.resolve();
    },
  };

  const cmdSelect =
    `<Cmd>call denops#request("${denops.name}", "selectAugend", [v:count1])<CR>`;
  const cmdTextobj =
    `<Cmd>call denops#request("${denops.name}", "textobj", [])<CR>`;
  function cmdOperator(direction: "increment" | "decrement") {
    return `<Cmd>let &opfunc="dps_dial#operator_${direction}"<CR>g@`;
  }

  await execute(
    denops,
    `
    nnoremap <Space>a ${cmdSelect}${cmdOperator("increment")}${cmdTextobj}
    nnoremap <Space>x ${cmdSelect}${cmdOperator("decrement")}${cmdTextobj}
    `,
  );
}
