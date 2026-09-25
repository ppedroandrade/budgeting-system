import {
  calcularItem, calcularTotais, centavos, centesimosPct, milesimos, paraCampoDecimal, paraCampoMoeda, paraTexto, reais,
  type Modo,
} from "@/lib/calculo";
import type { Unidade } from "@/lib/tipos";

/** Formas de pagamento aceitas (valor gravado → rótulo). */
export const FORMAS_PAGAMENTO = [
  ["boleto", "Boleto"],
  ["pix", "Pix"],
  ["cartao", "Cartão"],
  ["dinheiro", "Dinheiro"],
  ["outro", "Outro"],
] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number][0];

export type Status = "rascunho" | "enviado" | "aprovado" | "perdido";

/** Item como a tela mantém: números em texto no formato brasileiro, como digitados. */
export type ItemForm = {
  id: string;
  produto_id: string | null;
  marca: string;
  nome: string;
  referencia: string;
  acabamento: string;
  unidade: Unidade;
  foto_url: string | null;
  ambiente: string;
  qtd: string; // "12,5"
  preco: string; // "1.221,60"
  pct: string; // "20"
  /** Preço do catálogo quando o item foi adicionado (só na tela, para a caixa "atualizar catálogo"). */
  preco_catalogo?: string | null;
};

export type ClienteForm = {
  id: string | null;
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
};

export type OrcamentoForm = {
  id: string | null;
  numero: string | null;
  data: string; // ISO
  validade: string; // ISO
  status: Status;
  modo: Modo;
  vendedor_id: string;
  cliente: ClienteForm | null;
  arquiteto: string;
  /** Venda indicada pelo(a) arquiteto(a): gera RT para o admin quando aprovada. */
  indicacao_arquiteto: boolean;
  arquiteto_acompanhou: boolean;
  itens: ItemForm[];
  desconto: string;
  motivo_desconto: string;
  acrescimo: string;
  motivo_acrescimo: string;
  formas_pagamento: FormaPagamento[];
  forma_outro: string;
  condicoes: string;
  observacoes: string;
};

export const clienteVazio = (nome = ""): ClienteForm => ({ id: null, nome, cpf_cnpj: "", telefone: "", email: "", endereco: "" });

export function itemValido(i: ItemForm): boolean {
  const qtd = milesimos(i.qtd);
  const pct = centesimosPct(i.pct);
  return centavos(i.preco) !== null && qtd !== null && qtd > 0n && pct !== null && pct <= 10000n;
}

export function calcularForm(f: OrcamentoForm) {
  const itens = f.itens.map((i) => calcularItem({ preco_base: i.preco, pct: i.pct, qtd: i.qtd }, f.modo));
  return { itens, totais: calcularTotais(itens, f.desconto, f.acrescimo) };
}

/** Tem algo digitado que justifique criar o orçamento (e gastar um número)? */
export function temConteudo(f: OrcamentoForm): boolean {
  return Boolean(f.cliente?.nome.trim() || f.itens.length || f.arquiteto.trim());
}

/** Motivo para NÃO enviar ao servidor agora (a tela mostra a mensagem; o rascunho local continua guardado). */
export function problemaParaSalvar(f: OrcamentoForm): string | null {
  if (f.itens.some((i) => !itemValido(i))) return "Complete os campos destacados dos itens.";
  if (f.desconto && centavos(f.desconto) === null) return "Desconto inválido.";
  if (f.acrescimo && centavos(f.acrescimo) === null) return "Acréscimo inválido.";
  const { totais } = calcularForm(f);
  if (totais.total_vista < 0n || totais.total_prazo < 0n) return "O desconto é maior que o subtotal do orçamento.";
  if (f.validade < f.data) return "A validade não pode ser antes da data do orçamento.";
  if (f.indicacao_arquiteto && !f.arquiteto.trim()) return "Informe o nome do(a) arquiteto(a) da indicação.";
  return null;
}

