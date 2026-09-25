"use server";

import { revalidatePath } from "next/cache";
import type { ResultadoCampo } from "@/components/ui/CampoAuto";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

const CAMPOS = ["nome", "cpf_cnpj", "telefone", "email", "endereco"] as const;

export async function salvarCampoCliente(id: string, campo: string, bruto: string): Promise<ResultadoCampo> {
  await exigirUsuario();
  if (!CAMPOS.includes(campo as (typeof CAMPOS)[number])) return { ok: false, erro: "Campo desconhecido." };
  const valor = bruto.trim();
  if (campo === "nome" && !valor) return { ok: false, erro: "O nome é obrigatório." };
  if (campo === "email" && valor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return { ok: false, erro: "E-mail inválido." };
  if (valor.length > 300) return { ok: false, erro: "Texto muito longo." };

  const supabase = await supabaseServidor();
  const { error, count } = await supabase
    .from("clientes")
    .update({ [campo]: valor || null }, { count: "exact" })
    .eq("id", id);
  if (error || !count) return { ok: false, erro: "Sem permissão para alterar este cliente." };
  revalidatePath(`/clientes/${id}`);
  return { ok: true, valor };
}
