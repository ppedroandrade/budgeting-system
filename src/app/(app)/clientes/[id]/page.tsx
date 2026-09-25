import Link from "next/link";
import { notFound } from "next/navigation";
import { salvarCampoCliente } from "../actions";
import { EtiquetaSituacao } from "@/components/orcamentos/EtiquetaSituacao";
import { BotaoLink } from "@/components/ui/Botao";
import { CampoAuto } from "@/components/ui/CampoAuto";
import { Titulo } from "@/components/ui/Titulo";
import { data as fData, moeda } from "@/lib/formato";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseServidor } from "@/lib/supabase/server";
import { COLUNAS_CLIENTE, type Cliente, type Situacao } from "@/lib/tipos";

type Orc = { id: string; numero: string; data: string; validade: string; situacao: Situacao; total_vista: string; vendedor_nome: string };

export default async function DetalheCliente({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const supabase = await supabaseServidor();
  const [{ data: c }, { data: orcs }] = await Promise.all([
    supabase.from("clientes").select(`${COLUNAS_CLIENTE}, criado_por`).eq("id", id).maybeSingle<Cliente & { criado_por: string }>(),
    supabase.from("orcamentos_lista").select("id, numero, data, validade, situacao, total_vista, vendedor_nome").eq("cliente_id", id).order("data", { ascending: false }).order("numero", { ascending: false }).returns<Orc[]>(),
  ]);
  if (!c) notFound();

  const podeEditar = usuario.perfil === "admin" || c.criado_por === usuario.id;
  const salvar = salvarCampoCliente.bind(null, c.id);

  return (
    <>
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <Titulo sobrancelha="Cliente" italico={c.nome}>
          {""}
        </Titulo>
        <BotaoLink href={`/orcamentos/novo?cliente=${c.id}`}>Novo orçamento</BotaoLink>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] [&>*]:min-w-0">
        <section className="rounded-ad border border-linha bg-superficie p-5 shadow-ad sm:p-8">
          <h2 className="mb-6 font-display text-2xl">
            Dados do <em className="text-bronze">cliente</em>
          </h2>
          {podeEditar ? (
            <div className="space-y-5">
              <CampoAuto salvarCampo={salvar} campo="nome" rotulo="Nome" inicial={c.nome} />
              <CampoAuto salvarCampo={salvar} campo="cpf_cnpj" rotulo="CPF / CNPJ" inicial={c.cpf_cnpj ?? ""} inputMode="numeric" />
              <CampoAuto salvarCampo={salvar} campo="telefone" rotulo="Telefone / WhatsApp" inicial={c.telefone ?? ""} inputMode="tel" />
              <CampoAuto salvarCampo={salvar} campo="email" rotulo="E-mail" inicial={c.email ?? ""} inputMode="email" />
              <CampoAuto salvarCampo={salvar} campo="endereco" rotulo="Endereço da obra" inicial={c.endereco ?? ""} />
              <p className="text-sm text-tinta-suave">Salva sozinho. Orçamentos já feitos continuam com os dados da época.</p>
            </div>
          ) : (
            <dl className="space-y-4">
              {(
                [
                  ["CPF / CNPJ", c.cpf_cnpj],
                  ["Telefone", c.telefone],
                  ["E-mail", c.email],
                  ["Endereço da obra", c.endereco],
                ] as const
              ).map(([r, v]) => (
                <div key={r}>
                  <dt className="rotulo">{r}</dt>
                  <dd className="text-tinta">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl">
            Histórico de <em className="text-bronze">orçamentos</em>
          </h2>
          {orcs?.length ? (
            <ul className="divide-y divide-linha rounded-ad border border-linha bg-superficie">
              {orcs.map((o) => (
                <li key={o.id}>
                  <Link href={`/orcamentos/${o.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-fundo">
                    <span>
                      <span className="numeros block text-tinta">{o.numero}</span>
                      <span className="text-sm text-tinta-suave">
                        {fData(o.data)} · {o.vendedor_nome}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1.5">
                      <span className="numeros text-tinta">{moeda(o.total_vista)}</span>
                      <EtiquetaSituacao situacao={o.situacao} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-ad border border-linha bg-superficie px-5 py-8 text-center text-tinta-suave">Nenhum orçamento ainda.</p>
          )}
        </section>
      </div>
    </>
  );
}
