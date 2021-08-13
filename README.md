# dps-dial.vim: Extended increment/decrement plugin

（[日本語版はこちら](./README-ja.md)）

**NOTICE: This plugin is work-in-progress yet. User interface is subject to
change without notice.**

Extended increment/decrement plugin for
[Vim](https://github.com/vim/vim)/[Neovim](https://github.com/neovim/neovim).
Written in [Deno](https://deno.land), using
[denops.vim](https://github.com/vim-denops/denops.vim).

This plugin is a reimplementation of
[dial.nvim](https://github.com/monaqa/dial.nvim) plugin for the following
purposes:

- To support both Vim and Neovim
- For ease of development and debugging

## Installation

This plugin depends on [Deno](https://deno.land) and
[denops.vim](https://github.com/vim-denops/denops.vim).

```vim
Plug 'vim-denops/denops.vim'
Plug 'monaqa/dps-dial.vim'
```

## Usage

By adding the following description to the configuration file, you can change the behavior of `<C-a>` and `<C-x>`:

```vim
nmap  <C-a>  <Plug>(dps-dial-increment)
nmap  <C-x>  <Plug>(dps-dial-decrement)
xmap  <C-a>  <Plug>(dps-dial-increment)
xmap  <C-x>  <Plug>(dps-dial-decrement)
xmap g<C-a> g<Plug>(dps-dial-increment)
xmap g<C-x> g<Plug>(dps-dial-decrement)
```

## Features

### Increment/Decrement/Toggle Non-Numeric Strings

You can perform string operations according to the following rules:

- Date Increase/Decrease

  - If you press `7<C-a>` on `25` in `2021/08/25`, you will get the date one week later, `2021/09/01`.
  - For the same string as above, pressing `7<C-a>` on `08`, then you will get the date seven months later, `2022/03/25`.

- Toggle between `camelCase` and `snake_case`

  - You can toggle the notation (camelCase, snake_case, etc.) of identifier under the cursor.
  - You need to tweak the configuration values such as `g:dps_dial#augends`.

- Switch arbitrary words

  - You can switch between words with a several number of candidates, such as `['true', 'false']` or `[ 'Mon', 'Tue', ..., 'Sun' ]`.
  - You need to tweak the configuration values such as `g:dps_dial#augends`.

- User extension

  - You can create arbitrary rule with Vim script.

### Dot-Repeat

Unlike the standard dot repeating in `<C-a>` / `<C-x>`,
`dps-dial.vim` provides dot repeating with a fixed increment/decrement rule.
For example, suppose you have a buffer like the following, and you want to move all due dates back one month:

```
date: 2020/11/08
...
due date of 1st report: 2020/11/23
...
due date of 2nd report: 2020/12/21
...
date of exam: 2021/01/14
```

In `dps-dial.vim`, it can be achieved by the following simple operations:

1. Move the `11` in the first line `2020/11/08` and press `<C-a>` (this will change the date in the first line to `2020/12/08`)
2. Search for `date` and jump to the third line at `date`
3. Do dot-repeat `.` (this will change the date in the third line to `2020/12/23`)
4. Do `n.n.` (the date will be incremented by one month for line 5 and 7 as well)

Note that if you press `<C-a>` at step3, the `1` part of `1st` will be incremented.
Dot-repeat remembers that the previous operation was to increment the month of the date by one,
so you can skip the number `1st` and just increment the date.

### Configure Augend Rules

The increment/decrement is done according to the rules set in `g:dps_dial#augends`.

```vim
let g:dps_dial#augends = [
\   'number',
\   'date',
\   {'kind': 'constant', 'opts': {'elements': ['true', 'false']}},
\   {'kind': 'case', 'opts': {'cases': ['camelCase', 'snake_case'], 'cyclic': v:true}},
\ ]
```

Note that if there is a buffer-local variable `b:dps_dial_augends`, it will be used as the configuration.

```vim
autocmd FileType python let b:dps_dial#augends = ['number', {'kind': 'constant', 'opts': {'elements': ['True', 'False']}}]
```

### Specify Augend Rules with Register

- If you type `"x<C-a>` instead of `<C-a>`, the increment will be performed according to the rules written in `g:dps_dial#augends#register#x` instead of `g:dps_dial#augends`.
- If you type `"1<C-a>` instead of `<C-a>`, the behavior of subsequent dot-repeat will be cumulative. That is, each time a dot-repeat is executed, the addend is increased by one.
- If you type `"X<C-a>` instead of `<C-a>`,
  the increment will be performed according to the rules written in `g:dps_dial#augends#register#x` instead of `g:dps_dial#augends`, and the behavior of subsequent dot-repeat will be cumulative.

### LICENSE

MIT
