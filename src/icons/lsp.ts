import type { PluginSettings } from "../preferences-schema"

export type LspIconStyle = PluginSettings["lspIconStyle"]

const LSP_ICONS: Readonly<Record<string, Record<LspIconStyle, string>>> = {
  zls: { nerd: "", text: "Zg" },
  "yaml-ls": { nerd: "", text: "Yml" },
  vue: { nerd: "󰡄", text: "Vue" },
  typescript: { nerd: "󰛦", text: "TS" },
  tinymist: { nerd: "", text: "Typ" },
  texlab: { nerd: "", text: "TeX" },
  terraform: { nerd: "󱁢", text: "Tf" },
  svelte: { nerd: "", text: "Sv" },
  "sourcekit-lsp": { nerd: "󰛥", text: "Sw" },
  rust: { nerd: "󱘗", text: "Rs" },
  "ruby-lsp": { nerd: "󰴭", text: "Rb" },
  razor: { nerd: "", text: "Rz" },
  pyright: { nerd: "󰌠", text: "Py" },
  prisma: { nerd: "", text: "Pr" },
  "php intelephense": { nerd: "󰌟", text: "PHP" },
  oxlint: { nerd: "", text: "Ox" },
  "ocaml-lsp": { nerd: "", text: "Ml" },
  nixd: { nerd: "󱄅", text: "Nix" },
  "lua-ls": { nerd: "󰢱", text: "Lua" },
  "kotlin-ls": { nerd: "󱈙", text: "Kt" },
  julials: { nerd: "", text: "Jl" },
  jdtls: { nerd: "󰬷", text: "Jv" },
  "haskell-language-server": { nerd: "󰲒", text: "Hs" },
  gopls: { nerd: "󰟓", text: "Go" },
  gleam: { nerd: "", text: "Gl" },
  fsharp: { nerd: "", text: "F#" },
  "elixir-ls": { nerd: "", text: "Ex" },
  eslint: { nerd: "", text: "ES" },
  dockerfile: { nerd: "󰡨", text: "Dk" },
  deno: { nerd: "", text: "Dn" },
  dart: { nerd: "", text: "Dt" },
  "clojure-lsp": { nerd: "", text: "Clj" },
  clangd: { nerd: "󰙲", text: "C++" },
  csharp: { nerd: "󰌛", text: "C#" },
  biome: { nerd: "", text: "Bm" },
  bash: { nerd: "", text: "Sh" },
  astro: { nerd: "", text: "Ast" },
  json: { nerd: "󰘦", text: "{}" },
  tailwind: { nerd: "", text: "TW" },
  css: { nerd: "󰌜", text: "CSS" },
  html: { nerd: "󰌝", text: "HTM" },
}

export function lspIconName(id: string) {
  const name = id.toLowerCase()
  if (Object.hasOwn(LSP_ICONS, name)) return name
  if (name.includes("typescript") || name.includes("tsserver") || name.includes("javascript")) return "typescript"
  if (name.includes("eslint")) return "eslint"
  if (name.includes("biome")) return "biome"
  if (name.includes("deno")) return "deno"
  if (name.includes("pyright") || name.includes("pylsp") || name.includes("ruff") || name === "ty") return "pyright"
  if (name.includes("gopls") || name === "go") return "gopls"
  if (name.includes("rust")) return "rust"
  if (name.includes("clang") || name.includes("ccls") || name.includes("c++")) return "clangd"
  if (name.includes("lua")) return "lua-ls"
  if (name.includes("ruby")) return "ruby-lsp"
  if (name.includes("java") || name.includes("jdt")) return "jdtls"
  if (name.includes("kotlin")) return "kotlin-ls"
  if (name.includes("csharp") || name.includes("omnisharp")) return "csharp"
  if (name.includes("fsharp")) return "fsharp"
  if (name.includes("elixir")) return "elixir-ls"
  if (name.includes("terraform")) return "terraform"
  if (name.includes("yaml")) return "yaml-ls"
  if (name.includes("json")) return "json"
  if (name.includes("tailwind")) return "tailwind"
  if (name.includes("css")) return "css"
  if (name.includes("html")) return "html"
  if (name.includes("bash") || name.includes("shell")) return "bash"
  if (name.includes("docker")) return "dockerfile"
  if (name.includes("php")) return "php intelephense"
  if (name.includes("dart")) return "dart"
  if (name.includes("zig") || name.includes("zls")) return "zls"
  if (name.includes("ocaml")) return "ocaml-lsp"
  if (name.includes("swift") || name.includes("sourcekit")) return "sourcekit-lsp"
  if (name.includes("prisma")) return "prisma"
  return undefined
}

export function lspIcon(id: string, style: LspIconStyle = "nerd") {
  const name = lspIconName(id)
  return name ? LSP_ICONS[name][style] : id
}
