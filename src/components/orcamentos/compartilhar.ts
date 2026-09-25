"use client";

import { supabaseNavegador } from "@/lib/supabase/client";
import { data as fData } from "@/lib/formato";
import { nomeArquivoPdf } from "@/lib/texto";

export type DadosEnvio = {
  id: string;
  numero: string;
  cliente: string;
  telefone: string;
  validade: string;
  consultor: string;
};

export async function baixarPdfBlob(id: string): Promise<Blob> {
  const r = await fetch(`/orcamentos/${id}/pdf`, { cache: "no-store" });
  if (!r.ok) throw new Error("Não foi possível gerar o PDF. Tente de novo.");
  return r.blob();
}

export function salvarArquivo(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function mensagemWhatsApp(d: DadosEnvio): string {
  const primeiro = d.cliente.trim().split(/\s+/)[0] || "";
  return `Olá, ${primeiro || d.cliente}! Segue o orçamento nº ${d.numero} da Arte Decor Revest, válido até ${fData(d.validade)}. Qualquer dúvida, estou à disposição. ${d.consultor}`;
}

/** Número brasileiro → formato do WhatsApp (55 + DDD + número). */
export function numeroWhatsApp(telefone: string): string | null {
  let d = telefone.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d.length >= 12 ? d : null;
}

export type ResultadoEnvio = "compartilhado" | "whatsapp" | "cancelado" | "precisa-toque";

/**
 * Celular: abre a folha de compartilhar do aparelho com o PDF (WhatsApp, e-mail…).
 * Computador: baixa o PDF e abre o WhatsApp Web com a mensagem pronta.
 * Se o navegador exigir um novo toque (o PDF demorou), devolve "precisa-toque".
 */
export async function compartilhar(d: DadosEnvio, blob: Blob, janelaWhats?: Window | null): Promise<ResultadoEnvio> {
  const nome = nomeArquivoPdf(d.numero, d.cliente);
  const arquivo = new File([blob], nome, { type: "application/pdf" });
  const texto = mensagemWhatsApp(d);
  const celular = window.matchMedia("(pointer: coarse)").matches;

  if (celular && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: `Orçamento ${d.numero}`, text: texto });
      janelaWhats?.close();
      return "compartilhado";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        janelaWhats?.close();
        return "cancelado";
      }
      if (e instanceof DOMException && e.name === "NotAllowedError") return "precisa-toque";
    }
  }

  salvarArquivo(blob, nome);
  const numero = numeroWhatsApp(d.telefone);
  const url = `https://wa.me/${numero ?? ""}?text=${encodeURIComponent(texto)}`;
  if (janelaWhats) janelaWhats.location.href = url;
  else window.open(url, "_blank", "noopener");
  return "whatsapp";
}

export async function marcarEnviado(id: string): Promise<string | null> {
  const { data } = await supabaseNavegador().rpc("marcar_enviado", { p_id: id });
  return (data as string) ?? null;
}
