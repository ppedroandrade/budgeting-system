import { SITUACOES, type Situacao } from "@/lib/tipos";

export function EtiquetaSituacao({ situacao }: { situacao: Situacao }) {
  const s = SITUACOES[situacao] ?? SITUACOES.rascunho;
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[0.6875rem] tracking-[0.12em] whitespace-nowrap uppercase ${s.classe}`}>
      {s.rotulo}
    </span>
  );
}
