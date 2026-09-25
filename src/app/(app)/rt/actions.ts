"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ResultadoCampo } from "@/components/ui/CampoAuto";
import { centavos, centesimosPct, paraTexto, reais } from "@/lib/calculo";
import { exigirAdmin } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

type Validado = { valor: string | number | boolean | null } | { erro: string };

const dinheiro = (v: string): Validado => {
  const c = centavos(v || "0");
  return c === null ? { erro: "Valor inválido. Use o formato 1.234,56." } : { valor: reais(c) };
};
const porcentagem = (v: string, vazioOk = false): Validado => {
  if (vazioOk && !v.trim()) return { valor: null };
  const p = centesimosPct(v.replace("%", ""));
  return p === null || p > 10000n ? { erro: "Use um % entre 0 e 100." } : { valor: paraTexto(p, 2) };
};
const data = (v: string): Validado => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? { valor: v } : { erro: "Data inválida." });
const texto = (max: number) => (v: string): Validado => (v.length > max ? { erro: `Máximo de ${max} caracteres.` } : { valor: v.trim() });

/** Traduz a mensagem do banco (ex.: "passaria do valor da RT") para quem usa a tela. */
function erroBanco(msg?: string): string {
  if (!msg) return "Não foi possível salvar. Tente de novo.";
  const m = msg.match(/O total .*?\)\./);
  if (m) return m[0].replace(/R\$ (\d+)\.(\d{2})/g, (_, i, c) => `R$ ${Number(i).toLocaleString("pt-BR")},${c}`);
  return "Não foi possível salvar. Tente de novo.";
}

function atualizar(id?: string) {
  revalidatePath("/rt");
  if (id) revalidatePath(`/rt/${id}`);
}

// ── Lançamento ────────────────────────────────────────────────────────────
const CAMPOS_LANC: Record<string, (v: string) => Validado> = {
  mes_ref: (v) => (/^\d{4}-\d{2}$/.test(v) ? { valor: `${v}-01` } : { erro: "Mês inválido." }),
  data_pedido: data,
  nota_fiscal: texto(40),
  acompanhou: (v) => ({ valor: v === "true" }),
  valor_compra: dinheiro,
  pct: (v) => porcentagem(v),
  arquiteto_id: (v) => (/^[0-9a-f-]{36}$/i.test(v) ? { valor: v } : { erro: "Escolha o(a) arquiteto(a)." }),
  cliente_nome: texto(200),
  observacoes: texto(2000),
};

export async function salvarCampoRt(id: string, campo: string, bruto: string): Promise<ResultadoCampo> {
  await exigirAdmin();
  const validar = CAMPOS_LANC[campo];
  if (!validar) return { ok: false, erro: "Campo desconhecido." };
  const r = validar(bruto);
  if ("erro" in r) return { ok: false, erro: r.erro };
  const supabase = await supabaseServidor();
  // Editado pelo admin: o lançamento deixa de acompanhar mudanças do orçamento.
  const { error } = await supabase.from("rt_lancamentos").update({ [campo]: r.valor, ajustado: true }).eq("id", id);
  if (error) return { ok: false, erro: erroBanco(error.message) };
  atualizar(id);
  return { ok: true, valor: campo === "mes_ref" ? bruto : String(r.valor ?? "") };
}

export async function criarLancamento(_: { erro?: string }, form: FormData): Promise<{ erro?: string }> {
  await exigirAdmin();
  const supabase = await supabaseServidor();
  const nomeArq = String(form.get("arquiteto") ?? "").trim();
  if (!nomeArq) return { erro: "Informe o(a) arquiteto(a)." };
  const valor = dinheiro(String(form.get("valor_compra") ?? ""));
  if ("erro" in valor) return { erro: valor.erro };
  const pctBruto = String(form.get("pct") ?? "").trim();
  const mes = String(form.get("mes_ref") ?? "");
  const dt = String(form.get("data_pedido") ?? "");
  if (!/^\d{4}-\d{2}$/.test(mes) || !/^\d{4}-\d{2}-\d{2}$/.test(dt)) return { erro: "Confira o mês e a data do pedido." };

  const { data: arqId, error: e1 } = await supabase.rpc("garantir_arquiteto", { p_nome: nomeArq });
  if (e1 || !arqId) return { erro: "Não foi possível cadastrar o(a) arquiteto(a)." };

  let pct = pctBruto ? porcentagem(pctBruto) : null;
  if (pct && "erro" in pct) return { erro: pct.erro };
  if (!pct) {
    const [{ data: arq }, { data: cfg }] = await Promise.all([
      supabase.from("arquitetos").select("pct_rt").eq("id", arqId).single(),
      supabase.from("rt_config").select("pct_padrao").eq("id", 1).single(),
    ]);
    pct = { valor: String(arq?.pct_rt ?? cfg?.pct_padrao ?? 5) };
  }

  const { data: novo, error } = await supabase
    .from("rt_lancamentos")
    .insert({
      arquiteto_id: arqId,
      cliente_nome: String(form.get("cliente_nome") ?? "").trim(),
      mes_ref: `${mes}-01`,
      data_pedido: dt,
      nota_fiscal: String(form.get("nota_fiscal") ?? "").trim(),
      acompanhou: form.get("acompanhou") === "on",
      valor_compra: valor.valor,
      pct: pct.valor,
      ajustado: true,
    })
    .select("id")
    .single();
  if (error || !novo) return { erro: erroBanco(error?.message) };
  atualizar();
  redirect(`/rt/${novo.id}`);
}

