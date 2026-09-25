"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BlocoCliente } from "./BlocoCliente";
import { BuscaProdutos } from "./BuscaProdutos";
import { baixarPdfBlob, compartilhar, marcarEnviado, salvarArquivo, type DadosEnvio } from "./compartilhar";
import { EtiquetaSituacao } from "./EtiquetaSituacao";
import { ListaItens } from "./ListaItens";
import { TotaisLateral, TotaisRodape } from "./Totais";
import { apagarRascunhoLocal, lerRascunhoLocal, useSalvamento } from "./useSalvamento";
import { Botao } from "@/components/ui/Botao";
import { classeEntrada } from "@/components/ui/CampoAuto";
import { Aviso } from "@/components/ui/Campo";
import { formatarCentavos, paraCampoMoeda } from "@/lib/calculo";
import { data as fData } from "@/lib/formato";
import {
  FORMAS_PAGAMENTO, calcularForm, hojeISO, situacao, type FormaPagamento, type ItemForm, type OrcamentoForm, type Status,
} from "@/lib/orcamento";
import { supabaseNavegador } from "@/lib/supabase/client";
import { nomeArquivoPdf } from "@/lib/texto";
import type { Produto } from "@/lib/tipos";

export type PropsEditor = {
  inicial: OrcamentoForm;
  atualizadoEm: string | null;
  usuario: { id: string; nome: string; admin: boolean };
  vendedores: Array<{ id: string; nome: string; whatsapp: string | null }>;
  arquitetos: string[];
  pctPadrao: string;
};

function Secao({ titulo, italico, children, id }: { titulo: string; italico: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-ad border border-linha bg-superficie p-4 shadow-ad sm:p-7">
      <h2 className="mb-5 font-display text-2xl">
        {titulo} <em className="text-bronze">{italico}</em>
      </h2>
      {children}
    </section>
  );
}

function Rotulo({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="rotulo mb-1.5 block">
      {children}
    </label>
  );
}

const STATUS: Array<[Status, string]> = [
  ["rascunho", "Rascunho"],
  ["enviado", "Enviado"],
  ["aprovado", "Aprovado"],
  ["perdido", "Perdido"],
];

/** Recupera o que ficou só no aparelho (aba fechada antes de salvar). Roda só no navegador. */
function estadoInicial(p: PropsEditor): { form: OrcamentoForm; recuperado: boolean } {
  const local = lerRascunhoLocal(p.inicial.id);
  const base = p.atualizadoEm ? Date.parse(p.atualizadoEm) : 0;
  if (local && local.form?.id === p.inicial.id && local.em > base && JSON.stringify(local.form) !== JSON.stringify(p.inicial)) {
    return { form: local.form, recuperado: true };
  }
  return { form: p.inicial, recuperado: false };
}

