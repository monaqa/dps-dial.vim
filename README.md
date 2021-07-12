# dps-dial.nvim

**NOTICE: This plugin is work-in-progress yet. User interface is subject to change without notice.**

Extended increment/decrement plugin for [Vim](https://github.com/vim/vim)/[Neovim](https://github.com/neovim/neovim).
Written in [Deno](https://deno.land), using [denops.vim](https://github.com/vim-denops/denops.vim).

This plugin is a reimplementation of [dial.nvim](https://github.com/monaqa/dial.nvim) plugin for the following purposes:

- To support both Vim and Neovim
- For ease of development and debugging

## Installation

This plugin depends on [Deno](https://deno.land) and [denops.vim](https://github.com/vim-denops/denops.vim).

```vim
Plug 'vim-denops/denops.vim'
Plug 'monaqa/dps-dial.vim'
```

## Usage

```vim
nmap <Space>a <Plug>(dps-dial-increment)
nmap <Space>x <Plug>(dps-dial-decrement)
```
