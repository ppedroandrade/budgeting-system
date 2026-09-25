import { describe, expect, it } from "vitest";
import { nomeArquivoPdf, semAcento, termosBusca } from "@/lib/texto";

describe("texto", () => {
  it("sem acento", () => {
    expect(semAcento("Cerâmica Acetinada Ç")).toBe("ceramica acetinada c");
  });
  it("termos da busca", () => {
    expect(termosBusca("  Docol  grafite ")).toEqual(["docol", "grafite"]);
    expect(termosBusca("50%,(x)")).toEqual(["50", "x"]);
  });
  it("nome do arquivo do PDF sem acentos, espaços e símbolos", () => {
    expect(nomeArquivoPdf("2026-0001", "Ali")).toBe("Orcamento_2026-0001_Ali.pdf");
    expect(nomeArquivoPdf("2026-0002", "João da Conceição & Filhos")).toBe("Orcamento_2026-0002_JoaoDaConceicaoFilhos.pdf");
    expect(nomeArquivoPdf("2026-0003", "")).toBe("Orcamento_2026-0003.pdf");
  });
});