export default function Editor(props: PropsEditor) {
  const { usuario, vendedores, arquitetos, pctPadrao } = props;
  const router = useRouter();
  const [{ form, recuperado }, setEstado] = useState(() => estadoInicial(props));
  const setForm = (fn: (f: OrcamentoForm) => OrcamentoForm) => setEstado((e) => ({ ...e, form: fn(e.form) }));
  const muda = <K extends keyof OrcamentoForm>(k: K, v: OrcamentoForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const [buscando, setBuscando] = useState(false);
  const [acao, setAcao] = useState<"" | "pdf" | "compartilhar" | "duplicar">("");
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro" | "info"; texto: string } | null>(null);
  const [envioPendente, setEnvioPendente] = useState<{ d: DadosEnvio; blob: Blob } | null>(null);

  const { estado, mensagem, salvoEm, salvarAgora } = useSalvamento(form, {
    admin: usuario.admin,
    base: props.inicial,
    aoCriar: (r) => {
      setForm((f) => ({ ...f, id: r.id, numero: r.numero, cliente: f.cliente ? { ...f.cliente, id: r.cliente_id } : null }));
      window.history.replaceState(null, "", `/orcamentos/${r.id}`);
    },
    aoSalvar: (r) =>
      setForm((f) => (f.cliente && !f.cliente.id && r.cliente_id ? { ...f, cliente: { ...f.cliente, id: r.cliente_id } } : f)),
  });

  const { itens: calculados, totais } = useMemo(() => calcularForm(form), [form]);
  const hoje = hojeISO();
  const sit = situacao(form.status, form.validade, hoje);
  const descontoInvalido = totais.total_vista < 0n || totais.total_prazo < 0n;
  const consultor = vendedores.find((v) => v.id === form.vendedor_id);

  function adicionar(p: Produto) {
    const ultimoAmbiente = form.itens.at(-1)?.ambiente ?? "";
    const item: ItemForm = {
      id: crypto.randomUUID(),
      produto_id: p.id,
      marca: p.marca,
      nome: p.nome,
      referencia: p.referencia,
      acabamento: p.acabamento,
      unidade: p.unidade,
      foto_url: p.foto_url,
      ambiente: ultimoAmbiente,
      qtd: "1",
      preco: paraCampoMoeda(p.preco_base),
      pct: pctPadrao,
      preco_catalogo: paraCampoMoeda(p.preco_base),
    };
    setForm((f) => ({ ...f, itens: [...f.itens, item] }));
    setBuscando(false);
    setTimeout(() => document.getElementById(`item-${item.id}-qtd`)?.focus(), 50);
  }

  async function garantirSalvo(): Promise<{ id: string; numero: string } | null> {
    const r = await salvarAgora();
    if (!r) {
      setAviso({ tipo: "erro", texto: "Antes, preencha o cliente ou adicione itens, e corrija os campos em vermelho." });
      return null;
    }
    return r;
  }

  const dadosEnvio = ({ id, numero }: { id: string; numero: string }): DadosEnvio => ({
    id,
    numero,
    cliente: form.cliente?.nome ?? "",
    telefone: form.cliente?.telefone ?? "",
    validade: form.validade,
    consultor: consultor?.nome ?? usuario.nome,
  });

  async function gerarPdf() {
    setAcao("pdf");
    setAviso(null);
    try {
      const salvo = await garantirSalvo();
      if (!salvo) return;
      salvarArquivo(await baixarPdfBlob(salvo.id), nomeArquivoPdf(salvo.numero, form.cliente?.nome ?? ""));
    } catch (e) {
      setAviso({ tipo: "erro", texto: e instanceof Error ? e.message : "Falha ao gerar o PDF." });
    } finally {
      setAcao("");
    }
  }

  async function aposEnvio(id: string, r: Awaited<ReturnType<typeof compartilhar>>) {
    if (r === "cancelado") return;
    if (r === "precisa-toque") return;
    if (form.status === "rascunho") {
      const novo = await marcarEnviado(id);
      if (novo === "enviado") setForm((f) => ({ ...f, status: "enviado" }));
    }
    setAviso({ tipo: "ok", texto: r === "whatsapp" ? "PDF baixado e WhatsApp aberto com a mensagem pronta." : "Orçamento compartilhado." });
  }

  async function compartilharAgora() {
    setAcao("compartilhar");
    setAviso(null);
    const computador = !window.matchMedia("(pointer: coarse)").matches;
    // No computador, a janela do WhatsApp é aberta já no clique (senão o navegador bloqueia).
    const janela = computador ? window.open("about:blank", "_blank") : null;
    try {
      const salvo = await garantirSalvo();
      if (!salvo) return janela?.close();
      const d = dadosEnvio(salvo);
      const blob = await baixarPdfBlob(salvo.id);
      const r = await compartilhar(d, blob, janela);
      if (r === "precisa-toque") setEnvioPendente({ d, blob });
      await aposEnvio(salvo.id, r);
    } catch (e) {
      janela?.close();
      setAviso({ tipo: "erro", texto: e instanceof Error ? e.message : "Falha ao compartilhar." });
    } finally {
      setAcao("");
    }
  }

  async function duplicar() {
    setAcao("duplicar");
    try {
      const salvo = await garantirSalvo();
      if (!salvo) return setAcao("");
      const { data, error } = await supabaseNavegador().rpc("duplicar_orcamento", { p_id: salvo.id });
      if (error || !data) throw new Error("Não foi possível duplicar.");
      router.push(`/orcamentos/${data}?duplicado=1`);
    } catch (e) {
      setAviso({ tipo: "erro", texto: e instanceof Error ? e.message : "Falha ao duplicar." });
      setAcao("");
    }
  }

  const status = (
    <span aria-live="polite" className={estado === "erro" || estado === "pendente" ? "text-perigo" : estado === "salvo" ? "text-sucesso" : "text-tinta-suave"}>
      {estado === "salvando" && "Salvando…"}
      {estado === "salvo" && (salvoEm ? `✓ Salvo às ${salvoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "✓ Salvo")}
      {(estado === "erro" || estado === "pendente") && mensagem}
      {estado === "ocioso" && "Salva sozinho enquanto você digita"}
    </span>
  );

  return (
    <div className="pb-28 lg:pb-0">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <header>
          <p className="sobrancelha mb-2">{form.numero ? `Orçamento ${form.numero}` : "Novo orçamento"}</p>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            {form.cliente?.nome.trim() ? form.cliente.nome : "Orçamento"} <em className="text-bronze">{form.numero ? "" : "novo."}</em>
          </h1>
        </header>
        <div className="text-sm lg:hidden">{status}</div>
      </div>

      {recuperado && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-ad border border-atencao/40 bg-atencao/5 px-4 py-3 text-sm">
          <span>Recuperamos alterações que ficaram só neste aparelho. Elas já estão sendo salvas.</span>
          <button
            type="button"
            className="min-h-10 underline underline-offset-4"
            onClick={() => {
              apagarRascunhoLocal(props.inicial.id);
              setEstado({ form: props.inicial, recuperado: false });
            }}
          >
            Descartar e voltar ao salvo
          </button>
        </div>
      )}
      {aviso && (
        <div className="mb-6">
          <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>
        </div>
      )}
      {envioPendente && (
        <div className="mb-6 rounded-ad border border-linha bg-superficie p-4">
          <p className="mb-3 text-sm">O PDF está pronto.</p>
          <Botao
            onClick={async () => {
              const { d, blob } = envioPendente;
              setEnvioPendente(null);
              await aposEnvio(d.id, await compartilhar(d, blob));
            }}
          >
            Enviar agora
          </Botao>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          {/* a) Cabeçalho */}
          <Secao titulo="Dados do" italico="orçamento">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="rotulo mb-1.5">Número</p>
                <p className="numeros flex min-h-12 items-center text-tinta">{form.numero ?? "Gerado ao salvar"}</p>
              </div>
              <div>
                <p className="rotulo mb-1.5">Data</p>
                <p className="numeros flex min-h-12 items-center text-tinta">{fData(form.data)}</p>
              </div>
              <div>
                <Rotulo htmlFor="validade">Validade</Rotulo>
                <input id="validade" type="date" min={form.data} className={`${classeEntrada} numeros`} value={form.validade} onChange={(e) => e.target.value && muda("validade", e.target.value)} />
              </div>
              <div>
                <Rotulo htmlFor="status">Status</Rotulo>
                <select id="status" className={classeEntrada} value={form.status} onChange={(e) => muda("status", e.target.value as Status)}>
                  {STATUS.map(([v, r]) => (
                    <option key={v} value={v}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {sit === "vencido" && (
              <p className="mt-4 flex items-center gap-3 text-sm text-perigo">
                <EtiquetaSituacao situacao="vencido" /> A validade passou. Para reenviar, estenda a validade.
              </p>
            )}
          </Secao>

          {/* b) Cliente */}
          <Secao titulo="Cliente" italico="">
            <BlocoCliente cliente={form.cliente} aoMudar={(c) => muda("cliente", c)} />
          </Secao>

          {/* c) Consultor e arquiteto(a) */}
          <Secao titulo="Consultor e" italico="arquiteto(a)">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Rotulo htmlFor="consultor">Consultor</Rotulo>
                {usuario.admin ? (
                  <select id="consultor" className={classeEntrada} value={form.vendedor_id} onChange={(e) => muda("vendedor_id", e.target.value)}>
                    {vendedores.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p id="consultor" className="flex min-h-12 items-center text-tinta">
                    {consultor?.nome ?? usuario.nome}
                  </p>
                )}
              </div>
              <div>
                <Rotulo htmlFor="arquiteto">Arquiteto(a) — opcional</Rotulo>
                <input id="arquiteto" list="lista-arquitetos" className={classeEntrada} value={form.arquiteto} onChange={(e) => muda("arquiteto", e.target.value)} autoComplete="off" />
                <datalist id="lista-arquitetos">
                  {arquitetos.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>
            </div>
          </Secao>

          {/* d) Itens */}
          <Secao titulo="Itens do" italico="orçamento" id="itens">
            <ListaItens itens={form.itens} calculados={calculados} modo={form.modo} atualizar={(fn) => setForm((f) => ({ ...f, itens: fn(f.itens) }))} />
            <Botao type="button" className="mt-5 w-full" onClick={() => setBuscando(true)}>
              + Adicionar produto
            </Botao>
          </Secao>

          {/* e) Ajustes e pagamento */}
          <Secao titulo="Ajustes e" italico="pagamento">
            <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
              <div>
                <Rotulo htmlFor="desconto">Desconto (R$)</Rotulo>
                <input
                  id="desconto"
                  inputMode="decimal"
                  placeholder="0,00"
                  className={`${classeEntrada} numeros ${descontoInvalido ? "border-perigo" : ""}`}
                  value={form.desconto}
                  onChange={(e) => muda("desconto", e.target.value)}
                  aria-invalid={descontoInvalido}
                  aria-describedby="erro-desconto"
                />
              </div>
              <div>
                <Rotulo htmlFor="motivo-desconto">Motivo do desconto (opcional)</Rotulo>
                <input id="motivo-desconto" className={classeEntrada} value={form.motivo_desconto} onChange={(e) => muda("motivo_desconto", e.target.value)} />
              </div>
              {descontoInvalido && (
                <p id="erro-desconto" role="alert" className="text-sm text-perigo sm:col-span-2">
                  O desconto não pode ser maior que o subtotal à vista ({formatarCentavos(totais.subtotal_vista)}). Ajuste o valor para continuar salvando.
                </p>
              )}
              <div>
                <Rotulo htmlFor="acrescimo">Acréscimo (R$)</Rotulo>
                <input id="acrescimo" inputMode="decimal" placeholder="0,00" className={`${classeEntrada} numeros`} value={form.acrescimo} onChange={(e) => muda("acrescimo", e.target.value)} />
              </div>
              <div>
                <Rotulo htmlFor="motivo-acrescimo">Motivo do acréscimo (ex.: frete, instalação)</Rotulo>
                <input id="motivo-acrescimo" className={classeEntrada} value={form.motivo_acrescimo} onChange={(e) => muda("motivo_acrescimo", e.target.value)} />
              </div>
            </div>

            <fieldset className="mt-7">
              <legend className="rotulo mb-2">Formas de pagamento aceitas</legend>
              <div className="flex flex-wrap gap-2">
                {FORMAS_PAGAMENTO.map(([v, r]) => {
                  const marcado = form.formas_pagamento.includes(v);
                  return (
                    <label key={v} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-full border px-4 ${marcado ? "border-bronze bg-bronze/5 text-tinta" : "border-linha text-tinta-suave"}`}>
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--ad-accent)]"
                        checked={marcado}
                        onChange={(e) =>
                          muda("formas_pagamento", e.target.checked ? [...form.formas_pagamento, v] : form.formas_pagamento.filter((x: FormaPagamento) => x !== v))
                        }
                      />
                      {r}
                    </label>
                  );
                })}
              </div>
              {form.formas_pagamento.includes("outro") && (
                <input aria-label="Outra forma de pagamento" placeholder="Qual?" className={`${classeEntrada} mt-3`} value={form.forma_outro} onChange={(e) => muda("forma_outro", e.target.value)} />
              )}
            </fieldset>

            <div className="mt-7 space-y-5">
              <div>
                <Rotulo htmlFor="condicoes">Condições de pagamento</Rotulo>
                <textarea id="condicoes" rows={3} className={`${classeEntrada} py-3 leading-relaxed`} value={form.condicoes} onChange={(e) => muda("condicoes", e.target.value)} />
              </div>
              <div>
                <Rotulo htmlFor="observacoes">Observações</Rotulo>
                <textarea id="observacoes" rows={3} className={`${classeEntrada} py-3 leading-relaxed`} value={form.observacoes} onChange={(e) => muda("observacoes", e.target.value)} />
              </div>
            </div>
          </Secao>

          {/* g) Ações */}
          <section className="grid gap-3 sm:grid-cols-3" aria-label="Ações">
            <Botao type="button" onClick={gerarPdf} disabled={!!acao}>
              {acao === "pdf" ? "Gerando…" : "Gerar PDF"}
            </Botao>
            <Botao type="button" variante="bronze" onClick={compartilharAgora} disabled={!!acao}>
              {acao === "compartilhar" ? "Preparando…" : "Compartilhar"}
            </Botao>
            <Botao type="button" variante="secundario" onClick={duplicar} disabled={!!acao || !form.id}>
              {acao === "duplicar" ? "Duplicando…" : "Duplicar"}
            </Botao>
          </section>
        </div>

        {/* f) Totais */}
        <TotaisLateral t={totais} motivoDesconto={form.motivo_desconto} motivoAcrescimo={form.motivo_acrescimo} status={status} />
      </div>

      <TotaisRodape t={totais} motivoDesconto={form.motivo_desconto} motivoAcrescimo={form.motivo_acrescimo} status={status} />
      {buscando && <BuscaProdutos modo={form.modo} aoEscolher={adicionar} aoFechar={() => setBuscando(false)} />}
    </div>
  );
}
