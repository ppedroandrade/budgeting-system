"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

type Validador = (v: string) => { valor: string | number | boolean } | { erro: string };

const texto = (max: number, obrigatorio = false): Validador => (v) => {
  const t = v.trim();
  if (obrigatorio && !t) return { erro: "Este campo não pode ficar vazio." };
  if (t.length > max) return { erro: `Máximo de ${max} caracteres.` };
  return { valor: t };
};

const inteiro = (min: number, max: number): Validador => (v) => {
  const n = Number(v.replace(",", "."));
  if (!Number.isInteger(n) || n < min || n > max) return { erro: `Use um número inteiro entre ${min} e ${max}.` };
  return { valor: n };
};

/** Campos que o admin pode alterar e como cada um é validado. */
const CAMPOS: Record<string, Validador> = {
  razao_social: texto(120, true),
  cnpj: (v) => {
    const d = v.replace(/\D/g, "");
    if (d && d.length !== 14) return { erro: "CNPJ deve ter 14 números." };
    return { valor: d ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : "" };
  },
  endereco: texto(200),
  telefone: texto(30),
  whatsapp: texto(30),
  instagram: texto(60),
  site: texto(100),
  horario: texto(120),
  modo_calculo: (v) => (v === "A" || v === "B" ? { valor: v } : { erro: "Modo inválido." }),
  pct_padrao: (v) => {
    const n = Number(v.replace("%", "").replace(",", ".").trim());
    if (!Number.isFinite(n) || n < 0 || n > 100) return { erro: "Use um valor entre 0 e 100." };
    return { valor: Math.round(n * 100) / 100 };
  },
  validade_dias: inteiro(1, 365),
  condicoes_padrao: texto(2000),
  observacoes_padrao: texto(2000),
  pdf_mostrar_pct: (v) => ({ valor: v === "true" }),
  logo_url: (v) => {
    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/arquivos/empresa/`;
    if (v && !v.startsWith(base)) return { erro: "Endereço de logo inválido." };
    return { valor: v };
  },
};

import type { ResultadoCampo } from "@/components/ui/CampoAuto";

export async function salvarCampo(campo: string, bruto: string): Promise<ResultadoCampo> {
  await exigirAdmin();
  const validar = CAMPOS[campo];
  if (!validar) return { ok: false, erro: "Campo desconhecido." };
  const r = validar(bruto);
  if ("erro" in r) return { ok: false, erro: r.erro };

  const supabase = await supabaseServidor();
  const valor = campo === "logo_url" && r.valor === "" ? null : r.valor;
  const { error } = await supabase.from("empresa").update({ [campo]: valor }).eq("id", 1);
  if (error) return { ok: false, erro: "Não foi possível salvar. Verifique a conexão." };

  revalidatePath("/configuracoes");
  return { ok: true, valor: String(r.valor) };
}
