import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DadosPdf, ItemPdf } from "./dados";
import { data as fData } from "@/lib/formato";

const F = path.join(process.cwd(), "src/pdf/fontes");
Font.register({
  family: "Cormorant",
  fonts: [
    { src: path.join(F, "Cormorant-Regular.ttf") },
    { src: path.join(F, "Cormorant-Italic.ttf"), fontStyle: "italic" },
    { src: path.join(F, "Cormorant-Medium.ttf"), fontWeight: 500 },
    { src: path.join(F, "Cormorant-MediumItalic.ttf"), fontWeight: 500, fontStyle: "italic" },
  ],
});
Font.register({
  family: "Jost",
  fonts: [
    { src: path.join(F, "Jost-Light.ttf"), fontWeight: 300 },
    { src: path.join(F, "Jost-Regular.ttf"), fontWeight: 400 },
    { src: path.join(F, "Jost-Medium.ttf"), fontWeight: 500 },
  ],
});
// Sem hifenização automática (nomes de produto não podem ser quebrados no meio).
Font.registerHyphenationCallback((palavra) => [palavra]);

const COR = {
  tinta: "#282624",
  suave: "#6F6A63",
  linha: "#E6E0D7",
  bronze: "#9A7B55",
  bronzeClaro: "#D8C7AC",
  escuro: "#1F1D1B",
  creme: "#F7F4EF",
};

const L = { foto: 56, qtd: 50, unit: 68, total: 70, pct: 34 };

const s = StyleSheet.create({
  pagina: { paddingTop: 36, paddingBottom: 72, paddingHorizontal: 40, fontFamily: "Jost", fontWeight: 300, fontSize: 8.5, color: COR.tinta },
  rotulo: { fontFamily: "Jost", fontWeight: 400, fontSize: 6.5, letterSpacing: 1.6, textTransform: "uppercase", color: COR.bronze, marginBottom: 4 },
  suave: { color: COR.suave },
  // cabeçalho
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 16, borderBottomWidth: 0.75, borderBottomColor: COR.bronze },
  logo: { width: 150, height: 48, objectFit: "contain", objectPosition: "left" },
  titulo: { fontFamily: "Cormorant", fontStyle: "italic", fontSize: 30, color: COR.bronze, textAlign: "right", lineHeight: 1 },
  numero: { fontWeight: 400, fontSize: 9, letterSpacing: 2, textAlign: "right", marginTop: 4 },
  datas: { fontSize: 7.5, color: COR.suave, textAlign: "right", marginTop: 3 },
  // bloco de dados
  dados: { flexDirection: "row", marginTop: 18, marginBottom: 22 },
  coluna: { flex: 1, paddingRight: 14 },
  colunaBorda: { flex: 1, paddingLeft: 14, paddingRight: 8, borderLeftWidth: 0.5, borderLeftColor: COR.linha },
  nomeDestaque: { fontFamily: "Cormorant", fontWeight: 500, fontSize: 15, lineHeight: 1.15, marginBottom: 3 },
  linhaDado: { fontSize: 8, color: COR.suave, lineHeight: 1.45 },
  secaoTitulo: { fontFamily: "Cormorant", fontSize: 18, marginBottom: 8 },
  italico: { fontStyle: "italic", color: COR.bronze },
  // tabela
  cabTabela: { flexDirection: "row", alignItems: "flex-end", paddingBottom: 5, borderBottomWidth: 0.5, borderBottomColor: COR.tinta },
  cabTexto: { fontWeight: 400, fontSize: 6.3, letterSpacing: 1, lineHeight: 1.35, textTransform: "uppercase", color: COR.suave },
  grupo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: COR.creme, paddingVertical: 6, paddingHorizontal: 8, marginTop: 12 },
  grupoNome: { fontWeight: 500, fontSize: 8, letterSpacing: 2.2, textTransform: "uppercase" },
  grupoTotais: { fontSize: 7.3, color: COR.suave },
  linhaItem: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: COR.linha },
  caixaFoto: { width: L.foto, height: L.foto, borderWidth: 0.5, borderColor: COR.linha, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  foto: { width: L.foto - 4, height: L.foto - 4, objectFit: "contain" },
  semFoto: { width: L.foto - 18, height: 14, objectFit: "contain" },
  descricao: { flex: 1, paddingLeft: 10, paddingRight: 8 },
  marca: { fontWeight: 400, fontSize: 6.3, letterSpacing: 1.3, textTransform: "uppercase", color: COR.bronze, marginBottom: 2 },
  nomeItem: { fontWeight: 400, fontSize: 9, lineHeight: 1.25 },
  detalhe: { fontSize: 7.3, color: COR.suave, marginTop: 2 },
  num: { textAlign: "right", fontSize: 8.3 },
  // totais
  totais: { marginTop: 18, flexDirection: "row", justifyContent: "flex-end" },
  caixaTotais: { width: 250 },
  linhaTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3.2 },
  faixa: { backgroundColor: COR.escuro, paddingVertical: 11, paddingHorizontal: 12, marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  faixaRotulo: { fontWeight: 400, fontSize: 7, letterSpacing: 2, textTransform: "uppercase", color: COR.bronzeClaro },
  faixaValor: { fontFamily: "Cormorant", fontWeight: 500, fontSize: 21, color: "#FFFFFF" },
  economia: { textAlign: "right", fontSize: 8, color: COR.bronze, marginTop: 6 },
  // condições
  condicoes: { marginTop: 26, paddingTop: 14, borderTopWidth: 0.5, borderTopColor: COR.linha },
  paragrafo: { fontSize: 8.3, lineHeight: 1.5, color: COR.tinta },
  validade: { fontFamily: "Cormorant", fontStyle: "italic", fontSize: 13, color: COR.tinta, marginTop: 14 },
  aceite: { flexDirection: "row", alignItems: "flex-end", marginTop: 34 },
  linhaAssinatura: { borderBottomWidth: 0.5, borderBottomColor: COR.tinta, height: 14 },
  // rodapé
  rodape: { position: "absolute", left: 40, right: 40, bottom: 26, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: COR.linha, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  rodapeTexto: { fontSize: 6.8, color: COR.suave, lineHeight: 1.5 },
  miniTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, marginBottom: 6, borderBottomWidth: 0.5, borderBottomColor: COR.linha },
});

