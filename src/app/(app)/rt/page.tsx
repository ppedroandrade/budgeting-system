import Link from "next/link";
import { salvarConfigRt } from "./actions";
import { NovoArquiteto } from "./NovoArquiteto";
import { EtiquetaCliente, EtiquetaRt } from "@/components/rt/Etiquetas";
import { SelecaoAuto } from "@/components/ui/AutoOpcoes";
import { BotaoLink, classeBotao } from "@/components/ui/Botao";
import { CampoAuto } from "@/components/ui/CampoAuto";
import { Aviso } from "@/components/ui/Campo";
import { FiltroUrl } from "@/components/ui/Busca";
import { Titulo } from "@/components/ui/Titulo";
import { data as fData, mesCurto, moeda } from "@/lib/formato";
import { FILTRO_SITUACAO, lerLancamentos, nomeMes, somar, type LinhaRt } from "@/lib/rt";
import { exigirAdmin } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";

type Busca = { aba?: string; mes?: string; arquiteto?: string; situacao?: string; ok?: string };

function Indicador({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: number; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-ad border p-4 shadow-ad sm:p-5 ${destaque ? "border-escuro bg-escuro text-white" : "border-linha bg-superficie"}`}>
      <p className={`text-sm ${destaque ? "text-[#D8C7AC]" : "text-tinta-suave"}`}>{rotulo}</p>
      <p className="numeros mt-1.5 text-xl whitespace-nowrap sm:text-2xl">{moeda(valor)}</p>
      {detalhe && <p className={`mt-1 text-xs ${destaque ? "text-white/70" : "text-tinta-suave"}`}>{detalhe}</p>}
    </div>
  );
}

function Abas({ atual }: { atual: string }) {
  const abas = [
    ["lancamentos", "Lançamentos"],
    ["pagar", "A pagar por arquiteto"],
    ["arquitetos", "Cadastro de arquitetos"],
  ];
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-linha" aria-label="Seções da RT">
      {abas.map(([v, r]) => (
        <Link
          key={v}
          href={`/rt?aba=${v}`}
          aria-current={atual === v ? "page" : undefined}
          className={`-mb-px flex min-h-12 items-center border-b-2 px-4 text-[0.75rem] tracking-[0.14em] whitespace-nowrap uppercase ${
            atual === v ? "border-bronze text-tinta" : "border-transparent text-tinta-suave hover:text-tinta"
          }`}
        >
          {r}
        </Link>
      ))}
    </nav>
  );
}

function TabelaLancamentos({ linhas }: { linhas: LinhaRt[] }) {
  if (!linhas.length) {
    return <p className="rounded-ad border border-linha bg-superficie px-5 py-10 text-center text-tinta-suave">Nenhum lançamento com esses filtros.</p>;
  }
  const th = "px-2.5 py-3 font-normal";
  return (
    <>
      {/* Computador: as colunas da planilha, compactadas */}
      <div className="hidden overflow-x-auto rounded-ad border border-linha bg-superficie lg:block">
        <table className="numeros w-full text-left text-[0.8125rem]">
          <thead className="rotulo text-[0.625rem]">
            <tr className="border-b border-linha">
              <th className={th}>Arquiteto(a)</th>
              <th className={th}>Cliente · NF</th>
              <th className={th}>Mês · pedido</th>
              <th className={`${th} text-right`}>Compra</th>
              <th className={`${th} text-right`}>RT</th>
              <th className={th}>Cliente</th>
              <th className={`${th} text-right`}>Paga</th>
              <th className={`${th} text-right`}>A pagar</th>
              <th className={th}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className={`border-t border-linha align-top hover:bg-fundo ${l.cancelado ? "opacity-55" : ""}`}>
                <td className="px-2.5 py-3">
                  <Link href={`/rt/${l.id}`} className="text-tinta underline-offset-4 hover:underline">
                    {l.arquiteto_nome}
                  </Link>
                  <span className="block text-xs text-tinta-suave">{l.acompanhou ? "Acompanhou" : "Não acompanhou"}</span>
                </td>
                <td className="max-w-44 px-2.5 py-3">
                  <span className="block truncate">{l.cliente_nome || "—"}</span>
                  <span className="block text-xs text-tinta-suave">{l.nota_fiscal ? `NF ${l.nota_fiscal}` : "Sem NF"}</span>
                </td>
                <td className="px-2.5 py-3 whitespace-nowrap">
                  {mesCurto(l.mes_ref)}
                  <span className="block text-xs text-tinta-suave">{fData(l.data_pedido)}</span>
                </td>
                <td className="px-2.5 py-3 text-right whitespace-nowrap">{moeda(l.valor_compra)}</td>
                <td className="px-2.5 py-3 text-right whitespace-nowrap text-tinta">
                  {moeda(l.valor_rt)}
                  <span className="block text-xs text-tinta-suave">{String(l.pct).replace(".", ",")}%</span>
                </td>
                <td className="px-2.5 py-3">
                  <EtiquetaCliente s={l.situacao_cliente} curta />
                </td>
                <td className="px-2.5 py-3 text-right whitespace-nowrap">{moeda(l.pago)}</td>
                <td className={`px-2.5 py-3 text-right whitespace-nowrap ${l.saldo_a_pagar > 0 ? "text-perigo" : ""}`}>{moeda(l.saldo_a_pagar)}</td>
                <td className="px-2.5 py-3">
                  <EtiquetaRt s={l.situacao_rt} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-tinta text-tinta">
              <td className="px-2.5 py-3" colSpan={3}>
                Total ({linhas.length})
              </td>
              <td className="px-2.5 py-3 text-right whitespace-nowrap">{moeda(somar(linhas, "valor_compra"))}</td>
              <td className="px-2.5 py-3 text-right whitespace-nowrap">{moeda(somar(linhas, "valor_rt"))}</td>
              <td />
              <td className="px-2.5 py-3 text-right whitespace-nowrap">{moeda(somar(linhas, "pago"))}</td>
              <td className="px-2.5 py-3 text-right whitespace-nowrap">{moeda(somar(linhas, "saldo_a_pagar"))}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Celular/tablet: cartões */}
      <ul className="space-y-3 lg:hidden">
        {linhas.map((l) => (
          <li key={l.id}>
            <Link href={`/rt/${l.id}`} className={`block rounded-ad border border-linha bg-superficie p-4 ${l.cancelado ? "opacity-55" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <span>
                  <span className="block text-tinta">{l.arquiteto_nome}</span>
                  <span className="text-sm text-tinta-suave">
                    {l.cliente_nome || "—"} · {mesCurto(l.mes_ref)}
                  </span>
                </span>
                <EtiquetaRt s={l.situacao_rt} />
              </div>
              <dl className="numeros mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-tinta-suave">Compra</dt>
                  <dd>{moeda(l.valor_compra)}</dd>
                </div>
                <div>
                  <dt className="text-tinta-suave">RT ({String(l.pct).replace(".", ",")}%)</dt>
                  <dd>{moeda(l.valor_rt)}</dd>
                </div>
                <div>
                  <dt className="text-tinta-suave">A pagar</dt>
                  <dd className={l.saldo_a_pagar > 0 ? "text-perigo" : ""}>{moeda(l.saldo_a_pagar)}</dd>
                </div>
              </dl>
              <div className="mt-3">
                <EtiquetaCliente s={l.situacao_cliente} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default async function Rt({ searchParams }: { searchParams: Promise<Busca> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const aba = sp.aba === "pagar" || sp.aba === "arquitetos" ? sp.aba : "lancamentos";
  const supabase = await supabaseServidor();

  const [{ data: cfg }, { data: meses }, { data: arquitetos }] = await Promise.all([
    supabase.from("rt_config").select("pct_padrao, liberacao").eq("id", 1).single(),
    supabase.from("rt_lancamentos").select("mes_ref").order("mes_ref", { ascending: false }).limit(2000),
    supabase.from("arquitetos").select("id, nome, telefone, pix, pct_rt, ativo, orcamentos(count)").order("nome"),
  ]);
  const listaMeses = [...new Set((meses ?? []).map((m) => (m.mes_ref as string).slice(0, 7)))];
  const arqs = (arquitetos ?? []) as Array<{ id: string; nome: string; telefone: string | null; pix: string | null; pct_rt: number | null; ativo: boolean; orcamentos: { count: number }[] }>;

  const filtros = { mes: sp.mes ?? "aberto", arquiteto: sp.arquiteto, situacao: sp.situacao };
  const linhas = aba === "lancamentos" ? await lerLancamentos(filtros) : aba === "pagar" ? await lerLancamentos({ mes: "todos" }) : [];
  const exportar = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v) as [string, string][]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <Titulo sobrancelha="Reserva técnica" italico="arquitetos.">
          RT
        </Titulo>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a href={`/rt/exportar?${exportar}`} download className={classeBotao("secundario")}>
            Exportar Excel
          </a>
          <BotaoLink href="/rt/novo">Novo lançamento</BotaoLink>
        </div>
      </div>

      {sp.ok === "excluido" && (
        <div className="mb-6">
          <Aviso tipo="ok">Lançamento excluído.</Aviso>
        </div>
      )}

      <section className="mb-8 grid gap-5 rounded-ad border border-linha bg-superficie p-4 shadow-ad sm:grid-cols-[10rem_1fr] sm:p-6" aria-label="Regras da RT">
        <CampoAuto
          salvarCampo={salvarConfigRt}
          campo="pct_padrao"
          rotulo="% padrão de RT"
          inicial={String(cfg?.pct_padrao ?? 5).replace(".", ",").replace(/,00$/, "")}
          inputMode="decimal"
        />
        <SelecaoAuto
          salvarCampo={salvarConfigRt}
          campo="liberacao"
          rotulo="Quando a RT pode ser paga"
          inicial={cfg?.liberacao ?? "proporcional"}
          opcoes={[
            { valor: "proporcional", rotulo: "Aos poucos, conforme o cliente paga (proporcional)" },
            { valor: "quitado", rotulo: "Só quando o cliente pagar tudo" },
          ]}
        />
        <p className="text-sm text-tinta-suave sm:col-span-2">
          O % padrão vale para novas indicações (um arquiteto pode ter % próprio no cadastro). A RT nunca aparece para o vendedor nem no PDF do cliente.
        </p>
      </section>

      <Abas atual={aba} />

      {aba === "lancamentos" && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <FiltroUrl
              param="mes"
              rotulo="Mês"
              opcoes={[
                { valor: "", rotulo: "Em aberto (falta resolver)" },
                { valor: "todos", rotulo: "Todos os meses" },
                ...listaMeses.map((m) => ({ valor: m, rotulo: nomeMes(m) })),
              ]}
            />
            <FiltroUrl param="arquiteto" rotulo="Arquiteto(a)" opcoes={[{ valor: "", rotulo: "Todos os arquitetos" }, ...arqs.map((a) => ({ valor: a.id, rotulo: a.nome }))]} />
            <FiltroUrl param="situacao" rotulo="Situação" opcoes={[{ valor: "", rotulo: "Todas as situações" }, ...Object.entries(FILTRO_SITUACAO).map(([v, r]) => ({ valor: v, rotulo: r }))]} />
          </div>

          <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Totais do filtro">
            <Indicador rotulo="Compras indicadas" valor={somar(linhas.filter((l) => !l.cancelado), "valor_compra")} detalhe={`${linhas.filter((l) => !l.cancelado).length} venda(s)`} />
            <Indicador rotulo="RT total" valor={somar(linhas.filter((l) => !l.cancelado), "valor_rt")} />
            <Indicador rotulo="RT já paga" valor={somar(linhas.filter((l) => !l.cancelado), "pago")} />
            <Indicador rotulo="RT a pagar agora" valor={somar(linhas.filter((l) => !l.cancelado), "saldo_a_pagar")} detalhe="liberada pelo que o cliente já pagou" destaque />
          </section>

          <TabelaLancamentos linhas={linhas} />
        </>
      )}

      {aba === "pagar" && (
        <PorArquiteto linhas={linhas.filter((l) => !l.cancelado)} />
      )}

      {aba === "arquitetos" && (
        <section>
          <NovoArquiteto />
          <ul className="mt-6 divide-y divide-linha rounded-ad border border-linha bg-superficie">
            {arqs.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/rt/arquitetos/${a.id}`}
                  className={`grid gap-1 px-5 py-4 hover:bg-fundo sm:grid-cols-[1.4fr_1fr_1.4fr_5rem_6rem] sm:items-center sm:gap-4 ${a.ativo ? "" : "opacity-55"}`}
                >
                  <span className="text-tinta">{a.nome}</span>
                  <span className="text-sm text-tinta-suave">{a.telefone || "—"}</span>
                  <span className="truncate text-sm text-tinta-suave">{a.pix ? `PIX: ${a.pix}` : "Sem PIX cadastrado"}</span>
                  <span className="text-sm text-tinta-suave">{a.pct_rt != null ? `${String(a.pct_rt).replace(".", ",")}%` : "% padrão"}</span>
                  <span className="rotulo">{a.orcamentos?.[0]?.count ?? 0} orçam.</span>
                </Link>
              </li>
            ))}
            {!arqs.length && <li className="px-5 py-8 text-center text-tinta-suave">Os arquitetos aparecem aqui assim que forem usados num orçamento.</li>}
          </ul>
        </section>
      )}
    </>
  );
}

function PorArquiteto({ linhas }: { linhas: LinhaRt[] }) {
  const grupos = new Map<string, LinhaRt[]>();
  for (const l of linhas) grupos.set(l.arquiteto_id, [...(grupos.get(l.arquiteto_id) ?? []), l]);
  const lista = [...grupos.values()]
    .map((g) => ({
      id: g[0].arquiteto_id,
      nome: g[0].arquiteto_nome,
      pix: g[0].arquiteto_pix,
      telefone: g[0].arquiteto_telefone,
      vendas: g.length,
      rt: somar(g, "valor_rt"),
      pago: somar(g, "pago"),
      saldo: somar(g, "saldo_a_pagar"),
      aguardando: Math.round((somar(g, "valor_rt") - somar(g, "rt_liberado")) * 100) / 100,
    }))
    .sort((a, b) => b.saldo - a.saldo || a.nome.localeCompare(b.nome));

  if (!lista.length) return <p className="rounded-ad border border-linha bg-superficie px-5 py-10 text-center text-tinta-suave">Nenhuma RT registrada ainda.</p>;

  return (
    <ul className="space-y-3">
      {lista.map((a) => (
        <li key={a.id} className="rounded-ad border border-linha bg-superficie p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-tinta">{a.nome}</p>
              <p className="text-sm text-tinta-suave">{a.pix ? `PIX: ${a.pix}` : "Sem PIX cadastrado"}{a.telefone ? ` · ${a.telefone}` : ""}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="rotulo text-[0.6875rem]">A pagar agora</p>
              <p className={`numeros text-2xl ${a.saldo > 0 ? "text-perigo" : "text-tinta"}`}>{moeda(a.saldo)}</p>
            </div>
          </div>
          <dl className="numeros mt-3 grid grid-cols-2 gap-2 border-t border-linha pt-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-tinta-suave">Vendas</dt>
              <dd>{a.vendas}</dd>
            </div>
            <div>
              <dt className="text-tinta-suave">RT total</dt>
              <dd>{moeda(a.rt)}</dd>
            </div>
            <div>
              <dt className="text-tinta-suave">Já pago</dt>
              <dd>{moeda(a.pago)}</dd>
            </div>
            <div>
              <dt className="text-tinta-suave">Aguardando cliente</dt>
              <dd>{moeda(a.aguardando)}</dd>
            </div>
          </dl>
          <Link href={`/rt?aba=lancamentos&mes=todos&arquiteto=${a.id}`} className="mt-3 inline-flex min-h-10 items-center text-sm text-bronze underline-offset-4 hover:underline">
            Ver lançamentos →
          </Link>
        </li>
      ))}
    </ul>
  );
}
