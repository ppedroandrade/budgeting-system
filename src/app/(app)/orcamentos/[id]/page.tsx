import { notFound } from "next/navigation";
import { EditorCliente } from "@/components/orcamentos/EditorCliente";
import { dadosDeApoio } from "@/lib/dadosOrcamento";
import { deBanco, type LinhaOrcamento } from "@/lib/orcamento";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

const COLUNAS =
  "id, numero, data, validade, status, modo_calculo, vendedor_id, cliente_id, arquiteto, indicacao_arquiteto, arquiteto_acompanhou, desconto, motivo_desconto, acrescimo, motivo_acrescimo, formas_pagamento, forma_outro, condicoes, observacoes, snapshot_cliente, atualizado_em";

export default async function EditarOrcamento({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await supabaseServidor();

  const [{ data: o }, { data: itens }] = await Promise.all([
    supabase.from("orcamentos").select(COLUNAS).eq("id", id).maybeSingle<LinhaOrcamento>(),
    supabase.from("orcamento_itens").select("*").eq("orcamento_id", id).order("ordem"),
  ]);
  if (!o) notFound(); // não existe ou é de outro vendedor (RLS)

  const ids = [...new Set((itens ?? []).map((i) => i.produto_id).filter(Boolean))];
  const { data: produtos } = ids.length
    ? await supabase.from("produtos").select("id, preco_base").in("id", ids)
    : { data: [] as Array<{ id: string; preco_base: string }> };
  const precos = Object.fromEntries((produtos ?? []).map((p) => [p.id, String(p.preco_base)]));

  const { vendedores, arquitetos, pctPadrao } = await dadosDeApoio(usuario);

  return (
    <EditorCliente
      key={o.id}
      inicial={deBanco(o, itens ?? [], precos)}
      atualizadoEm={o.atualizado_em}
      usuario={{ id: usuario.id, nome: usuario.nome, admin: usuario.perfil === "admin" }}
      vendedores={vendedores.filter((v) => v.ativo || v.id === o.vendedor_id)}
      arquitetos={arquitetos}
      pctPadrao={pctPadrao}
    />
  );
}
