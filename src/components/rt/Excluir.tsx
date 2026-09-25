"use client";

import { Botao } from "@/components/ui/Botao";

/** Botão de excluir que pede confirmação antes de enviar o formulário. */
export function BotaoExcluir({ acao, pergunta, texto }: { acao: () => Promise<void>; pergunta: string; texto: string }) {
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!window.confirm(pergunta)) e.preventDefault();
      }}
    >
      <Botao variante="perigo">{texto}</Botao>
    </form>
  );
}
