"use client";

import { useState } from "react";
import { formatarCentavos, type Totais as T } from "@/lib/calculo";

function Linhas({ t, motivoDesconto, motivoAcrescimo }: { t: T; motivoDesconto: string; motivoAcrescimo: string }) {
  const linha = "flex items-baseline justify-between gap-4 py-1.5";
  return (
    <dl className="numeros text-sm">
      <div className={linha}>
        <dt className="text-tinta-suave">Subtotal à prazo</dt>
        <dd>{formatarCentavos(t.subtotal_prazo)}</dd>
      </div>
      <div className={linha}>
        <dt className="text-tinta-suave">Subtotal à vista</dt>
        <dd>{formatarCentavos(t.subtotal_vista)}</dd>
      </div>
      {t.desconto > 0n && (
        <div className={linha}>
          <dt className="text-tinta-suave">Desconto{motivoDesconto && ` (${motivoDesconto})`}</dt>
          <dd>− {formatarCentavos(t.desconto)}</dd>
        </div>
      )}
      {t.acrescimo > 0n && (
        <div className={linha}>
          <dt className="text-tinta-suave">Acréscimo{motivoAcrescimo && ` (${motivoAcrescimo})`}</dt>
          <dd>+ {formatarCentavos(t.acrescimo)}</dd>
        </div>
      )}
      <div className={`${linha} mt-2 border-t border-linha pt-3`}>
        <dt className="text-tinta">Total à prazo</dt>
        <dd className="text-base text-tinta">{formatarCentavos(t.total_prazo)}</dd>
      </div>
      <div className={linha}>
        <dt className="text-tinta">Total à vista</dt>
        <dd className="text-xl text-tinta">{formatarCentavos(t.total_vista)}</dd>
      </div>
      <div className={`${linha} text-sucesso`}>
        <dt>Economia pagando à vista</dt>
        <dd>{formatarCentavos(t.economia)}</dd>
      </div>
    </dl>
  );
}

/** Coluna fixa no computador. */
export function TotaisLateral(props: { t: T; motivoDesconto: string; motivoAcrescimo: string; status: React.ReactNode }) {
  return (
    <aside className="sticky top-8 hidden rounded-ad border border-linha bg-superficie p-6 shadow-ad lg:block" aria-label="Totais">
      <h2 className="mb-4 font-display text-2xl">
        <em className="text-bronze">Totais</em>
      </h2>
      <Linhas {...props} />
      <div className="mt-5 border-t border-linha pt-4 text-sm">{props.status}</div>
    </aside>
  );
}

/** Barra fixa no rodapé do celular/tablet, com detalhes que abrem por cima. */
export function TotaisRodape(props: { t: T; motivoDesconto: string; motivoAcrescimo: string; status: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linha bg-superficie/95 shadow-[0_-8px_24px_rgb(40_38_36/0.08)] backdrop-blur lg:hidden" aria-label="Totais">
      {aberto && (
        <div className="max-h-[60dvh] overflow-y-auto border-b border-linha px-4 pt-4 pb-2">
          <Linhas {...props} />
        </div>
      )}
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="numeros">
          <span className="rotulo block text-[0.6875rem]">Total à vista</span>
          <span className="block text-xl whitespace-nowrap text-tinta">{formatarCentavos(props.t.total_vista)}</span>
          <span className="block text-sm whitespace-nowrap text-tinta-suave">à prazo {formatarCentavos(props.t.total_prazo)}</span>
        </span>
        <span className="flex flex-col items-end gap-1 text-xs">
          {props.status}
          <span className="text-[0.6875rem] tracking-[0.16em] text-tinta-suave uppercase">{aberto ? "Fechar ▾" : "Detalhes ▴"}</span>
        </span>
      </button>
    </div>
  );
}
