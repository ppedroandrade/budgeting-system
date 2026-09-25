"use client";

import { useRef, useState } from "react";
import { salvarCampo } from "./actions";
import { enviarImagem, redimensionar } from "@/lib/imagem";
import { Botao } from "@/components/ui/Botao";

export const LOGO_PADRAO = "/brand/logo-escura-alta.png";

export function UploadLogo({ inicial }: { inicial: string | null }) {
  const [url, setUrl] = useState(inicial);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro" | "info"; texto: string } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  async function escolher(arquivo?: File) {
    if (!arquivo) return;
    setMsg({ tipo: "info", texto: "Enviando…" });
    try {
      const tipo = arquivo.type === "image/png" ? "image/png" : "image/jpeg";
      const nova = await enviarImagem("empresa", await redimensionar(arquivo, 1200, tipo));
      const r = await salvarCampo("logo_url", nova);
      if (!r.ok) throw new Error(r.erro);
      setUrl(nova);
      setMsg({ tipo: "ok", texto: "✓ Logo atualizada. Vale para os próximos PDFs." });
    } catch (e) {
      setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Falha ao enviar." });
    } finally {
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function voltarPadrao() {
    const r = await salvarCampo("logo_url", "");
    if (r.ok) {
      setUrl(null);
      setMsg({ tipo: "ok", texto: "✓ Voltou para a logo padrão." });
    }
  }

  return (
    <div className="border-t border-linha pt-5">
      <p className="rotulo mb-3">Logo do PDF</p>
      <div className="mb-4 grid h-28 place-items-center rounded-ad border border-linha bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url ?? LOGO_PADRAO} alt="Logo atual" className="max-h-20 max-w-full object-contain" />
      </div>
      <p className="mb-4 text-sm text-tinta-suave">
        O PDF tem fundo branco: use a logo <strong className="font-normal text-tinta">escura</strong> (PNG com fundo transparente fica melhor).
      </p>
      <input ref={entrada} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} aria-label="Arquivo da logo" />
      <div className="flex flex-wrap gap-3">
        <Botao type="button" variante="secundario" onClick={() => entrada.current?.click()}>
          Enviar nova logo
        </Botao>
        {url && (
          <Botao type="button" variante="texto" onClick={voltarPadrao}>
            Usar a logo padrão
          </Botao>
        )}
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.tipo === "erro" ? "text-perigo" : msg.tipo === "ok" ? "text-sucesso" : "text-tinta-suave"}`}>{msg.texto}</p>}
    </div>
  );
}
