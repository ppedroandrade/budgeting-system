"use client";

import { useState } from "react";
import { Miniatura } from "@/components/produtos/Miniatura";
import { atualizarPrecoCatalogo } from "@/app/(app)/produtos/actions";
import { centavos, centesimosPct, formatarCentavos, milesimos, type ItemCalculado, type Modo } from "@/lib/calculo";
import type { ItemForm } from "@/lib/orcamento";
import { UNIDADES, rotuloPreco } from "@/lib/tipos";

const entrada =
  "block w-full min-h-11 rounded-[var(--ad-radius-sm)] border bg-superficie px-3 text-base text-tinta focus:border-bronze focus:outline-none";

function Rotulo({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="rotulo mb-1 block text-[0.6875rem]">
      {children}
    </label>
  );
}

/** Reformata "1221,6" → "1.221,60" ao sair do campo (se for um valor válido). */
const formatarMoeda = (v: string) => {
  const c = centavos(v);
  return c === null ? v : formatarCentavos(c).replace("R$ ", "");
};

function CaixaCatalogo({ item, aoAtualizado }: { item: ItemForm; aoAtualizado: () => void }) {
  const [estado, setEstado] = useState<"" | "salvando" | "erro">("");
  return (
    <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-tinta-suave">
      <input
        type="checkbox"
        className="size-5 accent-[var(--ad-accent)]"
        checked={false}
        disabled={estado === "salvando"}
        onChange={async () => {
          setEstado("salvando");
          const r = await atualizarPrecoCatalogo(item.produto_id!, item.preco);
          if (r.ok) {
            setEstado("");
            aoAtualizado();
          } else setEstado("erro");
        }}
      />
      <span>
        Atualizar este preço também no catálogo <span className="whitespace-nowrap">(hoje R$ {item.preco_catalogo})</span>
        {estado === "salvando" && " — salvando…"}
        {estado === "erro" && <span className="text-perigo"> — não foi possível atualizar.</span>}
      </span>
    </label>
  );
}

