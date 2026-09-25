import { SITUACAO_CLIENTE, SITUACAO_RT, type LinhaRt } from "@/lib/rt";

const base = "inline-block rounded-full px-2.5 py-1 text-[0.6875rem] tracking-[0.1em] whitespace-nowrap uppercase";

const CURTA = { aguardando: "Não pagou", parcial: "Pagou parte", quitado: "Quitou" } as const;

export function EtiquetaCliente({ s, curta }: { s: LinhaRt["situacao_cliente"]; curta?: boolean }) {
  const e = SITUACAO_CLIENTE[s];
  return <span className={`${base} ${e.classe}`}>{curta ? CURTA[s] : e.rotulo}</span>;
}

export function EtiquetaRt({ s }: { s: LinhaRt["situacao_rt"] }) {
  const e = SITUACAO_RT[s];
  return <span className={`${base} ${e.classe}`}>{e.rotulo}</span>;
}
