"use server";

import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";

export type EstadoLogin = { erro?: string; email?: string };

export async function entrar(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha.", email };

  const supabase = await supabaseServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) {
    const banido = error?.code === "user_banned";
    return {
      erro: banido
        ? "Seu acesso está desativado. Fale com o administrador."
        : "E-mail ou senha incorretos.",
      email,
    };
  }

  const { data: usuario } = await supabase.from("usuarios").select("ativo").eq("id", data.user.id).maybeSingle();
  if (!usuario?.ativo) {
    await supabase.auth.signOut();
    return { erro: "Seu acesso está desativado. Fale com o administrador.", email };
  }
  redirect("/");
}

export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