function CartaoItem({
  item,
  calc,
  indice,
  total,
  modo,
  aoMudar,
  aoMover,
  aoRemover,
}: {
  item: ItemForm;
  calc: ItemCalculado | null;
  indice: number;
  total: number;
  modo: Modo;
  aoMudar: (parcial: Partial<ItemForm>) => void;
  aoMover: (delta: -1 | 1) => void;
  aoRemover: () => void;
}) {
  const [editandoTexto, setEditandoTexto] = useState(!item.nome);
  const [pctAnterior, setPctAnterior] = useState(item.pct);
  const id = (c: string) => `item-${item.id}-${c}`;
  const qtdOk = (milesimos(item.qtd) ?? 0n) > 0n;
  const precoOk = centavos(item.preco) !== null;
  const pctN = centesimosPct(item.pct);
  const pctOk = pctN !== null && pctN <= 10000n;
  const borda = (ok: boolean) => (ok ? "border-linha" : "border-perigo");
  const precoMudou =
    item.produto_id && item.preco_catalogo && precoOk && centavos(item.preco) !== centavos(item.preco_catalogo);

  const botaoIcone =
    "grid size-11 place-items-center rounded-ad border border-linha bg-superficie text-tinta-suave hover:text-tinta disabled:opacity-30";

  return (
    <li className="rounded-ad border border-linha bg-superficie p-4 sm:p-5" aria-label={`Item ${indice + 1}: ${item.nome || "sem nome"}`}>
      <div className="flex gap-4">
        <Miniatura url={item.foto_url} alt={item.nome} className="w-20 shrink-0 rounded border border-linha sm:w-24" />
        <div className="min-w-0 flex-1">
          {editandoTexto ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <input aria-label="Marca" placeholder="Marca" className={`${entrada} border-linha`} value={item.marca} onChange={(e) => aoMudar({ marca: e.target.value })} />
              <input aria-label="Referência" placeholder="Referência" className={`${entrada} border-linha`} value={item.referencia} onChange={(e) => aoMudar({ referencia: e.target.value })} />
              <input aria-label="Nome / descrição" placeholder="Nome / descrição" className={`${entrada} border-linha sm:col-span-2`} value={item.nome} onChange={(e) => aoMudar({ nome: e.target.value })} />
              <input aria-label="Acabamento" placeholder="Acabamento" className={`${entrada} border-linha sm:col-span-2`} value={item.acabamento} onChange={(e) => aoMudar({ acabamento: e.target.value })} />
            </div>
          ) : (
            <>
              {item.marca && <p className="sobrancelha text-[0.6875rem]">{item.marca}</p>}
              <p className="leading-snug text-tinta">{item.nome}</p>
              <p className="text-sm text-tinta-suave">{[item.referencia, item.acabamento].filter(Boolean).join(" · ")}</p>
            </>
          )}
          <button type="button" className="mt-1 min-h-9 text-sm text-tinta-suave underline-offset-4 hover:underline" onClick={() => setEditandoTexto((v) => !v)}>
            {editandoTexto ? "Pronto" : "Editar descrição"}
          </button>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button type="button" className={botaoIcone} aria-label="Subir item" disabled={indice === 0} onClick={() => aoMover(-1)}>
            ↑
          </button>
          <button type="button" className={botaoIcone} aria-label="Descer item" disabled={indice === total - 1} onClick={() => aoMover(1)}>
            ↓
          </button>
          <button type="button" className={`${botaoIcone} hover:border-perigo hover:text-perigo`} aria-label="Remover item" onClick={aoRemover}>
            ✕
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[1.6fr_0.8fr_0.8fr_1.1fr_0.7fr]">
        <div className="col-span-2 sm:col-span-1">
          <Rotulo htmlFor={id("amb")}>Ambiente</Rotulo>
          <input
            id={id("amb")}
            list="ambientes-orcamento"
            placeholder="Ex.: Cozinha"
            className={`${entrada} border-linha`}
            value={item.ambiente}
            onChange={(e) => aoMudar({ ambiente: e.target.value })}
          />
        </div>
        <div>
          <Rotulo htmlFor={id("qtd")}>Qtd</Rotulo>
          <input id={id("qtd")} inputMode="decimal" className={`${entrada} ${borda(qtdOk)} numeros`} value={item.qtd} onChange={(e) => aoMudar({ qtd: e.target.value })} aria-invalid={!qtdOk} />
        </div>
        <div>
          <Rotulo htmlFor={id("un")}>Unidade</Rotulo>
          <select id={id("un")} className={`${entrada} border-linha`} value={item.unidade} onChange={(e) => aoMudar({ unidade: e.target.value as ItemForm["unidade"] })}>
            {UNIDADES.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <Rotulo htmlFor={id("preco")}>{rotuloPreco(modo)}</Rotulo>
          <input
            id={id("preco")}
            inputMode="decimal"
            className={`${entrada} ${borda(precoOk)} numeros`}
            value={item.preco}
            onChange={(e) => aoMudar({ preco: e.target.value })}
            onBlur={() => aoMudar({ preco: formatarMoeda(item.preco) })}
            aria-invalid={!precoOk}
          />
        </div>
        <div>
          <Rotulo htmlFor={id("pct")}>%</Rotulo>
          <input
            id={id("pct")}
            inputMode="decimal"
            className={`${entrada} ${borda(pctOk)} numeros`}
            value={item.pct}
            onFocus={() => setPctAnterior(item.pct)}
            onChange={(e) => aoMudar({ pct: e.target.value.replace("%", "") })}
            onBlur={() => {
              if (pctOk && pctN! > 5000n && item.pct !== pctAnterior) {
                const ok = window.confirm(`Confirma ${item.pct}% neste item? É acima de 50%.`);
                if (!ok) aoMudar({ pct: pctAnterior });
              }
            }}
            aria-invalid={!pctOk}
          />
        </div>
      </div>

      {precoMudou && <CaixaCatalogo item={item} aoAtualizado={() => aoMudar({ preco_catalogo: item.preco })} />}

      <dl className="numeros mt-4 grid grid-cols-3 gap-2 border-t border-linha pt-3 text-sm">
        <div>
          <dt className="text-tinta-suave">{modo === "B" ? "Un. à prazo" : "Un. à vista"}</dt>
          <dd className="text-tinta">{calc ? formatarCentavos(modo === "B" ? calc.unit_prazo : calc.unit_vista) : "—"}</dd>
        </div>
        <div>
          <dt className="text-tinta-suave">Total à prazo</dt>
          <dd className="text-tinta">{calc ? formatarCentavos(calc.total_prazo) : "—"}</dd>
        </div>
        <div>
          <dt className="text-tinta-suave">Total à vista</dt>
          <dd className="text-tinta">{calc ? formatarCentavos(calc.total_vista) : "—"}</dd>
        </div>
      </dl>
    </li>
  );
}

type Atualizar = (fn: (itens: ItemForm[]) => ItemForm[]) => void;

export function ListaItens({
  itens,
  calculados,
  modo,
  atualizar,
}: {
  itens: ItemForm[];
  calculados: Array<ItemCalculado | null>;
  modo: Modo;
  atualizar: Atualizar;
}) {
  const ambientes = [...new Set(itens.map((i) => i.ambiente.trim()).filter(Boolean))].sort();

  if (!itens.length) {
    return <p className="rounded-ad border border-dashed border-linha px-5 py-8 text-center text-tinta-suave">Nenhum item ainda.</p>;
  }

  return (
    <>
      <datalist id="ambientes-orcamento">
        {ambientes.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <ol className="space-y-4">
        {itens.map((item, i) => (
          <CartaoItem
            key={item.id}
            item={item}
            calc={calculados[i]}
            indice={i}
            total={itens.length}
            modo={modo}
            aoMudar={(parcial) => atualizar((lista) => lista.map((x) => (x.id === item.id ? { ...x, ...parcial } : x)))}
            aoMover={(d) =>
              atualizar((lista) => {
                const j = lista.findIndex((x) => x.id === item.id);
                if (j + d < 0 || j + d >= lista.length) return lista;
                const novo = [...lista];
                [novo[j], novo[j + d]] = [novo[j + d], novo[j]];
                return novo;
              })
            }
            aoRemover={() => atualizar((lista) => lista.filter((x) => x.id !== item.id))}
          />
        ))}
      </ol>
    </>
  );
}