function Colunas({ pct }: { pct: boolean }) {
  return (
    <View style={s.cabTabela}>
      <Text style={[s.cabTexto, { width: L.foto + 10 }]}>Produto</Text>
      <Text style={[s.cabTexto, { flex: 1 }]}> </Text>
      <Text style={[s.cabTexto, s.num, { width: L.qtd }]}>Qtd</Text>
      {pct && <Text style={[s.cabTexto, s.num, { width: L.pct }]}>%</Text>}
      <Text style={[s.cabTexto, s.num, { width: L.unit }]}>{"Unitário\nà prazo"}</Text>
      <Text style={[s.cabTexto, s.num, { width: L.total }]}>{"Total\nà prazo"}</Text>
      <Text style={[s.cabTexto, s.num, { width: L.total }]}>{"Total\nà vista"}</Text>
    </View>
  );
}

function Item({ i, pct, marcaDagua }: { i: ItemPdf; pct: boolean; marcaDagua: string }) {
  return (
    // Uma linha de item nunca é cortada entre duas páginas.
    <View style={s.linhaItem} wrap={false}>
      <View style={s.caixaFoto}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {i.foto ? <Image src={i.foto} style={s.foto} /> : <Image src={marcaDagua} style={s.semFoto} />}
      </View>
      <View style={s.descricao}>
        {i.marca ? <Text style={s.marca}>{i.marca}</Text> : null}
        <Text style={s.nomeItem}>{i.nome}</Text>
        {i.detalhe ? <Text style={s.detalhe}>{i.detalhe}</Text> : null}
      </View>
      <Text style={[s.num, { width: L.qtd }]}>{i.qtd}</Text>
      {pct && <Text style={[s.num, s.suave, { width: L.pct }]}>{i.pct}</Text>}
      <Text style={[s.num, { width: L.unit }]}>{i.unit_prazo}</Text>
      <Text style={[s.num, { width: L.total }]}>{i.total_prazo}</Text>
      <Text style={[s.num, { width: L.total, fontWeight: 500 }]}>{i.total_vista}</Text>
    </View>
  );
}

