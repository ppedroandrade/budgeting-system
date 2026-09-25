"use client";

import { useState, useTransition } from "react";
import { FotoProduto } from "./FotoProduto";
import { salvarProduto, type ProdutoEntrada } from "@/app/(app)/produtos/actions";
import { paraCampoMoeda } from "@/lib/calculo";
import { UNIDADES, rotuloPreco, type Produto } from "@/lib/tipos";
import { Botao } from "@/components/ui/Botao";
import { Aviso, Campo } from "@/components/ui/Campo";

/**
 * Cadastro/edição de produto. Usado na tela Produtos e, em versão compacta,
 * dentro do orçamento ("Cadastrar produto novo").
 */
export function FormProduto({
  produto,
  modo,
  aoSalvar,
  aoUsarExistente,
  aoCancelar,
  textoSalvar = "Salvar produto",
}: {
  produto?: Produto;
  modo: "A" | "B";
  aoSalvar: (p: Produto) => void;
  aoUsarExistente?: (p: Produto) => void;
  aoCancelar?: () => void;
  textoSalvar?: string;
}) {
  const [v, setV] = useState<ProdutoEntrada>({
    marca: produto?.marca ?? "",
    nome: produto?.nome ?? "",
    referencia: produto?.referencia ?? "",
    acabamento: produto?.acabamento ?? "",
    unidade: produto?.unidade ?? "un",
    preco: produto ? paraCampoMoeda(produto.preco_base) : "",
    foto_url: produto?.foto_url ?? null,
  });
  const [erro, setErro] = useState("");
  const [duplicado, setDuplicado] = useState<Produto | null>(null);
  const [salvando, iniciar] = useTransition();
  const muda = (k: keyof ProdutoEntrada) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((a) => ({ ...a, [k]: e.target.value }));

  function enviar(mesmoAssim = false) {
    setErro("");
    iniciar(async () => {
      const r = await salvarProduto(produto?.id ?? null, v, mesmoAssim);
      if (r.ok) return aoSalvar(r.produto);
      if ("duplicado" in r) return setDuplicado(r.duplicado.produto);
      setErro(r.erro);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
      className="grid gap-6 sm:grid-cols-[14rem_1fr]"
    >
      <FotoProduto url={v.foto_url} aoMudar={(foto_url) => setV((a) => ({ ...a, foto_url }))} />
      <div className="space-y-5">
        {erro && <Aviso>{erro}</Aviso>}
        {duplicado && (
          <div className="rounded-ad border border-atencao/40 bg-atencao/5 p-4 text-sm" role="alert">
            <p className="mb-3 text-tinta">
              Já existe um produto com esta referência e marca:{" "}
              <strong className="font-normal">
                {[duplicado.marca, duplicado.nome].filter(Boolean).join(" · ")} ({duplicado.referencia})
              </strong>
              .
            </p>
            <div className="flex flex-wrap gap-3">
              {aoUsarExistente ? (
                <Botao type="button" onClick={() => aoUsarExistente(duplicado)}>
                  Usar o existente
                </Botao>
              ) : (
                <a href={`/produtos/${duplicado.id}`} className="inline-flex min-h-12 items-center rounded-ad border border-escuro bg-escuro px-5 text-[0.8125rem] tracking-[0.16em] text-white uppercase">
                  Abrir o existente
                </a>
              )}
              <Botao type="button" variante="texto" onClick={() => enviar(true)}>
                Cadastrar mesmo assim
              </Botao>
            </div>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo rotulo="Marca" value={v.marca} onChange={muda("marca")} placeholder="Ex.: Docol" />
          <Campo rotulo="Referência" value={v.referencia} onChange={muda("referencia")} />
        </div>
        <Campo rotulo="Nome / descrição" value={v.nome} onChange={muda("nome")} required />
        <Campo rotulo="Acabamento" value={v.acabamento} onChange={muda("acabamento")} placeholder="Ex.: Grafite polido" />
        <div className="grid grid-cols-[1fr_1.4fr] gap-5">
          <div>
            <label className="rotulo mb-1.5 block" htmlFor="unidade-produto">
              Unidade
            </label>
            <select id="unidade-produto" value={v.unidade} onChange={muda("unidade")} className="block min-h-12 w-full rounded-[var(--ad-radius-sm)] border border-linha bg-superficie px-3 text-base">
              {UNIDADES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
          <Campo rotulo={`${rotuloPreco(modo)} (R$)`} value={v.preco} onChange={muda("preco")} inputMode="decimal" placeholder="0,00" />
        </div>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
          {aoCancelar && (
            <Botao type="button" variante="secundario" onClick={aoCancelar}>
              Cancelar
            </Botao>
          )}
          <Botao type="submit" disabled={salvando} className="sm:min-w-56">
            {salvando ? "Salvando…" : textoSalvar}
          </Botao>
        </div>
      </div>
    </form>
  );
}