/** Converte o formulário no JSON que a função salvar_orcamento() do banco espera. */
export function paraPayload(f: OrcamentoForm, admin: boolean) {
  return {
    id: f.id,
    vendedor_id: admin ? f.vendedor_id : undefined,
    cliente: f.cliente?.nome.trim() ? f.cliente : null,
    arquiteto: f.arquiteto,
    indicacao_arquiteto: f.indicacao_arquiteto,
    arquiteto_acompanhou: f.indicacao_arquiteto && f.arquiteto_acompanhou,
    validade: f.validade,
    status: f.status,
    desconto: reais(centavos(f.desconto || "0") ?? 0n),
    motivo_desconto: f.motivo_desconto,
    acrescimo: reais(centavos(f.acrescimo || "0") ?? 0n),
    motivo_acrescimo: f.motivo_acrescimo,
    formas_pagamento: f.formas_pagamento,
    forma_outro: f.formas_pagamento.includes("outro") ? f.forma_outro : "",
    condicoes: f.condicoes,
    observacoes: f.observacoes,
    itens: f.itens.map((i) => ({
      id: i.id,
      produto_id: i.produto_id,
      marca: i.marca,
      nome: i.nome,
      referencia: i.referencia,
      acabamento: i.acabamento,
      unidade: i.unidade,
      foto_url: i.foto_url,
      ambiente: i.ambiente,
      qtd: paraTexto(milesimos(i.qtd)!, 3),
      preco_base: reais(centavos(i.preco)!),
      pct: paraTexto(centesimosPct(i.pct)!, 2),
    })),
  };
}

type LinhaItem = {
  id: string; produto_id: string | null; marca: string; nome: string; referencia: string; acabamento: string;
  unidade: Unidade; foto_url: string | null; ambiente: string; qtd: string; preco_base: string; pct: string;
};

export type LinhaOrcamento = {
  id: string; numero: string; data: string; validade: string; status: Status; modo_calculo: Modo; vendedor_id: string;
  cliente_id: string | null; arquiteto: string; indicacao_arquiteto: boolean; arquiteto_acompanhou: boolean; desconto: string; motivo_desconto: string; acrescimo: string;
  motivo_acrescimo: string; formas_pagamento: FormaPagamento[]; forma_outro: string; condicoes: string; observacoes: string;
  snapshot_cliente: Omit<ClienteForm, "id"> | null; atualizado_em: string;
};

/** Linha do banco → formulário da tela (números viram texto brasileiro). */
export function deBanco(o: LinhaOrcamento, itens: LinhaItem[], precosCatalogo: Record<string, string>): OrcamentoForm {
  const zero = (v: string) => (Number(v) === 0 ? "" : paraCampoMoeda(v));
  return {
    id: o.id,
    numero: o.numero,
    data: o.data,
    validade: o.validade,
    status: o.status,
    modo: o.modo_calculo,
    vendedor_id: o.vendedor_id,
    cliente: o.snapshot_cliente
      ? { ...clienteVazio(), ...o.snapshot_cliente, id: o.cliente_id }
      : null,
    arquiteto: o.arquiteto,
    indicacao_arquiteto: o.indicacao_arquiteto,
    arquiteto_acompanhou: o.arquiteto_acompanhou,
    itens: itens.map((i) => ({
      id: i.id,
      produto_id: i.produto_id,
      marca: i.marca,
      nome: i.nome,
      referencia: i.referencia,
      acabamento: i.acabamento,
      unidade: i.unidade,
      foto_url: i.foto_url,
      ambiente: i.ambiente,
      qtd: paraCampoDecimal(i.qtd),
      preco: paraCampoMoeda(i.preco_base),
      pct: paraCampoDecimal(i.pct),
      preco_catalogo: i.produto_id && precosCatalogo[i.produto_id] ? paraCampoMoeda(precosCatalogo[i.produto_id]) : null,
    })),
    desconto: zero(o.desconto),
    motivo_desconto: o.motivo_desconto,
    acrescimo: zero(o.acrescimo),
    motivo_acrescimo: o.motivo_acrescimo,
    formas_pagamento: o.formas_pagamento,
    forma_outro: o.forma_outro,
    condicoes: o.condicoes,
    observacoes: o.observacoes,
  };
}

/** Situação exibida: "Vencido" é calculado, nunca escolhido. */
export function situacao(status: Status, validade: string, hoje: string) {
  return (status === "rascunho" || status === "enviado") && validade < hoje ? "vencido" : status;
}

export function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Mesma comparação que "ambiente vazio vai para Outros" do PDF. */
export function nomeAmbiente(a: string): string {
  return a.trim() || "Outros";
}
