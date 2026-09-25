"use client";

import { useActionState } from "react";
import type { EstadoForm } from "./actions";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Aviso, Campo } from "@/components/ui/Campo";

type Valores = { nome?: string; email?: string; whatsapp?: string };

export function FormVendedor({
  acao,
  valores = {},
  novo,
}: {
  acao: (estado: EstadoForm, form: FormData) => Promise<EstadoForm>;
  valores?: Valores;
  novo: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(acao, {});
  const v = { ...valores, ...estado.campos };

  return (
    <form action={enviar} className="space-y-5">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <Campo rotulo="Nome" name="nome" required defaultValue={v.nome} autoComplete="off" />
      <Campo rotulo="E-mail (usado no login)" name="email" type="email" inputMode="email" required defaultValue={v.email} autoComplete="off" />
      <Campo
        rotulo="WhatsApp"
        name="whatsapp"
        type="tel"
        inputMode="tel"
        placeholder="(45) 99999-9999"
        defaultValue={v.whatsapp}
        ajuda="Aparece no PDF do orçamento como contato do consultor."
      />
      <Campo
        rotulo={novo ? "Senha inicial" : "Nova senha (opcional)"}
        name="senha"
        type="text"
        minLength={8}
        required={novo}
        autoComplete="new-password"
        ajuda={novo ? "Mínimo 8 caracteres. Passe para o vendedor pessoalmente." : "Deixe em branco para manter a senha atual."}
      />
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
        <BotaoLink href="/vendedores" variante="secundario">
          Cancelar
        </BotaoLink>
        <Botao type="submit" disabled={enviando} className="sm:min-w-56">
          {enviando ? "Salvando…" : novo ? "Cadastrar vendedor" : "Salvar alterações"}
        </Botao>
      </div>
    </form>
  );
}
