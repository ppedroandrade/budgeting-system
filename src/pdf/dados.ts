import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { centavos, formatarCentavos, paraCampoDecimal } from "@/lib/calculo";
import { telefone } from "@/lib/formato";
import { FORMAS_PAGAMENTO, nomeAmbiente, type FormaPagamento } from "@/lib/orcamento";
import { supabaseServidor } from "@/lib/supabase/server";

const PASTA = path.join(process.cwd(), "src/pdf");

export type ItemPdf = {
  foto: string | null; // data URI JPEG já comprimido
  marca: string;
  nome: string;
  detalhe: string; // "ref · acabamento"
  qtd: string; // "12,5 m²"
  pct: string; // "20%"
  unit_prazo: string;
  total_prazo: string;
  total_vista: string;
};

export type GrupoPdf = { ambiente: string; itens: ItemPdf[]; subtotal_prazo: string; subtotal_vista: string };

export type DadosPdf = {
  numero: string;
  data: string;
  validade: string;
  logo: string;
  marcaDagua: string;
  mostrarPct: boolean;
  empresa: { razao_social: string; cnpj: string; endereco: string; telefone: string; whatsapp: string; instagram: string; site: string; horario: string };
  cliente: { nome: string; cpf_cnpj: string; telefone: string; email: string; endereco: string } | null;
  consultor: { nome: string; whatsapp: string } | null;
  arquiteto: string;
  grupos: GrupoPdf[];
  totais: {
    subtotal_prazo: string; subtotal_vista: string; desconto: string | null; motivo_desconto: string;
    acrescimo: string | null; motivo_acrescimo: string; total_prazo: string; total_vista: string; economia: string | null;
  };
  formas: string[];
  condicoes: string;
  observacoes: string;
};

const brl = (v: unknown) => formatarCentavos(centavos(String(v ?? 0)) ?? 0n);
const c = (v: unknown) => centavos(String(v ?? 0)) ?? 0n;

const dataUri = (buf: Buffer, tipo: "jpeg" | "png") => `data:image/${tipo};base64,${buf.toString("base64")}`;

/** Baixa só imagens do nosso Storage (nunca de outro endereço). */
async function baixar(url: string): Promise<Buffer | null> {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;
  if (!url.startsWith(base)) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return null;
  }
}

/** Foto do item: ~240px, fundo branco, JPEG leve — nítida no papel e o PDF fica pequeno. */
async function miniatura(url: string | null, cache: Map<string, Promise<string | null>>): Promise<string | null> {
  if (!url) return null;
  if (!cache.has(url)) {
    cache.set(
      url,
      (async () => {
        const buf = await baixar(url);
        if (!buf) return null;
        try {
          const jpg = await sharp(buf)
            .rotate()
            .resize(260, 260, { fit: "inside", withoutEnlargement: true })
            .flatten({ background: "#ffffff" })
            .jpeg({ quality: 80, mozjpeg: true })
            .toBuffer();
          return dataUri(jpg, "jpeg");
        } catch {
          return null; // arquivo corrompido: cai no espaço neutro com a logo
        }
      })(),
    );
  }
  return cache.get(url)!;
}

async function logoEmpresa(url: string | null | undefined): Promise<string> {
  const buf = url ? await baixar(url) : null;
  if (buf) {
    try {
      return dataUri(await sharp(buf).resize(900, 300, { fit: "inside", withoutEnlargement: true }).png().toBuffer(), "png");
    } catch {}
  }
  return dataUri(await readFile(path.join(PASTA, "logo-padrao.png")), "png");
}

type Empresa = DadosPdf["empresa"] & { logo_url?: string | null; pdf_mostrar_pct?: boolean };

