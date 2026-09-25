import Link from "next/link";
import { AcoesLinha } from "@/components/orcamentos/AcoesLinha";
import { EtiquetaSituacao } from "@/components/orcamentos/EtiquetaSituacao";
import { BotaoLink } from "@/components/ui/Botao";
import { Busca, FiltroUrl } from "@/components/ui/Busca";
import { Titulo } from "@/components/ui/Titulo";
import { data as fData, moeda } from "@/lib/formato";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { SITUACOES, type Situacao } from "@/lib/tipos";

type Linha = {
  id: string; numero: string; data: string; validade: string; status: string; situacao: Situacao;
  total_vista: string; cliente_nome: string; vendedor_nome: string; cliente_telefone: string; consultor_nome: string;
};

const POR_PAGINA = 50;

export default async function Orcamentos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; situacao?: string; vendedor?: string; limite?: string }>;
}) {
  const usuario = await exigirUsuario();
  const admin = usuario.perfil === "admin";
  const sp = await searchParams;
  const limite = Math.min(Number(sp.limite) || POR_PAGINA, 2000);
  const supabase = await supabaseServidor();

  let q = supabase
    .from("orcamentos_lista")
    .select("id, numero, data, validade, status, situacao, total_vista, cliente_nome, vendedor_nome, cliente_telefone, consultor_nome", { count: "exact" })
    .order("ano", { ascending: false })
    .order("sequencial", { ascending: false })
    .limit(limite);
  const termo = (sp.q ?? "").replace(/[%_,()*\\]/g, " ").trim();
  if (termo) q = q.or(`numero.ilike.*${termo}*,cliente_nome.ilike.*${termo}*`);
  if (sp.situacao && sp.situacao in SITUACOES) q = q.eq("situacao", sp.situacao);
  if (admin && sp.vendedor) q = q.eq("vendedor_id", sp.vendedor);

  const [{ data, count }, { data: vendedores }] = await Promise.all([
    q.returns<Linha[]>(),
    admin ? supabase.from("usuarios").select("id, nome").order("nome") : Promise.resolve({ data: [] }),
  ]);
  const lista = data ?? [];
  const mais = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
  mais.set("limite", String(limite + POR_PAGINA));

  return (
    <>
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <Titulo italico={admin ? "da loja." : "meus."}>Orçamentos</Titulo>
        <BotaoLink href="/orcamentos/novo">Novo orçamento</BotaoLink>
      </div>

      <div className={`mb-6 grid gap-3 ${admin ? "sm:grid-cols-[1fr_12rem_14rem]" : "sm:grid-cols-[1fr_12rem]"}`}>
        <Busca placeholder="Buscar por cliente ou número" />
        <FiltroUrl
          param="situacao"
          rotulo="Filtrar por status"
          opcoes={[{ valor: "", rotulo: "Todos os status" }, ...Object.entries(SITUACOES).map(([v, s]) => ({ valor: v, rotulo: s.rotulo }))]}
        />
        {admin && (
          <FiltroUrl
            param="vendedor"
            rotulo="Filtrar por vendedor"
            opcoes={[{ valor: "", rotulo: "Todos os vendedores" }, ...((vendedores ?? []) as Array<{ id: string; nome: string }>).map((v) => ({ valor: v.id, rotulo: v.nome }))]}
          />
        )}
      </div>

      {lista.length === 0 ? (
        <p className="rounded-ad border border-linha bg-superficie px-5 py-12 text-center text-tinta-suave">
          {sp.q || sp.situacao || sp.vendedor ? "Nenhum orçamento encontrado com esses filtros." : "Nenhum orçamento ainda. Toque em “Novo orçamento” para começar."}
        </p>
      ) : (
        <ul className="divide-y divide-linha rounded-ad border border-linha bg-superficie">
          {lista.map((o) => {
            return (
              <li key={o.id} className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <Link href={`/orcamentos/${o.id}`} className="grid gap-1 sm:grid-cols-[6.5rem_minmax(0,1.5fr)_minmax(0,1fr)_8rem_auto] sm:items-center sm:gap-4">
                  <span className="numeros text-sm text-tinta-suave">{o.numero}</span>
                  <span className="truncate text-tinta">{o.cliente_nome || "Sem cliente"}</span>
                  <span className="truncate text-sm text-tinta-suave">
                    {admin && `${o.vendedor_nome} · `}
                    {fData(o.data)} → {fData(o.validade)}
                  </span>
                  <span className="numeros text-tinta sm:text-right">{moeda(o.total_vista)}</span>
                  <span>
                    <EtiquetaSituacao situacao={o.situacao} />
                  </span>
                </Link>
                <AcoesLinha
                  status={o.status}
                  d={{
                    id: o.id,
                    numero: o.numero,
                    cliente: o.cliente_nome,
                    telefone: o.cliente_telefone,
                    validade: o.validade,
                    consultor: o.consultor_nome,
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-center text-sm text-tinta-suave">
        {lista.length} de {count ?? lista.length} orçamento(s) · valores à vista
      </p>
      {(count ?? 0) > lista.length && (
        <div className="mt-4 text-center">
          <BotaoLink href={`/orcamentos?${mais}`} variante="secundario" scroll={false}>
            Mostrar mais
          </BotaoLink>
        </div>
      )}
    </>
  );
}
