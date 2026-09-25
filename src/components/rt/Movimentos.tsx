"use client";

import { useState, useTransition } from "react";
import { adicionarMovimento, removerMovimento } from "@/app/(app)/rt/actions";
import { Botao } from "@/components/ui/Botao";
import { classeEntrada } from "@/components/ui/CampoAuto";
import { formatarCentavos } from "@/lib/calculo";
import { data as fData } from "@/lib/formato";

export type LinhaMovimento = { id: string; data: string; valor: number; forma: string; observacao: string };

const FORMAS = ["Pix", "Cartão", "Boleto", "Dinheiro", "Transferência", "Outro"];
const brl = (v: number) => formatarCentavos(BigInt(Math.round(v * 100)));
const campo = (v: number) => brl(v).replace("R$ ", "");

/** Lista de pagamentos (do cliente ou ao arquiteto) com formulário para registrar mais um. */
export function Movimentos({
  tipo,
  lancamentoId,
  itens,
  sugestao,
  rotuloSugestao,
  hoje,
}: {
  tipo: "recebimento" | "pagamento";
  lancamentoId: string;
  itens: LinhaMovimento[];
  sugestao: number; // valor que falta (cliente) ou saldo liberado (arquiteto)
  rotuloSugestao: string;
  hoje: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [m, setM] = useState({ data: hoje, valor: "", forma: "Pix", observacao: "" });
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const prefixo = tipo === "recebimento" ? "cliente" : "arquiteto";

  function registrar() {
    setErro("");
    iniciar(async () => {
      const r = await adicionarMovimento(tipo, lancamentoId, m);
      if (!r.ok) return setErro(r.erro ?? "Falhou.");
      setM({ data: hoje, valor: "", forma: m.forma, observacao: "" });
      setAberto(false);
    });
  }

  return (
    <div>
      {itens.length ? (
        <ul className="divide-y divide-linha rounded-ad border border-linha">
          {itens.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="numeros text-tinta">{fData(i.data)}</span>
                <span className="text-tinta-suave">
                  {" · "}
                  {i.forma || "—"}
                  {i.observacao && ` · ${i.observacao}`}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="numeros text-tinta">{brl(i.valor)}</span>
                <button
                  type="button"
                  aria-label={`Excluir pagamento de ${fData(i.data)}`}
                  className="grid size-10 place-items-center rounded-ad text-tinta-suave hover:text-perigo"
                  onClick={() => {
                    if (window.confirm(`Excluir o pagamento de ${brl(i.valor)} em ${fData(i.data)}?`)) {
                      iniciar(() => removerMovimento(tipo, i.id, lancamentoId));
                    }
                  }}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-ad border border-dashed border-linha px-4 py-5 text-center text-sm text-tinta-suave">Nenhum pagamento registrado.</p>
      )}

      {aberto ? (
        <div className="mt-4 space-y-3 rounded-ad border border-linha bg-fundo p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor={`${prefixo}-data`} className="rotulo mb-1 block text-[0.6875rem]">
                Data
              </label>
              <input id={`${prefixo}-data`} type="date" className={classeEntrada} value={m.data} onChange={(e) => setM({ ...m, data: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`${prefixo}-valor`} className="rotulo mb-1 block text-[0.6875rem]">
                Valor (R$)
              </label>
              <input id={`${prefixo}-valor`} inputMode="decimal" placeholder="0,00" className={`${classeEntrada} numeros`} value={m.valor} onChange={(e) => setM({ ...m, valor: e.target.value })} />
            </div>
            <div>
              <label htmlFor={`${prefixo}-forma`} className="rotulo mb-1 block text-[0.6875rem]">
                Forma
              </label>
              <select id={`${prefixo}-forma`} className={classeEntrada} value={m.forma} onChange={(e) => setM({ ...m, forma: e.target.value })}>
                {FORMAS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
          <input
            aria-label="Observação"
            placeholder={tipo === "recebimento" ? "Observação (ex.: parcela 1 de 3)" : "Observação (ex.: comprovante enviado)"}
            className={classeEntrada}
            value={m.observacao}
            onChange={(e) => setM({ ...m, observacao: e.target.value })}
          />
          {sugestao > 0 && (
            <button type="button" className="min-h-10 text-sm text-bronze underline-offset-4 hover:underline" onClick={() => setM({ ...m, valor: campo(sugestao) })}>
              {rotuloSugestao}: {brl(sugestao)}
            </button>
          )}
          {erro && (
            <p role="alert" className="text-sm text-perigo">
              {erro}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="button" disabled={pendente} onClick={registrar}>
              {pendente ? "Salvando…" : "Registrar pagamento"}
            </Botao>
          </div>
        </div>
      ) : (
        <Botao type="button" variante="secundario" className="mt-4 w-full sm:w-auto" onClick={() => setAberto(true)}>
          + {tipo === "recebimento" ? "Pagamento do cliente" : "Pagamento ao arquiteto(a)"}
        </Botao>
      )}
    </div>
  );
}
