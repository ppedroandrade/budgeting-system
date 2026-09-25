import { describe, expect, it } from "vitest";
import {
  calcularItem, calcularTotais, centavos, descontoValido, formatarCentavos, milesimos,
  paraCampoDecimal, paraCampoMoeda, reais, type ItemBase,
} from "@/lib/calculo";

// Planilha do cliente Ali (seção 10): preço à prazo, qtd
const ALI: Array<[string, string]> = [
  ["494,80", "1"], ["3.324,00", "1"], ["600,00", "1"], ["764,40", "1"], ["249,52", "1"],
  ["956,34", "1"], ["780,84", "1"], ["1.221,60", "4"], ["2.722,80", "4"], ["3.686,00", "1"],
];
const itensAli: ItemBase[] = ALI.map(([preco_base, qtd]) => ({ preco_base, qtd, pct: "20" }));

describe("cálculo do orçamento", () => {
  it("Ali — Modo A, 20%: R$ 26.633,50 à prazo e R$ 21.306,80 à vista", () => {
    const itens = itensAli.map((i) => calcularItem(i, "A"));
    const t = calcularTotais(itens, "", "");
    expect(formatarCentavos(t.total_prazo)).toBe("R$ 26.633,50");
    expect(formatarCentavos(t.total_vista)).toBe("R$ 21.306,80");
    expect(formatarCentavos(t.economia)).toBe("R$ 5.326,70");
    expect(reais(itens[7]!.unit_vista)).toBe("977.28");
    expect(reais(itens[7]!.total_vista)).toBe("3909.12");
    expect(reais(itens[8]!.unit_vista)).toBe("2178.24");
    expect(reais(itens[8]!.total_vista)).toBe("8712.96");
  });

  it("Ali — Modo B (preço digitado = à vista; à prazo = vista × 1,20)", () => {
    const t = calcularTotais(itensAli.map((i) => calcularItem(i, "B")), "", "");
    expect(formatarCentavos(t.total_vista)).toBe("R$ 26.633,50");
    expect(formatarCentavos(t.total_prazo)).toBe("R$ 31.960,20");
  });

  it("arredonda meio-para-cima no unitário e na linha", () => {
    // 0,25 × (1 − 50%) = 0,125 → 0,13
    expect(reais(calcularItem({ preco_base: "0,25", pct: "50", qtd: "1" }, "A")!.unit_vista)).toBe("0.13");
    // 956,34 × 0,8 = 765,072 → 765,07
    expect(reais(calcularItem({ preco_base: "956,34", pct: "20", qtd: "1" }, "A")!.unit_vista)).toBe("765.07");
    // preço com 3 casas é arredondado para 0,34 antes: 3 × 0,34 = 1,02
    expect(reais(calcularItem({ preco_base: "0,335", pct: "0", qtd: "3" }, "A")!.total_prazo)).toBe("1.02");
  });

  it("quantidade decimal: 12,5 m² × R$ 89,90", () => {
    const i = calcularItem({ preco_base: "89,90", pct: "20", qtd: "12,5" }, "A")!;
    expect(reais(i.total_prazo)).toBe("1123.75");
    expect(reais(i.total_vista)).toBe("899.00");
  });

  it("% por item de 0 a 100", () => {
    expect(reais(calcularItem({ preco_base: "100", pct: "0", qtd: "1" }, "A")!.unit_vista)).toBe("100.00");
    expect(reais(calcularItem({ preco_base: "100", pct: "100", qtd: "1" }, "A")!.unit_vista)).toBe("0.00");
    expect(calcularItem({ preco_base: "100", pct: "101", qtd: "1" }, "A")).toBeNull();
  });

  it("desconto e acréscimo; desconto maior que o subtotal é inválido", () => {
    const itens = [calcularItem({ preco_base: "100", pct: "20", qtd: "1" }, "A")];
    const t = calcularTotais(itens, "10", "5");
    expect([reais(t.total_prazo), reais(t.total_vista)]).toEqual(["95.00", "75.00"]);
    expect(descontoValido(t)).toBe(true);
    expect(descontoValido(calcularTotais(itens, "80,01", ""))).toBe(false);
    expect(descontoValido(calcularTotais(itens, "80", ""))).toBe(true);
  });

  it("campos inválidos não entram na soma", () => {
    expect(calcularItem({ preco_base: "abc", pct: "20", qtd: "1" }, "A")).toBeNull();
    expect(calcularItem({ preco_base: "10", pct: "20", qtd: "" }, "A")).toBeNull();
  });

  it("leitura de números no formato brasileiro", () => {
    expect(centavos("1.221,60")).toBe(122160n);
    expect(centavos("1221.60")).toBe(122160n);
    expect(centavos("1.221")).toBe(122100n);
    expect(centavos("R$ 3.324,00")).toBe(332400n);
    expect(centavos("0,5")).toBe(50n);
    expect(milesimos("12,5")).toBe(12500n);
    expect(centavos("-1")).toBeNull();
    expect(paraCampoMoeda("1221.6")).toBe("1.221,60");
    expect(paraCampoDecimal("12.500")).toBe("12,5");
    expect(paraCampoDecimal("4.000")).toBe("4");
  });
});
