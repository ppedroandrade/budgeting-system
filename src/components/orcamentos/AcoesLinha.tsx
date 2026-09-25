"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { baixarPdfBlob, compartilhar, marcarEnviado, salvarArquivo, type DadosEnvio } from "./compartilhar";
import { supabaseNavegador } from "@/lib/supabase/client";
import { nomeArquivoPdf } from "@/lib/texto";

/** Ações rápidas da lista: abrir, baixar PDF, duplicar, compartilhar. */
export function AcoesLinha({ d, status }: { d: DadosEnvio; status: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState("");
  const [erro, setErro] = useState("");

  async function rodar(nome: string, fn: () => Promise<void>) {
    setOcupado(nome);
    setErro("");
    try {
      await fn();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falhou. Tente de novo.");
    } finally {
      setOcupado("");
    }
  }

  const b = "min-h-11 rounded-ad border border-linha px-3 text-[0.6875rem] tracking-[0.14em] uppercase text-tinta hover:border-tinta disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/orcamentos/${d.id}`} className={`${b} inline-flex items-center`}>
        Abrir
      </Link>
      <button type="button" className={b} disabled={!!ocupado} onClick={() => rodar("pdf", async () => salvarArquivo(await baixarPdfBlob(d.id), nomeArquivoPdf(d.numero, d.cliente)))}>
        {ocupado === "pdf" ? "…" : "PDF"}
      </button>
      <button
        type="button"
        className={b}
        disabled={!!ocupado}
        onClick={() =>
          rodar("dup", async () => {
            const { data, error } = await supabaseNavegador().rpc("duplicar_orcamento", { p_id: d.id });
            if (error || !data) throw new Error("Não foi possível duplicar.");
            router.push(`/orcamentos/${data}`);
          })
        }
      >
        {ocupado === "dup" ? "…" : "Duplicar"}
      </button>
      <button
        type="button"
        className={`${b} border-bronze/50 text-bronze`}
        disabled={!!ocupado}
        onClick={() => {
          const janela = window.matchMedia("(pointer: coarse)").matches ? null : window.open("about:blank", "_blank");
          rodar("share", async () => {
            try {
              const r = await compartilhar(d, await baixarPdfBlob(d.id), janela);
              if ((r === "compartilhado" || r === "whatsapp") && status === "rascunho") {
                await marcarEnviado(d.id);
                router.refresh();
              }
              if (r === "precisa-toque") throw new Error("Abra o orçamento e toque em Compartilhar de novo.");
            } catch (e) {
              janela?.close();
              throw e;
            }
          });
        }}
      >
        {ocupado === "share" ? "…" : "Compartilhar"}
      </button>
      {erro && <span className="w-full text-sm text-perigo">{erro}</span>}
    </div>
  );
}
