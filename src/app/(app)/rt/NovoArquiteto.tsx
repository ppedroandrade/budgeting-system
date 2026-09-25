"use client";

import { useActionState } from "react";
import { novoArquiteto } from "./actions";
import { Botao } from "@/components/ui/Botao";
import { classeEntrada } from "@/components/ui/CampoAuto";

export function NovoArquiteto() {
  const [estado, acao, enviando] = useActionState(novoArquiteto, {});
  return (
    <form action={acao} className="flex flex-col gap-3 sm:flex-row">
      <input name="nome" aria-label="Nome do novo arquiteto(a)" placeholder="Nome do novo arquiteto(a)" className={`${classeEntrada} sm:max-w-sm`} required />
      <Botao type="submit" variante="secundario" disabled={enviando}>
        {enviando ? "Cadastrando…" : "Cadastrar arquiteto(a)"}
      </Botao>
      {estado.erro && <p className="text-sm text-perigo">{estado.erro}</p>}
    </form>
  );
}
