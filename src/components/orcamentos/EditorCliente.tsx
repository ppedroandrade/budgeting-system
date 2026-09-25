"use client";

import dynamic from "next/dynamic";
import type { PropsEditor } from "./Editor";

// A tela de orçamento roda só no navegador: ela lê o rascunho guardado no aparelho ao abrir.
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-6" aria-label="Carregando orçamento">
      <div className="h-12 w-2/3 rounded bg-linha/60" />
      <div className="h-40 rounded-ad bg-linha/40" />
      <div className="h-64 rounded-ad bg-linha/40" />
    </div>
  ),
});

export function EditorCliente(props: PropsEditor) {
  return <Editor {...props} />;
}
