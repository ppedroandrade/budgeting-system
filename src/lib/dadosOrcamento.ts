import "server-only";
import { lerEmpresa } from "@/lib/empresa";
import { paraCampoDecimal } from "@/lib/calculo";
import type { Usuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

/** Dados de apoio da tela de orçamento: consultores possíveis, arquitetos já usados, % padrão. */
export async function dadosDeApoio(usuario: Usuario) {
  const supabase = await supabaseServidor();
  const [empresa, vend, arq] = await Promise.all([
    lerEmpresa(),
    usuario.perfil === "admin"
      ? supabase.from("usuarios").select("id, nome, whatsapp, ativo").order("nome")
      : Promise.resolve({ data: [{ id: usuario.id, nome: usuario.nome, whatsapp: usuario.whatsapp, ativo: true }] }),
    supabase.rpc("arquitetos_usados"),
  ]);
  return {
    empresa,
    vendedores: ((vend.data ?? []) as Array<{ id: string; nome: string; whatsapp: string | null; ativo: boolean }>),
    arquitetos: ((arq.data as string[] | null) ?? []),
    pctPadrao: paraCampoDecimal(empresa.pct_padrao),
  };
}
