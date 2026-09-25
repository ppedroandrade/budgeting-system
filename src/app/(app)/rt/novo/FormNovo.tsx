"use client";

import { useActionState } from "react";
import { criarLancamento } from "../actions";
import { Botao, BotaoLink } from "@/components/ui/Botao";
import { Aviso, Campo } from "@/components/ui/Campo";

export function FormNovo({ arquitetos, mes, hoje, pctPadrao }: { arquitetos: string[]; mes: string; hoje: string; pctPadrao: string }) {
  const [estado, acao, enviando] = useActionState(criarLancamento, {});
  return (
    <form action={acao} className="space-y-5">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <Campo rotulo="Arquiteto(a) / engenheiro(a) / construtor(a)" name="arquiteto" list="arquitetos-rt" required autoComplete="off" />
      <datalist id="arquitetos-rt">
        {arquitetos.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <Campo rotulo="Nome do cliente" name="cliente_nome" />
      <div className="grid grid-cols-2 gap-4">
        <Campo rotulo="Mês (RT)" name="mes_ref" type="month" defaultValue={mes} required />
        <Campo rotulo="Data do pedido" name="data_pedido" type="date" defaultValue={hoje} required />
      </div>
      <Campo rotulo="Nota fiscal" name="nota_fiscal" />
      <label className="flex min-h-12 cursor-pointer items-center gap-3">
        <input type="checkbox" name="acompanhou" className="size-5 accent-[var(--ad-accent)]" />
        Arquiteto(a) acompanhou o cliente
      </label>
      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <Campo rotulo="Valor da compra (R$)" name="valor_compra" inputMode="decimal" placeholder="0,00" required />
        <Campo rotulo="% RT" name="pct" inputMode="decimal" placeholder={pctPadrao} ajuda="Vazio = % do arquiteto ou padrão." />
      </div>
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
        <BotaoLink href="/rt" variante="secundario">
          Cancelar
        </BotaoLink>
        <Botao type="submit" disabled={enviando} className="sm:min-w-56">
          {enviando ? "Salvando…" : "Criar lançamento"}
        </Botao>
      </div>
    </form>
  );
}
