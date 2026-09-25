import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseServidor } from "@/lib/supabase/server";

export type Perfil = "admin" | "vendedor";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  perfil: Perfil;
  ativo: boolean;
};

/** Usuário logado (uma consulta por requisição). Redireciona para o login se não houver. */
export const exigirUsuario = cache(async (): Promise<Usuario> => {
  const supabase = await supabaseServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims?.sub;
  if (!id) redirect("/login");

  const { data } = await supabase
    .from("usuarios")
    .select("id, nome, email, whatsapp, perfil, ativo")
    .eq("id", id)
    .maybeSingle<Usuario>();

  if (!data || !data.ativo) redirect("/login?motivo=inativo");
  return data;
});

export async function exigirAdmin(): Promise<Usuario> {
  const usuario = await exigirUsuario();
  if (usuario.perfil !== "admin") redirect("/");
  return usuario;
}
