import {
  buffers,
  Denops,
  ensureBoolean,
  ensureNumber,
  ensureString,
  execute,
  fn,
  globals,
} from "./deps.ts";

import { Augend, Direction, ensureDirection } from "./type.ts";
import { toStringIdx } from "./util.ts";
import {
  applyAlias,
  AugendConfigOrString,
  ensureAugendAliases,
  ensureAugendConfigOrStringList,
  generateAugendConfig,
} from "./augend.ts";
import { DialContextHandler } from "./handler.ts";

// default values
const defaultAugends = ["decimal", "date"];

/**
 * レジスタ名から augends を取り出す。
 */
async function extractRegisterInfo(
  denops: Denops,
  register: string,
): Promise<{ augends: Augend[]; isCumulative: boolean }> {
  const aliases = await globals.get(denops, "dps_dial#aliases", []) as unknown;
  ensureAugendAliases(aliases);

  let configarray: AugendConfigOrString[];
  if (register == "=") {
    configarray = [await denops.eval("@=") as string];
  } else {
    const buflocalVarName = (register.match(/[a-zA-Z]/) != null)
      ? `dps_dial_augends_register_${register.toLowerCase()}`
      : `dps_dial_augends`;
    const bufferAugendsConfig = await buffers.get(denops, buflocalVarName);
    if (bufferAugendsConfig == null) {
      const globalVarName = (register.match(/[a-zA-Z]/) != null)
        ? `dps_dial#augends#register#${register.toLowerCase()}`
        : `dps_dial#augends`;
      const globalAugendsConfig = await globals.get(
        denops,
        globalVarName,
        defaultAugends,
      ) as unknown;
      ensureAugendConfigOrStringList(globalAugendsConfig);
      configarray = globalAugendsConfig;
    } else {
      ensureAugendConfigOrStringList(bufferAugendsConfig);
      configarray = bufferAugendsConfig;
    }
  }
  const augends = configarray
    .map((confOrString) => applyAlias(confOrString, aliases))
    .map((conf) => generateAugendConfig(denops, conf));

  const isCumulative = register.match(/[A-Z0-9]/) != null;

  return Promise.resolve({ augends, isCumulative });
}

export async function main(denops: Denops): Promise<void> {
  const handler = DialContextHandler.createHandler();

  denops.dispatcher = {
    /**
     * 現在行 + カーソル位置の情報を元に増減すべき augend rule を決定する
     * handler.selectAugend() を呼び出す。
     *
     * ノーマルモードで呼び出される。
     */
    async selectAugendNormal(count: unknown, register: unknown): Promise<void> {
      ensureString(register);
      ensureNumber(count);
      const col = await fn.col(denops, ".");
      const line = await fn.getline(denops, ".");

      const info = await extractRegisterInfo(denops, register);
      await handler.selectAugend(
        line,
        col,
        count,
        info.augends,
        info.isCumulative,
      );

      return Promise.resolve();
    },

    /**
     * VISUAL 選択の最初の行の情報を元に増減すべき augend rule を決定する
     * handler.selectAugend() を呼び出す。
     *
     * ビジュアルモードで呼び出される。
     */
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

      const info = await extractRegisterInfo(denops, register);
      await handler.selectAugend(text, null, count, info.augends, false);

      return Promise.resolve();
    },

    /**
     * オペレータ処理。
     *
     * handler.operate() を呼び出し、得られた文字列やカーソル位置に基づいて
     * 実際のバッファを操作する。
     */
    async operatorNormal(_type: unknown, direction: unknown): Promise<void> {
      ensureDirection(direction);
      const col = await fn.col(denops, ".");
      const lineNum = await fn.line(denops, ".");
      const line = await fn.getline(denops, ".");

      const result = await handler.operate(line, col, direction);

      if (result.line !== undefined) {
        await fn.setline(denops, ".", result.line);
      }
      if (result.cursor !== undefined) {
        await fn.cursor(denops, lineNum, result.cursor);
      }

      return Promise.resolve();
    },

    /**
     * オペレータ処理。
     *
     * handler.operateVisual() を行ごとに呼び出し、実際のバッファを操作する。
     */
    async operatorVisual(
      _type: unknown,
      direction: unknown,
      stairlike: unknown,
    ): Promise<void> {
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
        const result = await handler.operateVisual(
          line,
          range,
          direction,
          tier,
        );
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

    /**
     * テキストオブジェクト。
     *
     * 現在の行の情報を元に範囲を選択する handler.findTextRange() を呼び出す。
     * また、ドットリピートの際は指定されたカウンタの値を受け取って加数を更新する。
     */
    async textobj(count: unknown): Promise<void> {
      ensureNumber(count);
      if (count != 0) {
        // count が非 0 の値となるのは、ドットリピートでカウンタを明示したとき。
        handler.setCount(count);
      }
      const col = await fn.col(denops, ".");
      const line = await fn.getline(denops, ".");

      await handler.findTextRange(line, col);

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

  globals.set(denops, "dps_dial#default_augends", defaultAugends);
  globals.set(denops, "dps_dial#augends#register#n", ["decimal"]);
  globals.set(denops, "dps_dial#augends#register#d", ["date"]);
  globals.set(denops, "dps_dial#aliases", {
    "decimal": { "kind": "number", "opts": {} },
    "date": { "kind": "date", "opts": { format: "yyyy-MM-dd" } },
  });

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
