import { createElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { carregarDadosPdf } from "@/pdf/dados";
import { DocumentoOrcamento } from "@/pdf/DocumentoOrcamento";
import { supabaseServidor } from "@/lib/supabase/server";
import { nomeArquivoPdf } from "@/lib/texto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /orcamentos/:id/pdf — gera o PDF do orçamento (só para quem pode ver o orçamento). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Não encontrado", { status: 404 });

  const supabase = await supabaseServidor();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return new Response("Faça login", { status: 401 });

  const dados = await carregarDadosPdf(id);
  if (!dados) return new Response("Não encontrado", { status: 404 });

  const doc = createElement(DocumentoOrcamento, { d: dados }) as unknown as React.ReactElement<DocumentProps>;
  const pdf = await renderToBuffer(doc);
  const nome = nomeArquivoPdf(dados.numero, dados.cliente?.nome ?? "");

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