/** Monta tudo que o PDF precisa. Devolve null se o orçamento não existe ou não é visível para quem pediu (RLS). */
export async function carregarDadosPdf(id: string): Promise<DadosPdf | null> {
  const supabase = await supabaseServidor();
  const { data: o } = await supabase.from("orcamentos").select("*").eq("id", id).maybeSingle();
  if (!o) return null;

  const [{ data: itens }, empresaViva, consultorVivo] = await Promise.all([
    supabase.from("orcamento_itens").select("*").eq("orcamento_id", id).order("ordem"),
    // Rascunho usa dados atuais; depois de enviado, as cópias congeladas (o PDF sai igual ao enviado).
    o.status === "rascunho" || !o.snapshot_empresa
      ? supabase.from("empresa").select("*").eq("id", 1).single().then((r) => r.data as Empresa)
      : Promise.resolve(o.snapshot_empresa as Empresa),
    o.status === "rascunho" || !o.snapshot_consultor
      ? supabase.from("usuarios").select("nome, whatsapp").eq("id", o.vendedor_id).maybeSingle().then((r) => r.data ?? o.snapshot_consultor)
      : Promise.resolve(o.snapshot_consultor),
  ]);
  const empresa = empresaViva as Empresa;

  const cache = new Map<string, Promise<string | null>>();
  const fotos = await Promise.all((itens ?? []).map((i) => miniatura(i.foto_url, cache)));

  // Agrupa por ambiente, na ordem em que aparecem; sem ambiente → "Outros" (sempre por último).
  const grupos = new Map<string, { itens: ItemPdf[]; prazo: bigint; vista: bigint }>();
  (itens ?? []).forEach((i, k) => {
    const nome = nomeAmbiente(i.ambiente);
    if (!grupos.has(nome)) grupos.set(nome, { itens: [], prazo: 0n, vista: 0n });
    const g = grupos.get(nome)!;
    g.prazo += c(i.total_prazo);
    g.vista += c(i.total_vista);
    g.itens.push({
      foto: fotos[k],
      marca: i.marca,
      nome: i.nome,
      detalhe: [i.referencia && `Ref. ${i.referencia}`, i.acabamento].filter(Boolean).join(" · "),
      qtd: `${paraCampoDecimal(String(i.qtd))} ${i.unidade}`,
      pct: `${paraCampoDecimal(String(i.pct))}%`,
      unit_prazo: brl(i.unit_prazo),
      total_prazo: brl(i.total_prazo),
      total_vista: brl(i.total_vista),
    });
  });
  const ordem = [...grupos.keys()].sort((a, b) => (a === "Outros" ? 1 : 0) - (b === "Outros" ? 1 : 0));

  const cli = o.snapshot_cliente as DadosPdf["cliente"] | null;
  const cons = consultorVivo as { nome?: string; whatsapp?: string | null } | null;
  const economia = c(o.total_prazo) - c(o.total_vista);
  const formas = (o.formas_pagamento as FormaPagamento[])
    .map((f) => (f === "outro" ? o.forma_outro || "Outro" : FORMAS_PAGAMENTO.find(([v]) => v === f)?.[1]))
    .filter(Boolean) as string[];

  return {
    numero: o.numero,
    data: o.data,
    validade: o.validade,
    logo: await logoEmpresa(empresa.logo_url),
    marcaDagua: dataUri(await readFile(path.join(PASTA, "logo-marca-dagua.png")), "png"),
    mostrarPct: Boolean(empresa.pdf_mostrar_pct),
    empresa: {
      razao_social: empresa.razao_social ?? "",
      cnpj: empresa.cnpj ?? "",
      endereco: empresa.endereco ?? "",
      telefone: empresa.telefone ?? "",
      whatsapp: empresa.whatsapp ?? "",
      instagram: empresa.instagram ?? "",
      site: empresa.site ?? "",
      horario: empresa.horario ?? "",
    },
    cliente: cli?.nome ? cli : null,
    consultor: cons?.nome ? { nome: cons.nome, whatsapp: telefone(cons.whatsapp) } : null,
    arquiteto: o.arquiteto ?? "",
    grupos: ordem.map((ambiente) => {
      const g = grupos.get(ambiente)!;
      return { ambiente, itens: g.itens, subtotal_prazo: formatarCentavos(g.prazo), subtotal_vista: formatarCentavos(g.vista) };
    }),
    totais: {
      subtotal_prazo: brl(o.subtotal_prazo),
      subtotal_vista: brl(o.subtotal_vista),
      desconto: c(o.desconto) > 0n ? brl(o.desconto) : null,
      motivo_desconto: o.motivo_desconto ?? "",
      acrescimo: c(o.acrescimo) > 0n ? brl(o.acrescimo) : null,
      motivo_acrescimo: o.motivo_acrescimo ?? "",
      total_prazo: brl(o.total_prazo),
      total_vista: brl(o.total_vista),
      economia: economia > 0n ? formatarCentavos(economia) : null,
    },
    formas,
    condicoes: o.condicoes ?? "",
    observacoes: o.observacoes ?? "",
  };
}
