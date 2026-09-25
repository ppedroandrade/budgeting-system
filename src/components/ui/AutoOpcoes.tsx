"use client";

import { useState } from "react";
import { IndicadorSalvo, classeEntrada, useAutosave, type SalvarCampo } from "./CampoAuto";

/** Caixa de marcar que salva sozinha. */
export function CaixaAuto({ salvarCampo, campo, inicial, rotulo }: { salvarCampo: SalvarCampo; campo: string; inicial: boolean; rotulo: string }) {
  const [marcado, setMarcado] = useState(inicial);
  const { estado, erro, salvar } = useAutosave(salvarCampo, campo, String(inicial));
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="flex min-h-12 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          className="size-5 accent-[var(--ad-accent)]"
          checked={marcado}
          onChange={(e) => {
            setMarcado(e.target.checked);
            salvar(String(e.target.checked));
          }}
        />
        <span>{rotulo}</span>
      </label>
      <IndicadorSalvo estado={estado} erro={erro} />
    </div>
  );
}

/** Lista de opções que salva sozinha ao escolher. */
export function SelecaoAuto({
  salvarCampo,
  campo,
  inicial,
  rotulo,
  opcoes,
}: {
  salvarCampo: SalvarCampo;
  campo: string;
  inicial: string;
  rotulo: string;
  opcoes: Array<{ valor: string; rotulo: string }>;
}) {
  const [valor, setValor] = useState(inicial);
  const { estado, erro, salvar } = useAutosave(salvarCampo, campo, inicial);
  const id = `sel-${campo}`;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="rotulo">
          {rotulo}
        </label>
        <IndicadorSalvo estado={estado} erro={erro} />
      </div>
      <select
        id={id}
        className={classeEntrada}
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          salvar(e.target.value);
        }}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}
