import { expect, test } from "bun:test"
import { lspIcon } from "../src/tui"

test("maps every built-in LSP server ID to a Nerd Font icon", () => {
  const icons = {
    zls: "",
    "yaml-ls": "",
    vue: "󰡄",
    typescript: "󰛦",
    tinymist: "",
    texlab: "",
    terraform: "󱁢",
    svelte: "",
    "sourcekit-lsp": "󰛥",
    rust: "󱘗",
    "ruby-lsp": "󰴭",
    razor: "",
    pyright: "󰌠",
    prisma: "",
    "php intelephense": "󰌟",
    oxlint: "",
    "ocaml-lsp": "",
    nixd: "󱄅",
    "lua-ls": "󰢱",
    "kotlin-ls": "󱈙",
    julials: "",
    jdtls: "󰬷",
    "haskell-language-server": "󰲒",
    gopls: "󰟓",
    gleam: "",
    fsharp: "",
    "elixir-ls": "",
    eslint: "",
    dockerfile: "󰡨",
    deno: "",
    dart: "",
    "clojure-lsp": "",
    clangd: "󰙲",
    csharp: "󰌛",
    biome: "",
    bash: "",
    astro: "",
  }

  for (const [id, icon] of Object.entries(icons)) expect(lspIcon(id)).toBe(icon)
})

test("maps common custom server IDs and falls back to a generic LSP icon", () => {
  expect(lspIcon("rust-analyzer")).toBe("󱘗")
  expect(lspIcon("lua-language-server")).toBe("󰢱")
  expect(lspIcon("tailwindcss-language-server")).toBe("")
  expect(lspIcon("custom-server")).toBe("󰞋")
})
