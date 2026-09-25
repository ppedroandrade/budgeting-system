import { describe, expect, it } from "vitest";
import { mensagemWhatsApp, numeroWhatsApp } from "@/components/orcamentos/compartilhar";

describe("mensagem de WhatsApp", () => {
  it("texto combinado na especificação", () => {
    expect(mensagemWhatsApp({ id: "x", numero: "2026-0001", cliente: "Ali Hassan", telefone: "", validade: "2026-10-01", consultor: "Fabiano" }))
      .toBe("Olá, Ali! Segue o orçamento nº 2026-0001 da Arte Decor Revest, válido até 01/10/2026. Qualquer dúvida, estou à disposição. Fabiano");
  });
  it("telefone brasileiro vira 55 + DDD + número", () => {
    expect(numeroWhatsApp("(45) 98827-4710")).toBe("5545988274710");
    expect(numeroWhatsApp("045 3198-1111")).toBe("554531981111");
    expect(numeroWhatsApp("+55 45 98827-4710")).toBe("5545988274710");
    expect(numeroWhatsApp("123")).toBeNull();
  });
});
