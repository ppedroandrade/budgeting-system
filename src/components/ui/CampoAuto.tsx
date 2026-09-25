"use client";

import { useId, useRef, useState, useTransition } from "react";

export type ResultadoCampo = { ok: true; valor: string } | { ok: false; erro: string };
export type SalvarCampo = (campo: string, valor: string) => Promise<ResultadoCampo>;

type Estado = "parado" | "salvando" | "salvo" | "erro";

/** Salva um campo sozinho (ao sair dele ou ao marcar), mostrando "Salvando… / ✓ Salvo". */
export function useAutosave(salvarCampo: SalvarCampo, campo: string, inicial: string) {
  const [estado, setEstado] = useState<Estado>("parado");
  const [erro, setErro] = useState("");
  const salvo = useRef(inicial);
  const [, iniciar] = useTransition();

  function salvar(valor: string, aoSalvar?: (v: string) => void) {
    if (valor === salvo.current) return;
    setEstado("salvando");
    iniciar(async () => {
      try {
        const r = await salvarCampo(campo, valor);
        if (r.ok) {
          salvo.current = r.valor;
          aoSalvar?.(r.valor);
          setEstado("salvo");
          setErro("");
        } else {
          setEstado("erro");
          setErro(r.erro);
        }
      } catch {
        setEstado("erro");
        setErro("Sem conexão. Tente de novo.");
      }
    });
  }
  return { estado, erro, salvar };
}

export function IndicadorSalvo({ estado, erro }: { estado: Estado; erro: string }) {
  if (estado === "salvando") return <span className="text-xs text-tinta-suave">Salvando…</span>;
  if (estado === "salvo") return <span className="text-xs text-sucesso">✓ Salvo</span>;
  if (estado === "erro") return <span className="text-xs text-perigo">{erro}</span>;
  return null;
}

export const classeEntrada =
  "block w-full min-h-12 rounded-[var(--ad-radius-sm)] border border-linha bg-superficie px-3.5 text-base text-tinta placeholder:text-tinta-suave/60 focus:border-bronze focus:outline-none";

export function CampoAuto({
  salvarCampo,
  campo,
  rotulo,
  inicial,
  multilinha,
  ajuda,
  ...props
}: {
  salvarCampo: SalvarCampo;
  campo: string;
  rotulo: string;
  inicial: string;
  multilinha?: boolean;
  ajuda?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [valor, setValor] = useState(inicial);
  const { estado, erro, salvar } = useAutosave(salvarCampo, campo, inicial);
  const aoSair = () => salvar(valor, setValor);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="rotulo">
          {rotulo}
        </label>
        <IndicadorSalvo estado={estado} erro={erro} />
      </div>
      {multilinha ? (
        <textarea id={id} rows={4} className={`${classeEntrada} py-3 leading-relaxed`} value={valor} onChange={(e) => setValor(e.target.value)} onBlur={aoSair} />
      ) : (
        <input id={id} className={classeEntrada} value={valor} onChange={(e) => setValor(e.target.value)} onBlur={aoSair} aria-invalid={estado === "erro"} {...props} />
      )}
      {ajuda && <p className="mt-1 text-sm text-tinta-suave">{ajuda}</p>}
    </div>
  );
}
