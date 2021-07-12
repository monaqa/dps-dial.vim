import { Denops, ensureNumber, execute, fn, isString } from "./deps.ts";
import { augendDecimalNumber, findResult, toByteIdx, toStringIdx } from "./augend.ts";

export async function main(denops: Denops): Promise<void> {
  function isDirection(x: unknown): x is "increment" | "decrement" {
    return isString(x) && (x === "increment" || x === "decrement");
  }

  let dialCount = 1;
  let findResult: findResult | null = null;

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

      // const line = await fn.getline(denops, ".");
      return Promise.resolve();
    },

    async operator(_type: unknown, direction: unknown): Promise<unknown> {
      if (!isDirection(direction)) {
        throw new Error("direction must be 'increment' or 'decrement'.");
      }

      // const regSave = await fn.getreg(denops, "@");
      // await execute(denops, "normal! `[v`]y");

      // const regText = await fn.getreg(denops, "@") as string;
      // console.log({ regText: regText });
      if (findResult === null) {
        return Promise.resolve();
      }
      const { from, to } = findResult.range;

      const line = await fn.getline(denops, ".");
      const text = line.substr(from, to);
      const addend = (direction == "increment") ? dialCount : -dialCount;
      const addResult = findResult.add(
        text,
        addend,
      );
      if (addResult === null) {
        return Promise.resolve();
      }
      const newLine = replaceRange(
        line,
        findResult.range.from,
        findResult.range.to,
        addResult.text,
      );
      await fn.setline(denops, ".", newLine);
      fn.cursor(denops, ".", toByteIdx(line, findResult.range.from + addResult.cursor));
      // await fn.setreg(denops, "@", text);
      // await execute(denops, "normal! `[v`]p");
      // await fn.setreg(denops, "@", regSave);

      return Promise.resolve();
    },

    async textobj(): Promise<unknown> {
      // const lnum = await fn.line(denops, ".") as number;
      const col = await fn.col(denops, ".") as number;
      const line = await fn.getline(denops, ".");
      const cursor = toStringIdx(line, col);
      findResult = augendDecimalNumber.find(line, cursor);
      console.log(findResult);
      // const line = await fn.getline(denops, ".");
      // console.log(lnum, col, line);
      // const match = augendDecimalNumber.find(line, col);
      // if (match === null) {
      //   return Promise.resolve();
      // }
      // await execute(denops, "normal! v");
      // await fn.cursor(denops, lnum, match.from + 1);
      // await execute(denops, "normal! o");
      // await fn.cursor(denops, lnum, match.to);
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

// aaaa  2691 bbb
// ああああ  3108  aaa