export async function excluirLancamento(id: string): Promise<void> {
  await exigirAdmin();
  const supabase = await supabaseServidor();
  await supabase.from("rt_lancamentos").delete().eq("id", id);
  atualizar();
  redirect("/rt?ok=excluido");
}

// ── Pagamentos do cliente e ao arquiteto ───────────────────────────────────
export type Movimento = { data: string; valor: string; forma: string; observacao: string };

export async function adicionarMovimento(tipo: "recebimento" | "pagamento", lancamentoId: string, m: Movimento): Promise<{ ok: boolean; erro?: string }> {
  await exigirAdmin();
  const v = dinheiro(m.valor);
  if ("erro" in v) return { ok: false, erro: v.erro };
  if (Number(v.valor) <= 0) return { ok: false, erro: "Informe um valor maior que zero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.data)) return { ok: false, erro: "Data inválida." };
  const supabase = await supabaseServidor();
  const tabela = tipo === "recebimento" ? "rt_recebimentos" : "rt_pagamentos";
  const { error } = await supabase.from(tabela).insert({
    lancamento_id: lancamentoId,
    data: m.data,
    valor: v.valor,
    forma: m.forma.trim().slice(0, 40),
    observacao: m.observacao.trim().slice(0, 300),
  });
  if (error) return { ok: false, erro: erroBanco(error.message) };
  atualizar(lancamentoId);
  return { ok: true };
}

export async function removerMovimento(tipo: "recebimento" | "pagamento", id: string, lancamentoId: string): Promise<void> {
  await exigirAdmin();
  const supabase = await supabaseServidor();
  await supabase.from(tipo === "recebimento" ? "rt_recebimentos" : "rt_pagamentos").delete().eq("id", id);
  atualizar(lancamentoId);
}

// ── Regras da RT ───────────────────────────────────────────────────────────
export async function salvarConfigRt(campo: string, bruto: string): Promise<ResultadoCampo> {
  await exigirAdmin();
  let r: Validado;
  if (campo === "pct_padrao") r = porcentagem(bruto);
  else if (campo === "liberacao") r = bruto === "proporcional" || bruto === "quitado" ? { valor: bruto } : { erro: "Opção inválida." };
  else return { ok: false, erro: "Campo desconhecido." };
  if ("erro" in r) return { ok: false, erro: r.erro };
  const supabase = await supabaseServidor();
  const { error } = await supabase.from("rt_config").update({ [campo]: r.valor }).eq("id", 1);
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  atualizar();
  return { ok: true, valor: campo === "pct_padrao" ? String(r.valor).replace(".", ",").replace(/,00$/, "") : String(r.valor) };
}

// ── Cadastro de arquitetos ─────────────────────────────────────────────────
const CAMPOS_ARQ: Record<string, (v: string) => Validado> = {
  nome: (v) => (v.trim() ? { valor: v.trim().replace(/\s+/g, " ") } : { erro: "O nome é obrigatório." }),
  telefone: texto(30),
  email: texto(120),
  pix: texto(200),
  pct_rt: (v) => porcentagem(v, true),
  observacoes: texto(2000),
  ativo: (v) => ({ valor: v === "true" }),
};

export async function salvarCampoArquiteto(id: string, campo: string, bruto: string): Promise<ResultadoCampo> {
  await exigirAdmin();
  const validar = CAMPOS_ARQ[campo];
  if (!validar) return { ok: false, erro: "Campo desconhecido." };
  const r = validar(bruto);
  if ("erro" in r) return { ok: false, erro: r.erro };
  const supabase = await supabaseServidor();
  const { error } = await supabase.from("arquitetos").update({ [campo]: r.valor === "" && campo !== "nome" && campo !== "observacoes" ? null : r.valor }).eq("id", id);
  if (error) return { ok: false, erro: /unico|duplicate/i.test(error.message) ? "Já existe um(a) arquiteto(a) com esse nome." : "Não foi possível salvar." };
  revalidatePath("/rt");
  return { ok: true, valor: r.valor === null ? "" : String(r.valor) };
}

export async function novoArquiteto(_: { erro?: string }, form: FormData): Promise<{ erro?: string }> {
  await exigirAdmin();
  const nome = String(form.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe o nome." };
  const supabase = await supabaseServidor();
  const { data: id, error } = await supabase.rpc("garantir_arquiteto", { p_nome: nome });
  if (error || !id) return { erro: "Não foi possível cadastrar." };
  revalidatePath("/rt");
  redirect(`/rt/arquitetos/${id}`);
}
