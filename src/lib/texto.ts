/** Mesma regra da função sem_acento() do banco: minúsculas e sem acento. */
export function semAcento(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Palavras da busca, já sem acento, prontas para filtros "contém". Remove caracteres que atrapalham o filtro. */
export function termosBusca(q: string | undefined): string[] {
  return semAcento(q ?? "")
    .replace(/[%_,()*\\]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
}

/** "Orçamento" + número + cliente → "Orcamento_2026-0001_JoaoDaSilva.pdf" (sem acento, sem espaço). */
export function nomeArquivoPdf(numero: string, cliente: string): string {
  const nome = semAcento(cliente)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join("");
  return `Orcamento_${numero}${nome ? `_${nome}` : ""}.pdf`;
}
