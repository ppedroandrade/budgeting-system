import Link from "next/link";
import { GraficoMensal, type Mes } from "./GraficoMensal";
import { Titulo } from "@/components/ui/Titulo";
import { exigirAdmin } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { data as fData, moeda } from "@/lib/formato";

type LinhaMes = { mes: string; aprovado: string; em_aberto: string; vencido: string; perdido: string; qtd_total: number; qtd_aprovado: number };
type LinhaVendedor = { vendedor_id: string; nome: string; ativo: boolean; qtd_total: number; qtd_aprovado: number; aprovado: string; em_aberto: string; vencido: string };
type Acompanhar = { id: string; numero: string; cliente_nome: string; vendedor_nome: string; validade: string; situacao: string; total_vista: string };

function hojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function Indicador({ rotulo, valor, detalhe, cor }: { rotulo: string; valor: string; detalhe?: string; cor?: string }) {
  return (
    <div className="rounded-ad border border-linha bg-superficie p-5 shadow-ad">
      <p className="flex items-center gap-2 text-sm text-tinta-suave">
        {cor && <span className="inline-block size-2.5 rounded-sm" style={{ background: cor }} aria-hidden />}
        {rotulo}
      </p>
      <p className="numeros mt-2 text-xl font-normal whitespace-nowrap text-tinta sm:text-3xl">{valor}</p>
      {detalhe && <p className="mt-1 text-sm text-tinta-suave">{detalhe}</p>}
    </div>
  );
}

export default async function Painel() {
  await exigirAdmin();
  const supabase = await supabaseServidor();
  const hoje = hojeSP();
  const inicioMes = `${hoje.slice(0, 8)}01`;
  const em3dias = new Date(Date.parse(hoje) + 3 * 86400000).toISOString().slice(0, 10);
  const ha30dias = new Date(Date.parse(hoje) - 30 * 86400000).toISOString().slice(0, 10);

  const [mensal, vendedores, acompanhar] = await Promise.all([
    supabase.rpc("painel_mensal", { p_meses: 6 }),
    supabase.rpc("painel_vendedores", { p_inicio: inicioMes, p_fim: hoje }),
    supabase
      .from("orcamentos_lista")
      .select("id, numero, cliente_nome, vendedor_nome, validade, situacao, total_vista")
      .in("status", ["rascunho", "enviado"])
      .gte("validade", ha30dias)
      .lte("validade", em3dias)
      .order("validade")
      .limit(10)
      .returns<Acompanhar[]>(),
  ]);

  const linhasMes = (mensal.data ?? []) as LinhaMes[];
  const linhasVend = (vendedores.data ?? []) as LinhaVendedor[];
  const meses: Mes[] = linhasMes.map((m) => ({
    mes: m.mes,
    aprovado: Number(m.aprovado),
    em_aberto: Number(m.em_aberto),
    vencido: Number(m.vencido),
  }));
  const atual = linhasMes.at(-1);
  const conversao = atual && Number(atual.qtd_total) > 0 ? Math.round((Number(atual.qtd_aprovado) / Number(atual.qtd_total)) * 100) : null;

  return (
    <>
      <Titulo sobrancelha="Painel" italico="do mês." className="mb-8">
        Visão geral
      </Titulo>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Indicadores deste mês">
        <Indicador rotulo="Aprovado" cor="#1f8a5c" valor={moeda(atual?.aprovado)} detalhe={`${atual?.qtd_aprovado ?? 0} orçamento(s)`} />
        <Indicador rotulo="Em aberto" cor="#c98a1e" valor={moeda(atual?.em_aberto)} detalhe="aguardando o cliente" />
        <Indicador rotulo="Vencido" cor="#b8432f" valor={moeda(atual?.vencido)} detalhe="ficou para trás" />
        <Indicador
          rotulo="Conversão"
          valor={conversao === null ? "—" : `${conversao}%`}
          detalhe={`${atual?.qtd_aprovado ?? 0} de ${atual?.qtd_total ?? 0} orçamentos`}
        />
      </section>
      <p className="mt-3 text-sm text-tinta-suave">Valores pelo total à vista, contando os orçamentos criados neste mês.</p>

      <section className="mt-10 rounded-ad border border-linha bg-superficie p-5 shadow-ad sm:p-8">
        <h2 className="mb-6 font-display text-2xl">
          Últimos <em className="text-bronze">6 meses</em>
        </h2>
        <GraficoMensal meses={meses} />
      </section>

      <div className="mt-10 grid grid-cols-1 gap-10 xl:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
        <section>
          <h2 className="mb-4 font-display text-2xl">
            Por <em className="text-bronze">vendedor</em> <span className="text-base text-tinta-suave not-italic">· este mês</span>
          </h2>
          <div className="overflow-x-auto rounded-ad border border-linha bg-superficie">
            <table className="numeros w-full min-w-[520px] text-left text-sm whitespace-nowrap">
              <thead className="rotulo">
                <tr>
                  <th className="px-4 py-3 font-normal">Vendedor</th>
                  <th className="px-4 py-3 text-right font-normal">Orçam.</th>
                  <th className="px-4 py-3 text-right font-normal">Aprovado</th>
                  <th className="px-4 py-3 text-right font-normal">Em aberto</th>
                  <th className="px-4 py-3 text-right font-normal">Vencido</th>
                </tr>
              </thead>
              <tbody>
                {linhasVend.map((v) => (
                  <tr key={v.vendedor_id} className={`border-t border-linha ${v.ativo ? "" : "opacity-55"}`}>
                    <td className="px-4 py-3 text-tinta">{v.nome}</td>
                    <td className="px-4 py-3 text-right">
                      {v.qtd_aprovado}/{v.qtd_total}
                    </td>
                    <td className="px-4 py-3 text-right text-tinta">{moeda(v.aprovado)}</td>
                    <td className="px-4 py-3 text-right">{moeda(v.em_aberto)}</td>
                    <td className="px-4 py-3 text-right">{moeda(v.vencido)}</td>
                  </tr>
                ))}
                {!linhasVend.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-tinta-suave">
                      Nenhum vendedor cadastrado ainda. <Link href="/vendedores/novo" className="underline">Cadastrar</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl">
            Para <em className="text-bronze">acompanhar</em>
          </h2>
          <p className="-mt-2 mb-4 text-sm text-tinta-suave">Vencendo em até 3 dias ou vencidos há menos de 30 dias.</p>
          <ul className="divide-y divide-linha rounded-ad border border-linha bg-superficie">
            {(acompanhar.data ?? []).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span>
                  <span className="text-tinta">{o.cliente_nome || "Sem cliente"}</span>
                  <span className="block text-tinta-suave">
                    {o.numero} · {o.vendedor_nome}
                  </span>
                </span>
                <span className="numeros text-right">
                  <span className="block text-tinta">{moeda(o.total_vista)}</span>
                  <span className={o.situacao === "vencido" ? "text-perigo" : "text-atencao"}>
                    {o.situacao === "vencido" ? "Venceu" : "Vence"} {fData(o.validade)}
                  </span>
                </span>
              </li>
            ))}
            {!acompanhar.data?.length && <li className="px-4 py-6 text-center text-sm text-tinta-suave">Nada pendente por aqui.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
