import { EditorCliente } from "@/components/orcamentos/EditorCliente";
import { dadosDeApoio } from "@/lib/dadosOrcamento";
import { hojeISO, somarDias, type OrcamentoForm } from "@/lib/orcamento";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { COLUNAS_CLIENTE, type Cliente } from "@/lib/tipos";

export default async function NovoOrcamento({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const usuario = await exigirUsuario();
  const { cliente: clienteId } = await searchParams;
  const { empresa, vendedores, arquitetos, pctPadrao } = await dadosDeApoio(usuario);

  let cliente: OrcamentoForm["cliente"] = null;
  if (clienteId) {
    const supabase = await supabaseServidor();
    const { data } = await supabase.from("clientes").select(COLUNAS_CLIENTE).eq("id", clienteId).maybeSingle<Cliente>();
    if (data) cliente = { id: data.id, nome: data.nome, cpf_cnpj: data.cpf_cnpj ?? "", telefone: data.telefone ?? "", email: data.email ?? "", endereco: data.endereco ?? "" };
  }

  const hoje = hojeISO();
  const inicial: OrcamentoForm = {
    id: null,
    numero: null,
    data: hoje,
    validade: somarDias(hoje, empresa.validade_dias),
    status: "rascunho",
    modo: empresa.modo_calculo,
    vendedor_id: usuario.id,
    cliente,
    arquiteto: "",
    indicacao_arquiteto: false,
    arquiteto_acompanhou: false,
    itens: [],
    desconto: "",
    motivo_desconto: "",
    acrescimo: "",
    motivo_acrescimo: "",
    formas_pagamento: [],
    forma_outro: "",
    condicoes: empresa.condicoes_padrao,
    observacoes: empresa.observacoes_padrao,
  };

  return (
    <EditorCliente
      inicial={inicial}
      atualizadoEm={null}
      usuario={{ id: usuario.id, nome: usuario.nome, admin: usuario.perfil === "admin" }}
      vendedores={vendedores.filter((v) => v.ativo)}
      arquitetos={arquitetos}
      pctPadrao={pctPadrao}
    />
  );
}
