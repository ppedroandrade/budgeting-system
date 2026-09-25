"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { classeEntrada } from "./CampoAuto";

/** Campo de busca que atualiza a URL (?q=) enquanto a pessoa digita. */
export function Busca({ placeholder, param = "q" }: { placeholder: string; param?: string }) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const [valor, setValor] = useState(params.get(param) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function mudar(v: string) {
    setValor(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      if (v.trim()) p.set(param, v.trim());
      else p.delete(param);
      p.delete("limite");
      router.replace(`${caminho}${p.size ? `?${p}` : ""}`, { scroll: false });
    }, 300);
  }

  return (
    <input
      type="search"
      value={valor}
      onChange={(e) => mudar(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={classeEntrada}
    />
  );
}

/** Seletor que grava a escolha na URL. */
export function FiltroUrl({ param, opcoes, rotulo }: { param: string; opcoes: Array<{ valor: string; rotulo: string }>; rotulo: string }) {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  return (
    <select
      aria-label={rotulo}
      value={params.get(param) ?? ""}
      onChange={(e) => {
        const p = new URLSearchParams(params.toString());
        if (e.target.value) p.set(param, e.target.value);
        else p.delete(param);
        p.delete("limite");
        router.replace(`${caminho}${p.size ? `?${p}` : ""}`, { scroll: false });
      }}
      className={`${classeEntrada} pr-8`}
    >
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
    </select>
  );
}
