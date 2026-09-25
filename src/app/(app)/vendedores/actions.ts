"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServidor } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; campos?: Record<string, string> };

const SENHA_MIN = 8;
const BLOQUEIO = "876000h"; // ~100 anos: login bloqueado até reativar

function ler(form: FormData) {
  const campos = {
    nome: String(form.get("nome") ?? "").trim(),
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    whatsapp: String(form.get("whatsapp") ?? "").replace(/\D/g, ""),
    senha: String(form.get("senha") ?? ""),
  };
  return campos;
}

/** Devolve os campos para reexibir no formulário — nunca a senha. */
function semSenha(c: ReturnType<typeof ler>) {
  return { nome: c.nome, email: c.email, whatsapp: c.whatsapp };
}

function validar(c: ReturnType<typeof ler>, senhaObrigatoria: boolean): string | undefined {
  if (!c.nome) return "Informe o nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) return "Informe um e-mail válido.";
  if (c.whatsapp && (c.whatsapp.length < 10 || c.whatsapp.length > 11))
    return "WhatsApp deve ter DDD + número, ex.: (45) 99999-9999.";
  if (senhaObrigatoria && !c.senha) return "Defina uma senha inicial.";
  if (c.senha && c.senha.length < SENHA_MIN) return `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`;
}

function mensagemAuth(msg: string): string {
  if (/already|registered|exists/i.test(msg)) return "Já existe um usuário com este e-mail.";
  if (/password/i.test(msg)) return "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.";
  return "Não foi possível salvar. Tente de novo.";
}

export async function criarVendedor(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const c = ler(form);
  const erro = validar(c, true);
  const campos = semSenha(c);
  if (erro) return { erro, campos };

  const { error } = await supabaseAdmin().auth.admin.createUser({
    email: c.email,
    password: c.senha,
    email_confirm: true,
    user_metadata: { nome: c.nome, whatsapp: c.whatsapp },
    app_metadata: { perfil: "vendedor" },
  });
  if (error) return { erro: mensagemAuth(error.message), campos };

  revalidatePath("/vendedores");
  redirect("/vendedores?ok=criado");
}

export async function editarVendedor(id: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const c = ler(form);
  const erro = validar(c, false);
  const campos = semSenha(c);
  if (erro) return { erro, campos };

  const { error } = await supabaseAdmin().auth.admin.updateUserById(id, {
    email: c.email,
    email_confirm: true,
    user_metadata: { nome: c.nome, whatsapp: c.whatsapp },
    ...(c.senha ? { password: c.senha } : {}),
  });
  if (error) return { erro: mensagemAuth(error.message), campos };

  const supabase = await supabaseServidor();
  const { error: e2 } = await supabase
    .from("usuarios")
    .update({ nome: c.nome, email: c.email, whatsapp: c.whatsapp || null })
    .eq("id", id);
  if (e2) return { erro: "Não foi possível salvar. Tente de novo.", campos };

  revalidatePath("/vendedores");
  redirect("/vendedores?ok=salvo");
}

export async function alterarAtivo(id: string, ativo: boolean): Promise<void> {
  const eu = await exigirAdmin();
  if (id === eu.id) redirect("/vendedores?erro=proprio");

  const { error } = await supabaseAdmin().auth.admin.updateUserById(id, { ban_duration: ativo ? "none" : BLOQUEIO });
  if (error) redirect("/vendedores?erro=falha");

  const supabase = await supabaseServidor();
  await supabase.from("usuarios").update({ ativo }).eq("id", id);

  revalidatePath("/vendedores");
  redirect(`/vendedores?ok=${ativo ? "reativado" : "desativado"}`);
}
