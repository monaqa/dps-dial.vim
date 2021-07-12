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

      let interimAugend = null;
      // 小さいほど優先度が高い。初期値は何よりも優先されない値。
      let interimScore: [number, number, number] = [3, 0, 0];
      let interimResult = null;
      for (const augend of validAugends) {
        const result = augend.find(line, cursor);
        if (result === null ) {
          continue;
        }
        const range = result.range;

        /// cursor が range に含まれている場合は最優先 (0)
        /// cursor が range より手前にある場合は次に優先 (1)
        /// cursor が range より後ろにある場合は最も優先度が低い (2)
        const firstScore = (cursor > range.to) ? 2 : (( cursor < range.from ) ? 1 : 0);
        /// firstScore が同じなら、 range は前にあればあるほど優先度が高い
        const secondScore = range.from;
        /// secondScore も同じなら、range が広いほど優先度が高い
        const thirdScore = -range.to;
        const score: [number, number, number] = [firstScore, secondScore, thirdScore];
        if (score < interimScore) {
          interimAugend = augend;
          interimResult = result;
          interimScore = score;
        }
      }

      if (interimAugend === null) {
        return Promise.resolve();
      }
      activeAugend = interimAugend;
      addOperation = (interimResult as findResult).add; // ここが null になることはロジック上ないはず
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
    nnoremap <Plug>(dps-dial-increment) ${cmdSelect}${cmdOperator("increment")}${cmdTextobj}
    nnoremap <Plug>(dps-dial-decrement) ${cmdSelect}${cmdOperator("decrement")}${cmdTextobj}
    `,
  );
}
