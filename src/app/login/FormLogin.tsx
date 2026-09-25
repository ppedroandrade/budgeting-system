"use client";

import { useActionState } from "react";
import { entrar, type EstadoLogin } from "./actions";
import { Botao } from "@/components/ui/Botao";
import { Aviso, Campo } from "@/components/ui/Campo";

export function FormLogin({ avisoInicial }: { avisoInicial?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, {});
  const erro = estado.erro ?? avisoInicial;

  return (
    <form action={acao} className="space-y-5">
      {erro && <Aviso>{erro}</Aviso>}
      <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={estado.email} />
      <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
      <Botao type="submit" disabled={enviando} className="w-full">
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>
    </form>
  );
}
