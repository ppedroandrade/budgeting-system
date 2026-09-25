import "server-only";
import { cache } from "react";
import { supabaseServidor } from "@/lib/supabase/server";

export type EmpresaConfig = {
  razao_social: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  whatsapp: string;
  instagram: string;
  site: string;
  horario: string;
  logo_url: string | null;
  modo_calculo: "A" | "B";
  pct_padrao: string;
  validade_dias: number;
  condicoes_padrao: string;
  observacoes_padrao: string;
  pdf_mostrar_pct: boolean;
};

export const lerEmpresa = cache(async (): Promise<EmpresaConfig> => {
  const supabase = await supabaseServidor();
  const { data, error } = await supabase.from("empresa").select("*").eq("id", 1).single<EmpresaConfig>();
  if (error || !data) throw new Error("Não foi possível ler as configurações.");
  return data;
});
