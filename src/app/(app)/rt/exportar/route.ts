import ExcelJS from "exceljs";
import { lerLancamentos, nomeMes, SITUACAO_CLIENTE, SITUACAO_RT, somar } from "@/lib/rt";
import { supabaseServidor } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MOEDA = '_-"R$"\\ * #,##0.00_-;\\-"R$"\\ * #,##0.00_-;_-"R$"\\ * "-"??_-;_-@_-';
const dataUtc = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};

/** GET /rt/exportar?mes=…&arquiteto=…&situacao=… — planilha de RT no mesmo layout da loja. Só admin. */
export async function GET(req: Request) {
  const supabase = await supabaseServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return new Response("Faça login", { status: 401 });
  const { data: eu } = await supabase.from("usuarios").select("perfil, ativo").eq("id", uid).maybeSingle();
  if (!eu?.ativo || eu.perfil !== "admin") return new Response("Só o administrador", { status: 403 });

  const url = new URL(req.url);
  const f = { mes: url.searchParams.get("mes") ?? "aberto", arquiteto: url.searchParams.get("arquiteto") ?? undefined, situacao: url.searchParams.get("situacao") ?? undefined };
  const linhas = await lerLancamentos(f);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Arte Decor Revest";
  wb.calcProperties = { fullCalcOnLoad: true };
  const titulo = /^\d{4}-\d{2}$/.test(f.mes) ? nomeMes(f.mes) : f.mes === "todos" ? "todos os meses" : "em aberto";
  const ws = wb.addWorksheet(/^\d{4}-\d{2}$/.test(f.mes) ? `${f.mes.slice(5)}.${f.mes.slice(0, 4)}` : "RT", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });

  const colunas = [
    ["Mês.Ano", 10], ["Arquiteto/Engenheiro/Construtor", 32], ["Nome do Cliente", 30], ["Data pedido", 12],
    ["Nota fiscal", 12], ["Acompanhou", 12], ["Valor da Compra", 17], ["% RT", 8], ["Valor Rt", 15],
    ["Cliente pagou", 17], ["Situação do cliente", 20], ["RT paga", 15], ["RT a pagar", 15], ["Situação da RT", 18], ["Orçamento", 12],
  ] as const;
  ws.columns = colunas.map(([, w]) => ({ width: w }));

  ws.mergeCells(2, 1, 2, colunas.length);
  const t = ws.getCell(2, 1);
  t.value = `RT | Arte Decor Revest — ${titulo}`;
  t.font = { bold: true, size: 14 };
  t.alignment = { horizontal: "center" };

  const cab = ws.getRow(4);
  cab.values = colunas.map(([n]) => n);
  cab.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cab.alignment = { vertical: "middle", wrapText: true };
  cab.height = 30;
  cab.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F1D1B" } }));

  linhas.forEach((l, i) => {
    const r = 5 + i;
    const row = ws.getRow(r);
    row.values = [
      dataUtc(l.mes_ref),
      l.arquiteto_nome,
      l.cliente_nome,
      dataUtc(l.data_pedido),
      l.nota_fiscal,
      l.acompanhou ? "SIM" : "NÃO",
      l.valor_compra,
      l.pct / 100,
      { formula: `ROUND(G${r}*H${r},2)`, result: l.valor_rt },
      l.recebido,
      SITUACAO_CLIENTE[l.situacao_cliente].rotulo,
      l.pago,
      l.saldo_a_pagar,
      SITUACAO_RT[l.situacao_rt].rotulo,
      l.orcamento_numero ?? "",
    ];
    if (l.cancelado) row.font = { color: { argb: "FF9A9A9A" }, strike: true };
  });

  const fim = 4 + linhas.length;
  const total = ws.getRow(fim + 1);
  total.getCell(1).value = "TOTAL";
  const somas: Record<string, keyof (typeof linhas)[number]> = { G: "valor_compra", I: "valor_rt", J: "recebido", L: "pago", M: "saldo_a_pagar" };
  for (const [col, campo] of Object.entries(somas)) {
    total.getCell(col).value = { formula: `SUM(${col}5:${col}${Math.max(fim, 5)})`, result: somar(linhas, campo) };
  }
  total.font = { bold: true };
  total.eachCell((c) => (c.border = { top: { style: "thin" } }));

  ws.getColumn(1).numFmt = "mmm-yy";
  ws.getColumn(4).numFmt = "dd/mm/yy";
  ws.getColumn(8).numFmt = "0%";
  for (const c of [7, 9, 10, 12, 13]) ws.getColumn(c).numFmt = MOEDA;

  const buf = await wb.xlsx.writeBuffer();
  const nome = `RT_${f.mes === "aberto" ? "em-aberto" : f.mes}.xlsx`;
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
