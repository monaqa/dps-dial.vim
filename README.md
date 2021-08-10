# dps-dial.vim: Extended increment/decrement plugin

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

```vim
nmap <C-a> <Plug>(dps-dial-increment)
nmap <C-x> <Plug>(dps-dial-decrement)
vmap <C-a> <Plug>(dps-dial-increment)
vmap <C-x> <Plug>(dps-dial-decrement)
```

## Features

- [x] counter
- [x] dot-repeat
- [ ] wide range of augends
  - [ ] number in various format
  - [ ] date/time in various format
  - [x] keyword switching (true <->)
  - [x] user-defined augends
- [x] configuring augend rules
- [x] specifying augend rules by register
- [x] VISUAL mode mappings
  - [x] normal VISUAL mode
  - [x] line-wise VISUAL mode
  - [x] block-wise VISUAL mode
  - [ ] `g<C-a>` / `g<C-x>`

### Increment/Decrement Various Type of Augends

#### Number

#### Date

#### Char

### Specify Addend with Counter

### Dot-Repeat

### Specify Augend Rules with Register

### Configure Augend Rules

### Define Custom Augend Rules
