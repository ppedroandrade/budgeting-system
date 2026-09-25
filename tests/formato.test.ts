import { describe, expect, it } from "vitest";
import { data, mesCurto, moeda, moedaCompacta, telefone } from "@/lib/formato";

describe("formato brasileiro", () => {
  it("moeda", () => {
    expect(moeda("26633.50")).toBe("R$ 26.633,50");
    expect(moeda(0)).toBe("R$ 0,00");
    expect(moeda("977.28")).toBe("R$ 977,28");
  });
  it("moeda compacta (eixo do gráfico)", () => {
    expect(moedaCompacta(0)).toBe("R$ 0");
    expect(moedaCompacta(10000)).toBe("R$ 10 mil");
    expect(moedaCompacta(12500)).toBe("R$ 12,5 mil");
    expect(moedaCompacta(1250000)).toBe("R$ 1,3 mi");
  });
  it("datas", () => {
    expect(data("2026-09-25")).toBe("25/09/2026");
    expect(mesCurto("2026-01-01")).toBe("jan/26");
  });
  it("telefone", () => {
    expect(telefone("45988274710")).toBe("(45) 98827-4710");
    expect(telefone("4531981111")).toBe("(45) 3198-1111");
  });
});
