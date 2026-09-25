const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
/** "R$ 1.234,56". Aceita o texto que vem do banco (numeric) ou número. */
export function moeda(valor: string | number | null | undefined): string {
  return brl.format(Number(valor ?? 0)).replace(/ /g, " ");
}

/**
 * "R$ 12,5 mil" / "R$ 1,2 mi" — só para eixos de gráfico. Montado à mão porque
 * o Intl "compact" sai diferente no servidor (Node) e no navegador.
 */
export function moedaCompacta(valor: number): string {
  const curto = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
  if (Math.abs(valor) >= 1_000_000) return `R$ ${curto(valor / 1_000_000)} mi`;
  if (Math.abs(valor) >= 1_000) return `R$ ${curto(valor / 1_000)} mil`;
  return `R$ ${curto(valor)}`;
}

/** "2026-09-25" → "25/09/2026" (sem passar por fuso horário). */
export function data(iso: string | null | undefined): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "2026-09-01" → "set/26" */
export function mesCurto(iso: string): string {
  const [a, m] = iso.split("-");
  return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
}

/** Apenas dígitos → "(45) 98827-4710" para exibição. */
export function telefone(valor: string | null | undefined): string {
  const d = (valor ?? "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor ?? "";
}
