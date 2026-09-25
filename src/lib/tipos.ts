export const UNIDADES = ["un", "m²", "cx", "m", "pç"] as const;
export type Unidade = (typeof UNIDADES)[number];

export type Produto = {
  id: string;
  marca: string;
  nome: string;
  referencia: string;
  acabamento: string;
  unidade: Unidade;
  preco_base: string;
  foto_url: string | null;
  ativo: boolean;
};

export type Cliente = {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
};

export const COLUNAS_PRODUTO = "id, marca, nome, referencia, acabamento, unidade, preco_base, foto_url, ativo";
export const COLUNAS_CLIENTE = "id, nome, cpf_cnpj, telefone, email, endereco";

export type Situacao = "rascunho" | "enviado" | "aprovado" | "perdido" | "vencido";

export const SITUACOES: Record<Situacao, { rotulo: string; classe: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "bg-linha/60 text-tinta-suave" },
  enviado: { rotulo: "Enviado", classe: "bg-atencao/10 text-atencao" },
  aprovado: { rotulo: "Aprovado", classe: "bg-sucesso/10 text-sucesso" },
  perdido: { rotulo: "Perdido", classe: "bg-tinta/5 text-tinta-suave line-through decoration-1" },
  vencido: { rotulo: "Vencido", classe: "bg-perigo/10 text-perigo" },
};

export function rotuloPreco(modo: "A" | "B"): string {
  return modo === "B" ? "Preço à vista" : "Preço à prazo";
}
