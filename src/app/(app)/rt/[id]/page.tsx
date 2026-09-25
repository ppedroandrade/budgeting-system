import Link from "next/link";
import { notFound } from "next/navigation";
import { excluirLancamento, salvarCampoRt } from "../actions";
import { EtiquetaCliente, EtiquetaRt } from "@/components/rt/Etiquetas";
import { Movimentos, type LinhaMovimento } from "@/components/rt/Movimentos";
import { CaixaAuto, SelecaoAuto } from "@/components/ui/AutoOpcoes";
import { BotaoExcluir } from "@/components/rt/Excluir";
import { CampoAuto } from "@/components/ui/CampoAuto";
import { Titulo } from "@/components/ui/Titulo";
import { paraCampoDecimal, paraCampoMoeda } from "@/lib/calculo";
import { moeda } from "@/lib/formato";
import { hojeISO } from "@/lib/orcamento";
import type { LinhaRt } from "@/lib/rt";
import { exigirAdmin } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

function Barra({ parte, total, cor }: { parte: number; total: number; cor: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((parte / total) * 100)) : 0;
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-linha" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
    </div>
  );
}

export default async function LancamentoRt({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await supabaseServidor();
  const [{ data: l }, { data: rec }, { data: pag }, { data: arqs }, { data: orc }] = await Promise.all([
    supabase.from("rt_resumo").select("*").eq("id", id).maybeSingle<LinhaRt>(),
    supabase.from("rt_recebimentos").select("id, data, valor, forma, observacao").eq("lancamento_id", id).order("data"),
    supabase.from("rt_pagamentos").select("id, data, valor, forma, observacao").eq("lancamento_id", id).order("data"),
    supabase.from("arquitetos").select("id, nome").order("nome"),
    supabase.from("rt_lancamentos").select("orcamento_id, orcamentos(status)").eq("id", id).maybeSingle(),
  ]);
  if (!l) notFound();

  const n = (v: unknown) => Number(v);
  const salvar = salvarCampoRt.bind(null, l.id);
  const mov = (xs: typeof rec): LinhaMovimento[] => (xs ?? []).map((x) => ({ ...x, valor: n(x.valor) }));
  const semMovimento = !(rec?.length || pag?.length);
  const statusOrc = (orc?.orcamentos as { status?: string } | null)?.status;

  return (
    <div className="max-w-5xl">
      <p className="mb-4 text-sm">
        <Link href="/rt" className="text-tinta-suave underline-offset-4 hover:underline">
          ← RT arquitetos
        </Link>
      </p>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Titulo sobrancelha={`RT · ${l.cliente_nome || "sem cliente"}`} italico={l.arquiteto_nome}>
          {""}
        </Titulo>
        <div className="flex flex-wrap gap-2">
          <EtiquetaCliente s={l.situacao_cliente} />
          <EtiquetaRt s={l.situacao_rt} />
        </div>
      </div>

      {l.orcamento_id && (
        <p className="mb-4 text-sm text-tinta-suave">
          Veio do orçamento{" "}
          <Link href={`/orcamentos/${l.orcamento_id}`} className="text-tinta underline underline-offset-4">
            {l.orcamento_numero}
          </Link>
          {l.ajustado ? " · valores ajustados aqui (não acompanham mais o orçamento)" : " · acompanha o orçamento até ser ajustado aqui ou receber pagamento"}.
        </p>
      )}
      {l.cancelado && (
        <div className="mb-6 rounded-ad border border-atencao/40 bg-atencao/5 p-4 text-sm">
          O orçamento{statusOrc ? ` está como “${statusOrc}”` : " não está mais aprovado"} ou a indicação foi retirada. Esta RT fica de fora dos totais.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr] [&>*]:min-w-0">
        <section className="rounded-ad border border-linha bg-superficie p-5 shadow-ad sm:p-7">
          <h2 className="mb-5 font-display text-2xl">
            Dados da <em className="text-bronze">venda</em>
          </h2>
          <div className="space-y-5">
            <SelecaoAuto salvarCampo={salvar} campo="arquiteto_id" rotulo="Arquiteto(a)" inicial={l.arquiteto_id} opcoes={(arqs ?? []).map((a) => ({ valor: a.id, rotulo: a.nome }))} />
            <CampoAuto salvarCampo={salvar} campo="cliente_nome" rotulo="Cliente" inicial={l.cliente_nome} />
            <div className="grid grid-cols-2 gap-4">
              <CampoAuto salvarCampo={salvar} campo="mes_ref" rotulo="Mês (RT)" inicial={l.mes_ref.slice(0, 7)} type="month" />
              <CampoAuto salvarCampo={salvar} campo="data_pedido" rotulo="Data do pedido" inicial={l.data_pedido} type="date" />
            </div>
            <CampoAuto salvarCampo={salvar} campo="nota_fiscal" rotulo="Nota fiscal" inicial={l.nota_fiscal} />
            <CaixaAuto salvarCampo={salvar} campo="acompanhou" inicial={l.acompanhou} rotulo="Arquiteto(a) acompanhou o cliente" />
            <div className="grid grid-cols-[1.4fr_1fr] gap-4">
              <CampoAuto salvarCampo={salvar} campo="valor_compra" rotulo="Valor da compra (R$)" inicial={paraCampoMoeda(l.valor_compra)} inputMode="decimal" />
              <CampoAuto salvarCampo={salvar} campo="pct" rotulo="% RT" inicial={paraCampoDecimal(String(l.pct))} inputMode="decimal" />
            </div>
            <div className="rounded-ad bg-escuro p-4 text-white">
              <p className="text-[0.6875rem] tracking-[0.16em] text-[#D8C7AC] uppercase">Valor da RT (calculado)</p>
              <p className="numeros font-display text-3xl">{moeda(l.valor_rt)}</p>
              <p className="text-xs text-white/70">
                {moeda(l.valor_compra)} × {paraCampoDecimal(String(l.pct))}% · atualiza ao sair do campo
              </p>
            </div>
            <CampoAuto salvarCampo={salvar} campo="observacoes" rotulo="Observações" inicial={l.observacoes} multilinha />
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-ad border border-linha bg-superficie p-5 shadow-ad sm:p-7">
            <h2 className="font-display text-2xl">
              Pagamentos do <em className="text-bronze">cliente</em>
            </h2>
            <p className="numeros mt-2 text-sm text-tinta-suave">
              Pagou {moeda(l.recebido)} de {moeda(l.valor_compra)} · falta {moeda(l.cliente_falta)}
            </p>
            <Barra parte={n(l.recebido)} total={n(l.valor_compra)} cor="#1f8a5c" />
            <div className="mt-5">
              <Movimentos tipo="recebimento" lancamentoId={l.id} itens={mov(rec)} sugestao={n(l.cliente_falta)} rotuloSugestao="Usar o que falta" hoje={hojeISO()} />
            </div>
          </section>

          <section className="rounded-ad border border-linha bg-superficie p-5 shadow-ad sm:p-7">
            <h2 className="font-display text-2xl">
              Pagamentos ao <em className="text-bronze">arquiteto(a)</em>
            </h2>
            <dl className="numeros mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-tinta-suave">Liberada</dt>
                <dd>{moeda(l.rt_liberado)}</dd>
              </div>
              <div>
                <dt className="text-tinta-suave">Já paga</dt>
                <dd>{moeda(l.pago)}</dd>
              </div>
              <div>
                <dt className="text-tinta-suave">A pagar agora</dt>
                <dd className={n(l.saldo_a_pagar) > 0 ? "text-perigo" : ""}>{moeda(l.saldo_a_pagar)}</dd>
              </div>
            </dl>
            <Barra parte={n(l.pago)} total={n(l.valor_rt)} cor="#9a7b55" />
            <p className="mt-3 text-sm text-tinta-suave">{l.arquiteto_pix ? `PIX: ${l.arquiteto_pix}` : "Sem PIX cadastrado — "}{!l.arquiteto_pix && <Link href={`/rt/arquitetos/${l.arquiteto_id}`} className="underline underline-offset-4">cadastrar</Link>}</p>
            <div className="mt-5">
              <Movimentos tipo="pagamento" lancamentoId={l.id} itens={mov(pag)} sugestao={n(l.saldo_a_pagar)} rotuloSugestao="Usar o saldo liberado" hoje={hojeISO()} />
            </div>
          </section>

          {/* Lançamento de orçamento ainda aprovado voltaria sozinho: para ele, retire a indicação no orçamento. */}
          {(l.cancelado || !l.orcamento_id) && (
            <section className="border-t border-linha pt-6">
              <h2 className="rotulo mb-2">Excluir lançamento</h2>
              <p className="mb-3 text-sm text-tinta-suave">
                {semMovimento ? "Use só se foi lançado por engano." : "Tem pagamentos registrados: ao excluir, eles também somem."}
              </p>
              <BotaoExcluir
                acao={excluirLancamento.bind(null, l.id)}
                pergunta={semMovimento ? "Excluir este lançamento de RT?" : "Este lançamento tem pagamentos registrados. Excluir mesmo assim?"}
                texto="Excluir lançamento"
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
