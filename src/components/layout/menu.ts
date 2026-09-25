import type { Perfil } from "@/lib/sessao";

export type ItemMenu = { href: string; rotulo: string };

const VENDEDOR: ItemMenu[] = [
  { href: "/orcamentos", rotulo: "Orçamentos" },
  { href: "/orcamentos/novo", rotulo: "Novo orçamento" },
  { href: "/produtos", rotulo: "Produtos" },
  { href: "/clientes", rotulo: "Clientes" },
];

const ADMIN: ItemMenu[] = [
  { href: "/painel", rotulo: "Painel" },
  ...VENDEDOR,
  { href: "/vendedores", rotulo: "Vendedores" },
  { href: "/rt", rotulo: "RT Arquitetos" },
  { href: "/configuracoes", rotulo: "Configurações" },
];

export function itensDoMenu(perfil: Perfil): ItemMenu[] {
  return perfil === "admin" ? ADMIN : VENDEDOR;
}

/** Item ativo = o de caminho mais longo que casa com a URL atual. */
export function itemAtivo(itens: ItemMenu[], caminho: string): string | undefined {
  return itens
    .filter((i) => caminho === i.href || caminho.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}
