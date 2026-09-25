"use client";

import { useEffect, useRef, useState } from "react";
import { FormProduto } from "@/components/produtos/FormProduto";
import { Miniatura } from "@/components/produtos/Miniatura";
import { classeEntrada } from "@/components/ui/CampoAuto";
import { moeda } from "@/lib/formato";
import { supabaseNavegador } from "@/lib/supabase/client";
import { termosBusca } from "@/lib/texto";
import { COLUNAS_PRODUTO, type Produto } from "@/lib/tipos";

/** Janela "Adicionar produto": busca no catálogo (nome, marca, referência) ou cadastro rápido. */
export function BuscaProdutos({
  modo,
  aoEscolher,
  aoFechar,
}: {
  modo: "A" | "B";
  aoEscolher: (p: Produto) => void;
  aoFechar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [texto, setTexto] = useState("");
  const [lista, setLista] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [cadastrando, setCadastrando] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    const d = dialogo.current;
    d?.showModal();
    return () => d?.close();
  }, []);

  useEffect(() => {
    const meu = ++pedido.current;
    const t = setTimeout(async () => {
      let q = supabaseNavegador().from("produtos").select(COLUNAS_PRODUTO).eq("ativo", true).order("marca").order("nome").limit(40);
      for (const termo of termosBusca(texto)) q = q.ilike("busca", `%${termo}%`);
      const { data } = await q;
      if (meu === pedido.current) {
        setLista((data as Produto[]) ?? []);
        setCarregando(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [texto]);

  return (
    <dialog
      ref={dialogo}
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
      aria-label="Adicionar produto"
      className="m-0 h-dvh max-h-none w-full max-w-none bg-fundo p-0 backdrop:bg-tinta/40 sm:m-auto sm:h-[min(90dvh,52rem)] sm:max-w-3xl sm:rounded-ad sm:shadow-ad"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-linha bg-superficie px-4 py-3 sm:px-6">
          <h2 className="font-display text-2xl">
            {cadastrando ? "Produto" : "Adicionar"} <em className="text-bronze">{cadastrando ? "novo" : "produto"}</em>
          </h2>
          <button type="button" onClick={aoFechar} className="min-h-12 px-2 text-[0.8125rem] tracking-[0.16em] uppercase">
            Fechar
          </button>
        </header>

        {cadastrando ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <p className="mb-5 text-sm text-tinta-suave">O produto entra neste orçamento e fica salvo no catálogo.</p>
            <FormProduto
              modo={modo}
              aoSalvar={aoEscolher}
              aoUsarExistente={aoEscolher}
              aoCancelar={() => setCadastrando(false)}
              textoSalvar="Cadastrar e adicionar"
            />
          </div>
        ) : (
          <>
            <div className="space-y-3 border-b border-linha p-4 sm:px-6">
              <input
                type="search"
                autoFocus
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Buscar por nome, marca ou referência"
                aria-label="Buscar produto"
                className={classeEntrada}
              />
              <button
                type="button"
                onClick={() => setCadastrando(true)}
                className="flex min-h-12 w-full items-center justify-center rounded-ad border border-dashed border-bronze/60 text-[0.8125rem] tracking-[0.16em] text-bronze uppercase hover:bg-bronze/5"
              >
                + Cadastrar produto novo
              </button>
            </div>
            <ul className="flex-1 divide-y divide-linha overflow-y-auto bg-superficie" aria-live="polite">
              {lista.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => aoEscolher(p)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-fundo sm:px-6">
                    <Miniatura url={p.foto_url} alt="" className="w-16 shrink-0 rounded border border-linha" />
                    <span className="min-w-0 flex-1">
                      {p.marca && <span className="sobrancelha block text-[0.6875rem]">{p.marca}</span>}
                      <span className="block leading-snug text-tinta">{p.nome}</span>
                      <span className="block truncate text-sm text-tinta-suave">{[p.referencia, p.acabamento].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="numeros shrink-0 text-right text-tinta">
                      {moeda(p.preco_base)}
                      <span className="block text-xs text-tinta-suave">/{p.unidade}</span>
                    </span>
                  </button>
                </li>
              ))}
              {!carregando && lista.length === 0 && (
                <li className="px-6 py-10 text-center text-tinta-suave">Nenhum produto encontrado. Use “Cadastrar produto novo”.</li>
              )}
            </ul>
          </>
        )}
      </div>
    </dialog>
  );
}
