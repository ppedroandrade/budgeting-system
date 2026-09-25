"use client";

import { useRef, useState } from "react";
import { enviarImagem, redimensionar } from "@/lib/imagem";

/** Foto do produto: câmera ou galeria, reduzida para 1200px em JPEG e enviada na hora. */
export function FotoProduto({ url, aoMudar }: { url: string | null; aoMudar: (url: string | null) => void }) {
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function escolher(arquivo?: File) {
    if (!arquivo) return;
    setEnviando(true);
    setErro("");
    try {
      aoMudar(await enviarImagem("produtos", await redimensionar(arquivo)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao enviar a foto.");
    } finally {
      setEnviando(false);
      if (camera.current) camera.current.value = "";
      if (galeria.current) galeria.current.value = "";
    }
  }

  const botao =
    "min-h-12 flex-1 rounded-ad border border-linha bg-superficie px-3 text-[0.75rem] tracking-[0.14em] uppercase text-tinta hover:border-tinta disabled:opacity-50";

  return (
    <div>
      <p className="rotulo mb-1.5">Foto</p>
      <div className="grid aspect-square w-full max-w-56 place-items-center overflow-hidden rounded-ad border border-linha bg-white">
        {enviando ? (
          <span className="text-sm text-tinta-suave">Enviando…</span>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Foto do produto" className="h-full w-full object-contain" />
        ) : (
          <span className="px-4 text-center text-sm text-tinta-suave">Sem foto</span>
        )}
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} aria-label="Tirar foto" />
      <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} aria-label="Escolher foto da galeria" />
      <div className="mt-3 flex max-w-56 gap-2">
        <button type="button" className={botao} disabled={enviando} onClick={() => camera.current?.click()}>
          Câmera
        </button>
        <button type="button" className={botao} disabled={enviando} onClick={() => galeria.current?.click()}>
          Galeria
        </button>
      </div>
      {url && !enviando && (
        <button type="button" className="mt-2 min-h-10 text-sm text-tinta-suave underline-offset-4 hover:underline" onClick={() => aoMudar(null)}>
          Remover foto
        </button>
      )}
      {erro && <p className="mt-2 text-sm text-perigo">{erro}</p>}
    </div>
  );
}