function LinhaTotal({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <View style={s.linhaTotal}>
      <Text style={forte ? { fontWeight: 500, fontSize: 9.5 } : s.suave}>{rotulo}</Text>
      <Text style={forte ? { fontWeight: 500, fontSize: 9.5 } : {}}>{valor}</Text>
    </View>
  );
}

export function DocumentoOrcamento({ d }: { d: DadosPdf }) {
  const e = d.empresa;
  const contato = [
    e.telefone && `Tel. ${e.telefone}`,
    e.whatsapp && `WhatsApp ${e.whatsapp}`,
    e.instagram,
    e.site,
  ].filter(Boolean).join("   ·   ");
  const cli = d.cliente;

  return (
    <Document title={`Orçamento ${d.numero}${cli ? ` — ${cli.nome}` : ""}`} author={e.razao_social} creator="Arte Decor Revest" producer="Arte Decor Revest" language="pt-BR">
      <Page size="A4" style={s.pagina}>
        {/* Da 2ª página em diante: mini cabeçalho + colunas da tabela */}
        <View
          fixed
          render={({ pageNumber }) =>
            pageNumber > 1 ? (
              <View>
                <View style={s.miniTopo}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={d.logo} style={{ width: 90, height: 28, objectFit: "contain", objectPosition: "left" }} />
                  <Text style={{ fontSize: 7.5, color: COR.suave }}>
                    Orçamento Nº {d.numero}
                    {cli ? `  ·  ${cli.nome}` : ""}
                  </Text>
                </View>
                <Colunas pct={d.mostrarPct} />
              </View>
            ) : null
          }
        />

        {/* Cabeçalho da primeira página */}
        <View style={s.topo}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={d.logo} style={s.logo} />
          <View>
            <Text style={s.titulo}>Orçamento</Text>
            <Text style={s.numero}>Nº {d.numero}</Text>
            <Text style={s.datas}>
              Emissão {fData(d.data)}   ·   Válido até {fData(d.validade)}
            </Text>
          </View>
        </View>

        <View style={s.dados}>
          <View style={s.coluna}>
            <Text style={s.rotulo}>Cliente</Text>
            {cli ? (
              <>
                <Text style={s.nomeDestaque}>{cli.nome}</Text>
                {cli.cpf_cnpj ? <Text style={s.linhaDado}>CPF/CNPJ {cli.cpf_cnpj}</Text> : null}
                {cli.telefone ? <Text style={s.linhaDado}>{cli.telefone}</Text> : null}
                {cli.email ? <Text style={s.linhaDado}>{cli.email}</Text> : null}
                {cli.endereco ? <Text style={s.linhaDado}>Obra: {cli.endereco}</Text> : null}
              </>
            ) : (
              <Text style={s.linhaDado}>—</Text>
            )}
          </View>
          {d.consultor && (
            <View style={s.colunaBorda}>
              <Text style={s.rotulo}>Consultor</Text>
              <Text style={s.nomeDestaque}>{d.consultor.nome}</Text>
              {d.consultor.whatsapp ? <Text style={s.linhaDado}>WhatsApp {d.consultor.whatsapp}</Text> : null}
            </View>
          )}
          {d.arquiteto ? (
            <View style={s.colunaBorda}>
              <Text style={s.rotulo}>Arquiteto(a)</Text>
              <Text style={s.nomeDestaque}>{d.arquiteto}</Text>
            </View>
          ) : null}
        </View>

        <Text style={s.secaoTitulo}>
          Seleção <Text style={s.italico}>de produtos</Text>
        </Text>
        <Colunas pct={d.mostrarPct} />

        {d.grupos.map((g) => (
          <View key={g.ambiente}>
            {/* O título do ambiente nunca fica sozinho no pé da página. */}
            <View style={s.grupo} wrap={false} minPresenceAhead={70}>
              <Text style={s.grupoNome}>{g.ambiente}</Text>
              <Text style={s.grupoTotais}>
                À prazo {g.subtotal_prazo}   ·   À vista {g.subtotal_vista}
              </Text>
            </View>
            {g.itens.map((i, k) => (
              <Item key={k} i={i} pct={d.mostrarPct} marcaDagua={d.marcaDagua} />
            ))}
          </View>
        ))}
        {d.grupos.length === 0 && <Text style={[s.linhaDado, { marginTop: 12 }]}>Nenhum item.</Text>}

        <View style={s.totais} wrap={false}>
          <View style={s.caixaTotais}>
            <LinhaTotal rotulo="Subtotal à prazo" valor={d.totais.subtotal_prazo} />
            <LinhaTotal rotulo="Subtotal à vista" valor={d.totais.subtotal_vista} />
            {d.totais.desconto && (
              <LinhaTotal rotulo={`Desconto${d.totais.motivo_desconto ? ` (${d.totais.motivo_desconto})` : ""}`} valor={`− ${d.totais.desconto}`} />
            )}
            {d.totais.acrescimo && (
              <LinhaTotal rotulo={`Acréscimo${d.totais.motivo_acrescimo ? ` (${d.totais.motivo_acrescimo})` : ""}`} valor={`+ ${d.totais.acrescimo}`} />
            )}
            <View style={{ borderTopWidth: 0.5, borderTopColor: COR.linha, marginTop: 4, paddingTop: 3 }}>
              <LinhaTotal rotulo="Total à prazo" valor={d.totais.total_prazo} forte />
            </View>
            <View style={s.faixa}>
              <Text style={s.faixaRotulo}>Total à vista</Text>
              <Text style={s.faixaValor}>{d.totais.total_vista}</Text>
            </View>
            {d.totais.economia && <Text style={s.economia}>Economia pagando à vista: {d.totais.economia}</Text>}
          </View>
        </View>

        <View style={s.condicoes} wrap={false}>
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={s.rotulo}>Formas de pagamento</Text>
              <Text style={s.paragrafo}>{d.formas.length ? d.formas.join("  ·  ") : "A combinar"}</Text>
            </View>
            <View style={{ flex: 1.4 }}>
              <Text style={s.rotulo}>Condições de pagamento</Text>
              <Text style={s.paragrafo}>{d.condicoes || "—"}</Text>
            </View>
          </View>
          {d.observacoes ? (
            <View style={{ marginTop: 12 }}>
              <Text style={s.rotulo}>Observações</Text>
              <Text style={s.paragrafo}>{d.observacoes}</Text>
            </View>
          ) : null}
          <Text style={s.validade}>Orçamento válido até {fData(d.validade)}.</Text>
        </View>

        <View style={s.aceite} wrap={false}>
          <Text style={{ fontSize: 8.5 }}>De acordo: </Text>
          <View style={[s.linhaAssinatura, { flex: 1, marginRight: 24 }]} />
          <Text style={{ fontSize: 8.5 }}>Data: ___/___/_____</Text>
        </View>

        {/* Rodapé de todas as páginas */}
        <View style={s.rodape} fixed>
          <View style={{ flex: 1, paddingRight: 90 }}>
            <Text style={s.rodapeTexto}>
              {[e.razao_social, e.cnpj && `CNPJ ${e.cnpj}`, e.endereco].filter(Boolean).join("   ·   ")}
            </Text>
            <Text style={s.rodapeTexto}>{contato}</Text>
          </View>
        </View>
        {/* Atenção: sem lineHeight aqui — com ele o react-pdf não desenha texto calculado por página. */}
        <Text
          fixed
          style={{ position: "absolute", right: 40, bottom: 29, fontSize: 6.8, color: COR.tinta }}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
