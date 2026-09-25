import "server-only";
import { supabaseServidor } from "@/lib/supabase/server";

export type LinhaRt = {
  id: string;
  orcamento_id: string | null;
  orcamento_numero: string | null;
  arquiteto_id: string;
  arquiteto_nome: string;
  arquiteto_pix: string | null;
  arquiteto_telefone: string | null;
  cliente_nome: string;
  mes_ref: string;
  data_pedido: string;
  nota_fiscal: string;
  acompanhou: boolean;
  valor_compra: number;
  pct: number;
  valor_rt: number;
  cancelado: boolean;
  ajustado: boolean;
  observacoes: string;
  recebido: number;
  pago: number;
  rt_liberado: number;
  saldo_a_pagar: number;
  cliente_falta: number;
  situacao_cliente: "aguardando" | "parcial" | "quitado";
  situacao_rt: "aguardando_cliente" | "a_pagar" | "pago" | "cancelado";
};

export const SITUACAO_CLIENTE = {
  aguardando: { rotulo: "Cliente não pagou", classe: "bg-linha/60 text-tinta-suave" },
  parcial: { rotulo: "Cliente pagou parte", classe: "bg-atencao/10 text-atencao" },
  quitado: { rotulo: "Cliente quitou", classe: "bg-sucesso/10 text-sucesso" },
} as const;

export const SITUACAO_RT = {
  aguardando_cliente: { rotulo: "Aguardando cliente", classe: "bg-linha/60 text-tinta-suave" },
  a_pagar: { rotulo: "RT a pagar", classe: "bg-perigo/10 text-perigo" },
  pago: { rotulo: "RT paga", classe: "bg-sucesso/10 text-sucesso" },
  cancelado: { rotulo: "Cancelado", classe: "bg-tinta/5 text-tinta-suave line-through decoration-1" },
} as const;

/** Filtros da tela (e da planilha exportada): ?mes=2026-06 | aberto | todos, ?arquiteto=<id>, ?situacao=… */
export type FiltrosRt = { mes?: string; arquiteto?: string; situacao?: string };

export const FILTRO_SITUACAO: Record<string, string> = {
  a_pagar: "RT a pagar agora",
  aguardando_cliente: "Aguardando o cliente pagar",
  parcial: "Cliente pagou parte",
  pago: "RT paga",
  cancelado: "Cancelados",
};

export async function lerLancamentos(f: FiltrosRt): Promise<LinhaRt[]> {
  const supabase = await supabaseServidor();
  let q = supabase.from("rt_resumo").select("*").order("mes_ref", { ascending: false }).order("data_pedido", { ascending: false }).limit(2000);
  const mes = f.mes ?? "aberto";
  const situacao = f.situacao && f.situacao in FILTRO_SITUACAO ? f.situacao : "";
  if (/^\d{4}-\d{2}$/.test(mes)) q = q.eq("mes_ref", `${mes}-01`);
  if (f.arquiteto && /^[0-9a-f-]{36}$/i.test(f.arquiteto)) q = q.eq("arquiteto_id", f.arquiteto);

  if (situacao === "parcial") q = q.eq("situacao_cliente", "parcial").eq("cancelado", false);
  else if (situacao) q = q.eq("situacao_rt", situacao);
  // Sem filtro de situação: "Em aberto" = tudo que ainda falta resolver; cancelados só em "Todos".
  else if (mes === "aberto") q = q.eq("cancelado", false).neq("situacao_rt", "pago");
  else if (mes !== "todos") q = q.eq("cancelado", false);
  const { data } = await q.returns<LinhaRt[]>();
  return (data ?? []).map((l) => ({
    ...l,
    valor_compra: Number(l.valor_compra), pct: Number(l.pct), valor_rt: Number(l.valor_rt),
    recebido: Number(l.recebido), pago: Number(l.pago), rt_liberado: Number(l.rt_liberado),
    saldo_a_pagar: Number(l.saldo_a_pagar), cliente_falta: Number(l.cliente_falta),
  }));
}

/** Soma em centavos para não acumular erro de ponto flutuante. */
export function somar(linhas: LinhaRt[], campo: keyof LinhaRt): number {
  return linhas.reduce((s, l) => s + Math.round(Number(l[campo]) * 100), 0) / 100;
}

export function nomeMes(iso: string): string {
  const [a, m] = iso.split("-");
  const nomes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${nomes[Number(m) - 1]}/${a}`;
}
