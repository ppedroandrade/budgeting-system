/**
 * Regras de cálculo do orçamento (seção 6 da especificação).
 *
 * Todo dinheiro é tratado em CENTAVOS inteiros (BigInt), nunca em float.
 *   - preço:  centavos            (R$ 1.221,60 → 122160n)
 *   - %:      centésimos de ponto (20%          → 2000n)
 *   - qtd:    milésimos           (12,5 m²      → 12500n)
 * Arredondamento meio-para-cima (half-up), 2 casas, no unitário e no total da linha.
 *
 * A mesma regra roda no banco (supabase/schema.sql → calcular_item), que é quem
 * grava os valores; esta cópia existe para a tela mostrar tudo na hora.
 */

export type Modo = "A" | "B";

export type ItemBase = { preco_base: string; pct: string; qtd: string };

export type ItemCalculado = {
  unit_prazo: bigint;
  unit_vista: bigint;
  total_prazo: bigint;
  total_vista: bigint;
};

export type Totais = {
  subtotal_prazo: bigint;
  subtotal_vista: bigint;
  desconto: bigint;
  acrescimo: bigint;
  total_prazo: bigint;
  total_vista: bigint;
  economia: bigint;
};

/** Divide arredondando meio-para-cima (valores não negativos). */
function dividirArredondando(num: bigint, den: bigint): bigint {
  return (num * 2n + den) / (den * 2n);
}

/** Converte texto decimal ("1.221,60", "1221.60", "12,5") em inteiro com `casas` casas. */
export function paraInteiro(texto: string | number, casas: number): bigint | null {
  let t = String(texto).trim().replace(/\s|R\$/g, "");
  if (!t) return null;
  // "1.234,56" (BR) → "1234.56"; "1234.56" continua igual
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ""); // "1.221" = mil duzentos e vinte e um
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const [int, frac = ""] = t.split(".");
  if (frac.length > casas) {
    // arredonda meio-para-cima na última casa aceita
    const base = BigInt(int + frac.slice(0, casas).padEnd(casas, "0"));
    return Number(frac[casas]) >= 5 ? base + 1n : base;
  }
  return BigInt(int + frac.padEnd(casas, "0"));
}

export const centavos = (t: string | number) => paraInteiro(t, 2);
export const centesimosPct = (t: string | number) => paraInteiro(t, 2);
export const milesimos = (t: string | number) => paraInteiro(t, 3);

/** Inteiro com `casas` casas → texto com ponto ("122160", 2 → "1221.60"), formato do banco. */
export function paraTexto(v: bigint, casas: number): string {
  const neg = v < 0n;
  const s = (neg ? -v : v).toString().padStart(casas + 1, "0");
  const texto = casas ? `${s.slice(0, -casas)}.${s.slice(-casas)}` : s;
  return neg ? `-${texto}` : texto;
}

export const reais = (c: bigint) => paraTexto(c, 2);

export function calcularItem(item: ItemBase, modo: Modo): ItemCalculado | null {
  const preco = centavos(item.preco_base);
  const pct = centesimosPct(item.pct);
  const qtd = milesimos(item.qtd);
  if (preco === null || pct === null || qtd === null || pct > 10000n) return null;

  let unit_prazo: bigint;
  let unit_vista: bigint;
  if (modo === "B") {
    unit_vista = preco;
    unit_prazo = dividirArredondando(preco * (10000n + pct), 10000n);
  } else {
    unit_prazo = preco;
    unit_vista = dividirArredondando(preco * (10000n - pct), 10000n);
  }
  return {
    unit_prazo,
    unit_vista,
    total_prazo: dividirArredondando(qtd * unit_prazo, 1000n),
    total_vista: dividirArredondando(qtd * unit_vista, 1000n),
  };
}

export function calcularTotais(
  itens: Array<ItemCalculado | null>,
  descontoTexto: string,
  acrescimoTexto: string,
): Totais {
  const ok = itens.filter((i): i is ItemCalculado => i !== null);
  const subtotal_prazo = ok.reduce((s, i) => s + i.total_prazo, 0n);
  const subtotal_vista = ok.reduce((s, i) => s + i.total_vista, 0n);
  const desconto = centavos(descontoTexto || "0") ?? 0n;
  const acrescimo = centavos(acrescimoTexto || "0") ?? 0n;
  const total_prazo = subtotal_prazo - desconto + acrescimo;
  const total_vista = subtotal_vista - desconto + acrescimo;
  return { subtotal_prazo, subtotal_vista, desconto, acrescimo, total_prazo, total_vista, economia: total_prazo - total_vista };
}

/** Desconto só é válido se nenhum total ficar negativo. */
export function descontoValido(t: Totais): boolean {
  return t.total_vista >= 0n && t.total_prazo >= 0n;
}

/** Centavos → "R$ 1.234,56". */
export function formatarCentavos(c: bigint): string {
  const neg = c < 0n;
  const abs = neg ? -c : c;
  const inteiro = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${neg ? "-" : ""}R$ ${inteiro},${frac}`;
}

/** Texto do banco ("1221.6", "12.500") → texto para campo brasileiro ("1.221,60", "12,5"). */
export function paraCampoMoeda(v: string | number | null | undefined): string {
  const c = centavos(String(v ?? "0")) ?? 0n;
  return formatarCentavos(c).replace("R$ ", "");
}

export function paraCampoDecimal(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  if (!s) return "";
  const [i, f = ""] = s.split(".");
  const frac = f.replace(/0+$/, "");
  return frac ? `${i},${frac}` : i;
}
