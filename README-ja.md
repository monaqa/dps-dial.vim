# dps-dial.vim: 拡張可能なインクリメント・デクリメントプラグイン

**NOTICE: このプラグインはまだ開発途中であり、 ユーザインターフェースなどが予告なく変更されることがあります。**

[Vim](https://github.com/vim/vim)および[Neovim](https://github.com/neovim/neovim)で利用できる
インクリメント・デクリメントの拡張プラグイン。
[denops.vim](https://github.com/vim-denops/denops.vim)を使用しています。

このプラグインは [dial.nvim](https://github.com/monaqa/dial.nvim) を以下の目的で書き直したものです。

- Vim と Neovim の両方をサポートするため
- より開発・デバッグを行いやすくするため

## インストール

このプラグインは [Deno](https://deno.land) 及び
[denops.vim](https://github.com/vim-denops/denops.vim) に依存しています。 すなわち、Deno
のランタイム及び `denops.vim` プラグインが入っている必要があります。

```vim
Plug 'vim-denops/denops.vim'
Plug 'monaqa/dps-dial.vim'
```

## 使い方

以下の記述を設定ファイルに追加することで、 `<C-a>` 及び `<C-x>` の挙動を変更することができます。

```vim
nmap  <C-a>  <Plug>(dps-dial-increment)
nmap  <C-x>  <Plug>(dps-dial-decrement)
xmap  <C-a>  <Plug>(dps-dial-increment)
xmap  <C-x>  <Plug>(dps-dial-decrement)
xmap g<C-a> g<Plug>(dps-dial-increment)
xmap g<C-x> g<Plug>(dps-dial-decrement)
```

## 機能

### 数値以外のインクリメント・デクリメント・トグル

以下のようなルールに則った文字列操作が可能です。

- 日付の増減

  - たとえば `2021/08/25` の `25` の上で `7<C-a>` を押すと、一週間後の日付 `2021/09/01` が得られます。
  - 上と同じ例でも、`08` の上で `7<C-a>` を押すと、7ヶ月後の日付 `2022/03/25` が得られます。

- `camelCase <-> snake_case` のトグル

  - カーソル下にある識別子の記法（キャメルケース・スネークケースなど）をトグルすることができます。
  - デフォルトでは動かないため、 `g:dps_dial#augends` などの設定値をいじる必要があります。

- 任意の単語の切り替え

  - `['true', 'false']` や `[ 'Mon', 'Tue', ..., 'Sun' ]`
    のように、有限個の候補を持つ単語を切り替えることができます。
  - デフォルトでは動かないため、 `g:dps_dial#augends` などの設定値をいじる必要があります。

- その他、ユーザによる拡張

  - Vim script を用いて任意のルールを作成することができます。

### ドットリピート

標準の `<C-a>` や `<C-x>` とは若干挙動が異なり、増減ルールが固定されます。 たとえば以下のようなバッファがあったとします。

```
date: 2020/11/08
...
due date of 1st report: 2020/11/23
...
due date of 2nd report: 2020/12/21
...
date of exam: 2021/01/14
```

このバッファのすべての日付を1ヶ月後ろにずらしたいとき、以下の操作で実現できます。

1. 1行目の `2020/11/08` の `11` に移動し、 `<C-a>` を押す（これで1行目の日付が `2020/12/08` となる）
2. `date` で検索して3行目の `date` の位置に飛ぶ
3. ドットリピート `.` を行う（これで3行目の日付が `2020/12/23` となる）
4. `n.n.` （これで 5 行目、7行目も同様に日付が1ヶ月インクリメントされる）

3 の段階でもし `<C-a>` を押していたら `1st` の `1` の部分がインクリメントされてしまうところですが、
ドットリピートでは直前の「日付のうち"月"を1つ増やす」という操作を記憶しているため、 単なる数字を飛ばして日付を対象にインクリメントすることができます。

### 増減ルールの設定

`g:dps_dial#augends` にて設定されたルールに沿って増減が行なわれます。

```vim
let g:dps_dial#augends = [
\   'number',
\   'date',
\   {'kind': 'constant', 'opts': {'elements': ['true', 'false']}},
\   {'kind': 'case', 'opts': {'cases': ['camelCase', 'snake_case'], 'cyclic': v:true}},
\ ]
```

ただし、バッファローカルな設定値 `b:dps_dial_augends` がある場合はそちらが設定として使われます。

```vim
autocmd FileType python let b:dps_dial#augends = ['number', {'kind': 'constant', 'opts': {'elements': ['True', 'False']}}]
```

### レジスタ名指定による挙動の変更

- `<C-a>` の代わりに `"x<C-a>` と打つと、 `g:dps_dial#augends` の代わりに
  `g:dps_dial#augends#register#x` に書かれたルールに基づいて増減操作が行われます。
- `<C-a>` の代わりに `"1<C-a>` と打つと、 直後に実行されるドットリピートの挙動が累加的になります
  （ドットリピートが実行されるたびに、加数が1ずつ増えていきます）。
- `<C-a>` の代わりに `"X<C-a>` と打つと、 `g:dps_dial#augends` の代わりに
  `g:dps_dial#augends#register#x` に書かれたルールに基づいて増減操作が行われ、
  なおかつ直後に実行されるドットリピートの挙動が累加的になります。

### ユーザによる増減ルールの拡張（例）

マークダウンのヘッダの個数を増減する例です。
vimrc にて以下のように書けば、 `<Space>a` / `<Space>x` でヘッダを増減することが可能となります。

```vim
function! MarkdownHeaderFind(line, cursor)
  let match = matchstr(a:line, '^#\+')
  if match !=# ''
    return {"from": 0, "to": strlen(match)}
  endif
  return v:null
endfunction

function! MarkdownHeaderAdd(text, addend, cursor)
  let n_header = strlen(a:text)
  let n_header = min([6, max([1, n_header + a:addend])])
  let text = repeat('#', n_header)
  let cursor = 1
  return {'text': text, 'cursor': cursor}
endfunction

let s:id_find = dps_dial#register_callback(function("MarkdownHeaderFind"))
let s:id_add = dps_dial#register_callback(function("MarkdownHeaderAdd"))

augroup dps-dial
  autocmd FileType markdown let b:dps_dial_augends_register_h = [ {"kind": "user", "opts": {"find": s:id_find, "add": s:id_add}} ]
  autocmd FileType markdown nmap <buffer> <Space>a "h<Plug>(dps-dial-increment)
  autocmd FileType markdown nmap <buffer> <Space>x "h<Plug>(dps-dial-decrement)
  autocmd FileType markdown vmap <buffer> <Space>a "h<Plug>(dps-dial-increment)
  autocmd FileType markdown vmap <buffer> <Space>x "h<Plug>(dps-dial-decrement)
augroup END
```

## LICENSE

MIT
