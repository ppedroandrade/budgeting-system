"use server";

import { revalidatePath } from "next/cache";
import { centavos, reais } from "@/lib/calculo";
import { exigirAdmin, exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { COLUNAS_PRODUTO, UNIDADES, type Produto, type Unidade } from "@/lib/tipos";

export type ProdutoEntrada = {
  marca: string;
  nome: string;
  referencia: string;
  acabamento: string;
  unidade: string;
  preco: string; // como digitado: "1.221,60"
  foto_url: string | null;
};

export type ResultadoProduto =
  | { ok: true; produto: Produto }
  | { ok: false; erro: string }
  | { ok: false; duplicado: Pick<Produto, "id" | "nome" | "marca" | "referencia"> & { produto: Produto } };

export async function salvarProduto(id: string | null, e: ProdutoEntrada, cadastrarMesmoAssim = false): Promise<ResultadoProduto> {
  await exigirUsuario();
  const nome = e.nome.trim();
  const marca = e.marca.trim();
  const referencia = e.referencia.trim();
  if (!nome) return { ok: false, erro: "Informe o nome do produto." };
  if (!UNIDADES.includes(e.unidade as Unidade)) return { ok: false, erro: "Unidade inválida." };
  const preco = centavos(e.preco || "0");
  if (preco === null) return { ok: false, erro: "Preço inválido. Use o formato 1.234,56." };

  const supabase = await supabaseServidor();

  // Evita duplicado: mesma referência + mesma marca (sem diferenciar maiúsculas).
  if (referencia && !cadastrarMesmoAssim) {
    let q = supabase.from("produtos").select(COLUNAS_PRODUTO).ilike("referencia", referencia).ilike("marca", marca).limit(1);
    if (id) q = q.neq("id", id);
    const { data } = await q;
    const existente = data?.[0] as Produto | undefined;
    if (existente) return { ok: false, duplicado: { ...existente, produto: existente } };
  }

  const dados = {
    marca,
    nome,
    referencia,
    acabamento: e.acabamento.trim(),
    unidade: e.unidade,
    preco_base: reais(preco),
    foto_url: e.foto_url || null,
  };
  const r = id
    ? await supabase.from("produtos").update(dados).eq("id", id).select(COLUNAS_PRODUTO).single<Produto>()
    : await supabase.from("produtos").insert(dados).select(COLUNAS_PRODUTO).single<Produto>();
  if (r.error || !r.data) return { ok: false, erro: "Não foi possível salvar o produto. Tente de novo." };

  revalidatePath("/produtos");
  return { ok: true, produto: r.data };
}

/** Caixa "Atualizar este preço também no catálogo" do orçamento. */
export async function atualizarPrecoCatalogo(id: string, preco: string): Promise<{ ok: boolean; erro?: string }> {
  await exigirUsuario();
  const c = centavos(preco);
  if (c === null) return { ok: false, erro: "Preço inválido." };
  const supabase = await supabaseServidor();
  const { error, count } = await supabase.from("produtos").update({ preco_base: reais(c) }, { count: "exact" }).eq("id", id);
  if (error || !count) return { ok: false, erro: "Não foi possível atualizar o catálogo." };
  revalidatePath("/produtos");
  return { ok: true };
}

export async function alterarAtivoProduto(id: string, ativo: boolean): Promise<{ ok: boolean }> {
  await exigirAdmin();
  const supabase = await supabaseServidor();
  const { error } = await supabase.from("produtos").update({ ativo }).eq("id", id);
  revalidatePath("/produtos");
  return { ok: !error };
}
