/**
 * Testes do banco (supabase/schema.sql) contra um Postgres real.
 * Rodar com: TEST_DATABASE_URL=postgres://... npm run test:db
 * Cada teste roda dentro de uma transação desfeita no final (ROLLBACK),
 * exceto o de numeração simultânea, que limpa o que criou.
 */
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

// Planilha do cliente Ali (seção 10): [preço à prazo, qtd]
const ALI: Array<[string, string]> = [
  ["494.80", "1"], ["3324.00", "1"], ["600.00", "1"], ["764.40", "1"], ["249.52", "1"],
  ["956.34", "1"], ["780.84", "1"], ["1221.60", "4"], ["2722.80", "4"], ["3686.00", "1"],
];

d("banco de dados", () => {
  let db: Client;

  beforeAll(async () => {
    db = new Client({ connectionString: url });
    await db.connect();
    // Garante que já existe um admin, para os logins de teste virarem vendedores.
    const { rows } = await db.query("select count(*)::int as n from usuarios");
    if (rows[0].n === 0) {
      await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'admin-fixo@teste.com', '{\"nome\":\"Admin fixo\"}')", [randomUUID()]);
    }
  });
  afterAll(async () => db?.end());
  beforeEach(async () => db.query("begin"));
  afterEach(async () => db.query("rollback"));

  async function criarLogin(c: Client, nome: string, perfil?: "admin" | "vendedor") {
    const id = randomUUID();
    await c.query(
      `insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
       values ($1, $2, $3, $4)`,
      [id, `${nome.toLowerCase()}-${id.slice(0, 6)}@teste.com`, { nome }, perfil ? { perfil } : {}],
    );
    return id;
  }

  /** Apaga os dados dentro da transação do teste (o ROLLBACK desfaz no final). */
  async function limparTudo() {
    await db.query("delete from orcamento_itens; delete from orcamentos; delete from clientes; delete from produtos; delete from usuarios;");
  }

  /** Passa a agir como o usuário (igual ao Supabase faz com o token do login). */
  async function como(userId: string) {
    await db.query("reset role");
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: "authenticated" })]);
  }
  async function comoSistema() {
    await db.query("reset role");
  }

  async function orcamentoComItens(itens: Array<[string, string]>, pct = "20") {
    const { rows } = await db.query("insert into orcamentos default values returning id, numero, modo_calculo");
    const orc = rows[0];
    for (const [i, [preco, qtd]] of itens.entries()) {
      await db.query(
        "insert into orcamento_itens (orcamento_id, ordem, nome, preco_base, qtd, pct) values ($1,$2,$3,$4,$5,$6)",
        [orc.id, i, `Item ${i + 1}`, preco, qtd, pct],
      );
    }
    return orc;
  }

  async function totais(id: string) {
    const { rows } = await db.query(
      "select subtotal_prazo, subtotal_vista, total_prazo, total_vista from orcamentos where id = $1", [id]);
    return rows[0];
  }

  it("primeiro login vira admin e os demais vendedor", async () => {
    await limparTudo(); // banco "vazio" só dentro desta transação
    const a = await criarLogin(db, "Dona");
    const v = await criarLogin(db, "Fabiano");
    const { rows } = await db.query("select id, perfil from usuarios where id in ($1,$2)", [a, v]);
    expect(Object.fromEntries(rows.map((r) => [r.id, r.perfil]))).toEqual({ [a]: "admin", [v]: "vendedor" });
  });

  it("orçamento do Ali — Modo A, 20%: bate com a planilha", async () => {
    const fab = await criarLogin(db, "Fabiano", "vendedor");
    await como(fab);
    const orc = await orcamentoComItens(ALI);
    expect(orc.modo_calculo).toBe("A");
    const t = await totais(orc.id);
    expect(t.total_prazo).toBe("26633.50");
    expect(t.total_vista).toBe("21306.80");

    const { rows } = await db.query(
      "select unit_vista, total_vista from orcamento_itens where orcamento_id = $1 and ordem in (7, 8) order by ordem", [orc.id]);
    expect(rows).toEqual([
      { unit_vista: "977.28", total_vista: "3909.12" },
      { unit_vista: "2178.24", total_vista: "8712.96" },
    ]);
  });

  it("Modo B (regra escrita: preço digitado é à vista, à prazo = vista × 1,20)", async () => {
    await db.query("update empresa set modo_calculo = 'B'");
    const fab = await criarLogin(db, "Fabiano", "vendedor");
    await como(fab);
    const orc = await orcamentoComItens(ALI);
    const t = await totais(orc.id);
    expect(t.total_vista).toBe("26633.50");
    expect(t.total_prazo).toBe("31960.20");
  });

  it("trocar o modo depois não altera orçamento já criado", async () => {
    const fab = await criarLogin(db, "Fabiano", "vendedor");
    await como(fab);
    const orc = await orcamentoComItens(ALI);
    await comoSistema();
    await db.query("update empresa set modo_calculo = 'B'");
    await db.query("update orcamento_itens set ambiente = 'Cozinha' where orcamento_id = $1", [orc.id]);
    expect((await totais(orc.id)).total_vista).toBe("21306.80");
  });

  it("quantidade decimal (12,5 m²) e arredondamento meio-para-cima", async () => {
    const fab = await criarLogin(db, "Fabiano", "vendedor");
    await como(fab);
    // 89,90 × 0,8 = 71,92 ; 12,5 × 71,92 = 899,00 ; 12,5 × 89,90 = 1123,75
    const orc = await orcamentoComItens([["89.90", "12.5"]]);
    expect(await totais(orc.id)).toMatchObject({ total_prazo: "1123.75", total_vista: "899.00" });
    // 0,125 → 0,13 (half-up): 0,25 × (1 − 0,5) = 0,125
    const orc2 = await orcamentoComItens([["0.25", "1"]], "50");
    expect((await totais(orc2.id)).total_vista).toBe("0.13");
  });

  it("desconto e acréscimo entram nos dois totais; desconto maior que o subtotal é bloqueado", async () => {
    const fab = await criarLogin(db, "Fabiano", "vendedor");
    await como(fab);
    const orc = await orcamentoComItens([["100.00", "1"]]);
    await db.query("update orcamentos set desconto = 10, acrescimo = 5 where id = $1", [orc.id]);
    expect(await totais(orc.id)).toMatchObject({ total_prazo: "95.00", total_vista: "75.00" });
    await db.query("savepoint s");
    await expect(db.query("update orcamentos set desconto = 90, acrescimo = 0 where id = $1", [orc.id]))
      .rejects.toThrow(/maior que o subtotal/);
    await db.query("rollback to savepoint s");
  });

  it("totais gravados à mão pela API são ignorados", async () => {
    const fab = await criarLogin(db, "Fabiano", "vendedor");
    await como(fab);
    const orc = await orcamentoComItens([["100.00", "1"]]);
    await db.query("update orcamentos set subtotal_vista = 1, total_vista = 1 where id = $1", [orc.id]);
    await db.query("update orcamento_itens set unit_vista = 1, total_vista = 1 where orcamento_id = $1", [orc.id]);
    expect((await totais(orc.id)).total_vista).toBe("80.00");
  });

  it("vendedor não vê nem edita orçamento/cliente de outro vendedor; admin vê tudo", async () => {
    const admin = await criarLogin(db, "Admin", "admin");
    const fab = await criarLogin(db, "Fabiano", "vendedor");
    const ana = await criarLogin(db, "Ana", "vendedor");

    await como(fab);
    const orcFab = await orcamentoComItens([["10.00", "1"]]);
    const { rows: [cli] } = await db.query("insert into clientes (nome) values ('Ali') returning id");

    await como(ana);
    expect((await db.query("select * from orcamentos where id = $1", [orcFab.id])).rowCount).toBe(0);
    expect((await db.query("select * from orcamento_itens where orcamento_id = $1", [orcFab.id])).rowCount).toBe(0);
    expect((await db.query("select * from clientes where id = $1", [cli.id])).rowCount).toBe(0);
    expect((await db.query("update orcamentos set arquiteto = 'x' where id = $1", [orcFab.id])).rowCount).toBe(0);
    expect((await db.query("update clientes set nome = 'x' where id = $1", [cli.id])).rowCount).toBe(0);
    await db.query("savepoint s");
    await expect(db.query(
      "insert into orcamento_itens (orcamento_id, nome, preco_base) values ($1, 'intruso', 1)", [orcFab.id],
    )).rejects.toThrow(/row-level security/);
    await db.query("rollback to savepoint s");
    // Ana não consegue criar orçamento em nome do Fabiano
    await db.query("savepoint s2");
    await expect(db.query("insert into orcamentos (vendedor_id) values ($1)", [fab])).rejects.toThrow(/row-level security/);
    await db.query("rollback to savepoint s2");

    await como(admin);
    expect((await db.query("select * from orcamentos where id = $1", [orcFab.id])).rowCount).toBe(1);
    expect((await db.query("update orcamentos set arquiteto = 'Mayara' where id = $1", [orcFab.id])).rowCount).toBe(1);
  });

  it("vendedor não pode virar admin nem alterar configurações", async () => {
    const fab = await criarLogin(db, "Fabiano", "vendedor");
    await como(fab);
    expect((await db.query("update usuarios set perfil = 'admin' where id = $1", [fab])).rowCount).toBe(0);
    expect((await db.query("update empresa set cnpj = '1'")).rowCount).toBe(0);
    expect((await db.query("select count(*)::int as n from usuarios")).rows[0].n).toBe(1); // só o próprio
  });

  it("vendedor desativado perde o acesso", async () => {
    const fab = await criarLogin(db, "Fabiano", "vendedor");
    await como(fab);
    const orc = await orcamentoComItens([["10.00", "1"]]);
    await comoSistema();
    await db.query("update usuarios set ativo = false where id = $1", [fab]);
    await como(fab);
    expect((await db.query("select * from orcamentos where id = $1", [orc.id])).rowCount).toBe(0);
    expect((await db.query("select * from produtos")).rowCount).toBe(0);
    expect((await db.query("select * from empresa")).rowCount).toBe(0);
  });

  it("validade passada aparece como vencido; aprovado nunca vence", async () => {
    const fab = await criarLogin(db, "Fabiano", "vendedor");
    await como(fab);
    const a = await orcamentoComItens([["10.00", "1"]]);
    const b = await orcamentoComItens([["10.00", "1"]]);
    await db.query("update orcamentos set validade = hoje() - 1 where id in ($1, $2)", [a.id, b.id]);
    await db.query("update orcamentos set status = 'aprovado' where id = $1", [b.id]);
    const { rows } = await db.query("select id, situacao from orcamentos_lista where id in ($1,$2)", [a.id, b.id]);
    expect(Object.fromEntries(rows.map((r) => [r.id, r.situacao]))).toEqual({ [a.id]: "vencido", [b.id]: "aprovado" });
  });

  it("validade padrão = hoje + dias das Configurações; número não pode ser alterado", async () => {
    const fab = await criarLogin(db, "Fabiano", "vendedor");
    await como(fab);
    const orc = await orcamentoComItens([]);
    const { rows: [r] } = await db.query("select validade - data as dias, numero from orcamentos where id = $1", [orc.id]);
    expect(r.dias).toBe(6);
    await db.query("update orcamentos set sequencial = 9999, ano = 1999 where id = $1", [orc.id]);
    const { rows: [depois] } = await db.query("select numero from orcamentos where id = $1", [orc.id]);
    expect(depois.numero).toBe(r.numero);
  });

  it("painel: aprovado, em aberto e vencido separados por mês e por vendedor", async () => {
    await limparTudo();
    const admin = await criarLogin(db, "Admin", "admin");
    const fab = await criarLogin(db, "Fabiano", "vendedor");
    await como(fab);
    const a = await orcamentoComItens([["100.00", "1"]]); // vista 80
    const b = await orcamentoComItens([["50.00", "1"]]);  // vista 40
    const c = await orcamentoComItens([["25.00", "1"]]);  // vista 20
    await db.query("update orcamentos set status = 'aprovado' where id = $1", [a.id]);
    await db.query("update orcamentos set validade = hoje() - 1 where id = $1", [c.id]);
    void b;

    await como(admin);
    const { rows } = await db.query("select * from painel_mensal(6)");
    expect(rows).toHaveLength(6);
    const atual = rows[5];
    expect(atual).toMatchObject({ aprovado: "80.00", em_aberto: "40.00", vencido: "20.00", qtd_aprovado: "1" });

    const { rows: vend } = await db.query(
      "select * from painel_vendedores(hoje() - 30, hoje()) where vendedor_id = $1", [fab]);
    expect(vend[0]).toMatchObject({ nome: "Fabiano", qtd_total: "3", aprovado: "80.00" });
  });
});

d("salvar orçamento (RPC usada pelo salvamento automático)", () => {
  let db: Client;
  beforeAll(async () => {
    db = new Client({ connectionString: url });
    await db.connect();
  });
  afterAll(async () => db?.end());
  beforeEach(async () => db.query("begin"));
  afterEach(async () => db.query("rollback"));

  async function login(nome: string, perfil = "vendedor") {
    const id = randomUUID();
    await db.query("reset role");
    await db.query("insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values ($1,$2,$3,$4)",
      [id, `${nome}-${id.slice(0, 6)}@t.com`, { nome, whatsapp: "45999990000" }, { perfil }]);
    return id;
  }
  async function como(id: string) {
    await db.query("reset role");
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: id })]);
  }
  const item = (preco: string, qtd = "1", extra: Record<string, unknown> = {}) =>
    ({ id: randomUUID(), nome: "Produto", marca: "Docol", preco_base: preco, qtd, pct: "20", unidade: "un", ambiente: "Cozinha", ...extra });
  async function salvar(p: unknown) {
    const { rows } = await db.query("select salvar_orcamento($1) as r", [p]);
    return rows[0].r;
  }

  it("cria orçamento, cliente e itens de uma vez; depois atualiza, reordena e remove", async () => {
    const fab = await login("Fabiano");
    await como(fab);
    const a = item("494.80"), b = item("1221.60", "4");
    const r1 = await salvar({ cliente: { nome: "Ali", telefone: "45 99999-1111" }, arquiteto: "Mayara", itens: [a, b] });
    expect(r1.numero).toMatch(/^\d{4}-\d{4}$/);
    expect(r1.total_prazo).toBe(5381.2);
    expect(r1.itens.map((i: { id: string }) => i.id)).toEqual([a.id, b.id]);

    const r2 = await salvar({ id: r1.id, cliente: { id: r1.cliente_id, nome: "Ali Hassan" }, itens: [b], desconto: "100", motivo_desconto: "Fidelidade" });
    expect(r2.numero).toBe(r1.numero);
    expect(r2.itens).toHaveLength(1);
    expect(r2.total_prazo).toBe(4786.4); // 4886,40 − 100
    const { rows: [c] } = await db.query("select nome from clientes where id = $1", [r1.cliente_id]);
    expect(c.nome).toBe("Ali Hassan");
    const { rows: [o] } = await db.query("select snapshot_cliente, snapshot_consultor from orcamentos where id = $1", [r1.id]);
    expect(o.snapshot_cliente.nome).toBe("Ali Hassan");
    expect(o.snapshot_consultor.nome).toBe("Fabiano");
  });

  it("remover item que deixaria o desconto maior que o subtotal é bloqueado", async () => {
    const fab = await login("Fabiano");
    await como(fab);
    const a = item("100.00"), b = item("100.00");
    const r = await salvar({ itens: [a, b], desconto: "150" });
    await db.query("savepoint s");
    await expect(salvar({ id: r.id, itens: [a], desconto: "150" })).rejects.toThrow(/maior que o subtotal/);
    await db.query("rollback to savepoint s");
    expect((await salvar({ id: r.id, itens: [a], desconto: "50" })).total_vista).toBe(30);
  });

  it("vendedor não consegue puxar cliente de outro vendedor pelo id", async () => {
    const ana = await login("Ana"), fab = await login("Fabiano");
    await como(ana);
    const { rows: [cli] } = await db.query("insert into clientes (nome, telefone) values ('Segredo', '1') returning id");
    await como(fab);
    const r = await salvar({ cliente: { id: cli.id, nome: "Outro" }, itens: [] });
    expect(r.cliente_id).not.toBe(cli.id); // virou um cliente novo do Fabiano
    await como(ana);
    const { rows: [c] } = await db.query("select nome from clientes where id = $1", [cli.id]);
    expect(c.nome).toBe("Segredo");
  });

  it("vendedor não salva orçamento de outro vendedor nem se passa por ele", async () => {
    const ana = await login("Ana"), fab = await login("Fabiano");
    await como(ana);
    const r = await salvar({ itens: [item("10.00")] });
    await como(fab);
    await db.query("savepoint s");
    await expect(salvar({ id: r.id, itens: [] })).rejects.toThrow(/não encontrado/);
    await db.query("rollback to savepoint s");
    await expect(salvar({ vendedor_id: ana, itens: [] })).rejects.toThrow(/row-level security/);
  });

  it("dados da empresa congelam ao marcar Enviado; duplicar gera novo número em Rascunho", async () => {
    const fab = await login("Fabiano");
    await como(fab);
    const r = await salvar({ itens: [item("100.00")], desconto: "10" });
    expect(await db.query("select marcar_enviado($1) as s", [r.id]).then((x) => x.rows[0].s)).toBe("enviado");

    await db.query("reset role");
    await db.query("update empresa set telefone = '(45) 0000-0000'");
    await como(fab);
    await salvar({ id: r.id, status: "enviado", itens: [item("100.00")], desconto: "10" });
    const { rows: [o] } = await db.query("select snapshot_empresa from orcamentos where id = $1", [r.id]);
    expect(o.snapshot_empresa.telefone).toBe("(45) 3198-1111");

    const { rows: [d] } = await db.query("select duplicar_orcamento($1) as id", [r.id]);
    const { rows: [n] } = await db.query("select numero, status, desconto, total_vista, snapshot_empresa from orcamentos where id = $1", [d.id]);
    expect(n.numero).not.toBe(r.numero);
    expect(n).toMatchObject({ status: "rascunho", desconto: "10.00", total_vista: "70.00" });
    expect(n.snapshot_empresa.telefone).toBe("(45) 0000-0000");
  });

  it("validade antes da data é recusada", async () => {
    const fab = await login("Fabiano");
    await como(fab);
    await expect(salvar({ validade: "2000-01-01", itens: [] })).rejects.toThrow(/validade não pode/);
  });

  it("busca sem acento em produtos e clientes", async () => {
    const fab = await login("Fabiano");
    await como(fab);
    await db.query("insert into produtos (marca, nome, referencia) values ('Portobello', 'Cerâmica Acetinada', 'PB-01')");
    const { rowCount } = await db.query("select 1 from produtos where busca like '%' || sem_acento('ceramica acetinada') || '%'");
    expect(rowCount).toBe(1);
    await db.query("insert into clientes (nome) values ('João Conceição')");
    expect((await db.query("select 1 from clientes where busca like '%conceicao%'")).rowCount).toBe(1);
  });

  it("upload: vendedor envia foto de produto mas não a logo; admin envia a logo", async () => {
    const adm = await login("Admin", "admin"), fab = await login("Fabiano");
    await db.query("reset role");
    await db.query("update usuarios set perfil = 'admin' where id = $1", [adm]);
    await como(fab);
    await db.query("insert into storage.objects (bucket_id, name) values ('arquivos', 'produtos/a.jpg')");
    await db.query("savepoint s");
    await expect(db.query("insert into storage.objects (bucket_id, name) values ('arquivos', 'empresa/logo.png')")).rejects.toThrow(/row-level security/);
    await db.query("rollback to savepoint s");
    await como(adm);
    await db.query("insert into storage.objects (bucket_id, name) values ('arquivos', 'empresa/logo.png')");
  });
});

d("numeração simultânea", () => {
  it("dois vendedores salvando ao mesmo tempo recebem números diferentes e seguidos", async () => {
    const [c1, c2, adm] = [new Client({ connectionString: url }), new Client({ connectionString: url }), new Client({ connectionString: url })];
    await Promise.all([c1.connect(), c2.connect(), adm.connect()]);
    const ids = [randomUUID(), randomUUID()];
    try {
      for (const [i, id] of ids.entries()) {
        await adm.query("insert into auth.users (id, email, raw_app_meta_data) values ($1, $2, '{\"perfil\":\"vendedor\"}')",
          [id, `concorrencia${i}-${id.slice(0, 6)}@teste.com`]);
      }
      const inserir = async (c: Client, id: string) => {
        await c.query("begin");
        await c.query("set local role authenticated");
        await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: id })]);
        return c.query("insert into orcamentos default values returning ano, sequencial");
      };
      const r1 = await inserir(c1, ids[0]);
      const p2 = inserir(c2, ids[1]); // fica esperando o c1 terminar
      await new Promise((r) => setTimeout(r, 200));
      await c1.query("commit");
      const r2 = await p2;
      await c2.query("commit");
      expect(r2.rows[0].sequencial).toBe(r1.rows[0].sequencial + 1);
    } finally {
      await adm.query("delete from orcamentos where vendedor_id = any($1)", [ids]);
      await adm.query("delete from usuarios where id = any($1)", [ids]);
      await adm.query("delete from auth.users where id = any($1)", [ids]);
      await Promise.all([c1.end(), c2.end(), adm.end()]);
    }
  });
});

d("RT de arquitetos", () => {
  let db: Client;
  beforeAll(async () => {
    db = new Client({ connectionString: url });
    await db.connect();
  });
  afterAll(async () => db?.end());
  beforeEach(async () => db.query("begin"));
  afterEach(async () => db.query("rollback"));

  async function login(nome: string, perfil = "vendedor") {
    const id = randomUUID();
    await db.query("reset role");
    await db.query("insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values ($1,$2,$3,$4)",
      [id, `${nome}-${id.slice(0, 6)}@t.com`, { nome }, { perfil }]);
    if (perfil === "admin") await db.query("update usuarios set perfil = 'admin' where id = $1", [id]);
    return id;
  }
  async function como(id: string) {
    await db.query("reset role");
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: id })]);
  }
  const salvar = async (p: unknown) => (await db.query("select salvar_orcamento($1) as r", [p])).rows[0].r;
  const item = (preco: string) => ({ id: randomUUID(), nome: "Item", preco_base: preco, qtd: "1", pct: "0", unidade: "un" });
  const lanc = async (orcId: string) => (await db.query("select * from rt_resumo where orcamento_id = $1", [orcId])).rows[0];

  it("indicação exige o nome do arquiteto(a)", async () => {
    const fab = await login("Fabiano");
    await como(fab);
    await expect(salvar({ indicacao_arquiteto: true, itens: [] })).rejects.toThrow(/nome do\(a\) arquiteto/);
  });

  it("mesmo arquiteto escrito diferente não duplica o cadastro", async () => {
    const fab = await login("Fabiano");
    await como(fab);
    const a = await salvar({ arquiteto: "Camila Lobato", itens: [] });
    const b = await salvar({ arquiteto: "  camila   lobato ", itens: [] });
    await db.query("reset role");
    const { rows } = await db.query("select arquiteto, arquiteto_id from orcamentos where id in ($1,$2)", [a.id, b.id]);
    expect(new Set(rows.map((r) => r.arquiteto_id)).size).toBe(1);
    expect(rows.map((r) => r.arquiteto)).toEqual(["Camila Lobato", "Camila Lobato"]);
  });

  it("aprovado com indicação gera a RT — valor da planilha calculado certo (11.812,00, não 11.800)", async () => {
    const adm = await login("Admin", "admin"), fab = await login("Fabiano");
    await como(fab);
    const o = await salvar({ arquiteto: "Anderson Szelemel", indicacao_arquiteto: true, cliente: { nome: "Andressa Fernanda" }, itens: [item("236240.00")] });
    await como(adm);
    expect(await lanc(o.id)).toBeUndefined(); // ainda não aprovado: sem RT
    await como(fab);
    await db.query("update orcamentos set status = 'aprovado' where id = $1", [o.id]);
    await como(adm);
    expect(await lanc(o.id)).toMatchObject({
      valor_compra: "236240.00", pct: "5.00", valor_rt: "11812.00", cliente_nome: "Andressa Fernanda",
      arquiteto_nome: "Anderson Szelemel", situacao_cliente: "aguardando", situacao_rt: "aguardando_cliente",
    });
  });

  it("38.550 × 5% = 1.927,50 (e % próprio do arquiteto vale no lugar do padrão)", async () => {
    const adm = await login("Admin", "admin"), fab = await login("Fabiano");
    await como(fab);
    const o = await salvar({ arquiteto: "Camila Lobato", indicacao_arquiteto: true, arquiteto_acompanhou: true, cliente: { nome: "Pasta Mia" }, itens: [item("38550.00")] });
    await db.query("update orcamentos set status = 'aprovado' where id = $1", [o.id]);
    await como(adm);
    expect(await lanc(o.id)).toMatchObject({ valor_rt: "1927.50", acompanhou: true });

    await db.query("update arquitetos set pct_rt = 10 where nome = 'Camila Lobato'");
    await como(fab);
    const o2 = await salvar({ arquiteto: "Camila Lobato", indicacao_arquiteto: true, itens: [item("1000.00")] });
    await db.query("update orcamentos set status = 'aprovado' where id = $1", [o2.id]);
    await como(adm);
    expect(await lanc(o2.id)).toMatchObject({ pct: "10.00", valor_rt: "100.00" });
  });

  it("cliente parcelado: RT liberada proporcional; pagar ao arquiteto; bloqueios de valor", async () => {
    const adm = await login("Admin", "admin"), fab = await login("Fabiano");
    await como(fab);
    const o = await salvar({ arquiteto: "Anderson", indicacao_arquiteto: true, cliente: { nome: "Andressa" }, itens: [item("236240.00")] });
    await db.query("update orcamentos set status = 'aprovado' where id = $1", [o.id]);
    await como(adm);
    const id = (await lanc(o.id)).id;
    await db.query("insert into rt_recebimentos (lancamento_id, valor, forma) values ($1, 50000, 'Pix')", [id]);
    expect(await lanc(o.id)).toMatchObject({ recebido: "50000.00", situacao_cliente: "parcial", rt_liberado: "2500.00", saldo_a_pagar: "2500.00", situacao_rt: "a_pagar", cliente_falta: "186240.00" });

    await db.query("insert into rt_pagamentos (lancamento_id, valor, forma) values ($1, 2500, 'Pix')", [id]);
    expect(await lanc(o.id)).toMatchObject({ pago: "2500.00", saldo_a_pagar: "0.00", situacao_rt: "aguardando_cliente" });

    await db.query("savepoint s");
    await expect(db.query("insert into rt_pagamentos (lancamento_id, valor) values ($1, 9312.01)", [id])).rejects.toThrow(/passaria do valor da RT/);
    await db.query("rollback to savepoint s");
    await expect(db.query("insert into rt_recebimentos (lancamento_id, valor) values ($1, 186240.01)", [id])).rejects.toThrow(/passaria do valor da compra/);
    await db.query("rollback to savepoint s");

    await db.query("insert into rt_recebimentos (lancamento_id, valor) values ($1, 186240)", [id]);
    expect(await lanc(o.id)).toMatchObject({ situacao_cliente: "quitado", rt_liberado: "11812.00", saldo_a_pagar: "9312.00" });
    await db.query("insert into rt_pagamentos (lancamento_id, valor) values ($1, 9312)", [id]);
    expect(await lanc(o.id)).toMatchObject({ situacao_rt: "pago", saldo_a_pagar: "0.00" });
  });

  it("regra 'só quando o cliente quitar' não libera nada com pagamento parcial", async () => {
    const adm = await login("Admin", "admin"), fab = await login("Fabiano");
    await como(fab);
    const o = await salvar({ arquiteto: "Anderson", indicacao_arquiteto: true, itens: [item("1000.00")] });
    await db.query("update orcamentos set status = 'aprovado' where id = $1", [o.id]);
    await como(adm);
    await db.query("update rt_config set liberacao = 'quitado'");
    const id = (await lanc(o.id)).id;
    await db.query("insert into rt_recebimentos (lancamento_id, valor) values ($1, 999.99)", [id]);
    expect(await lanc(o.id)).toMatchObject({ rt_liberado: "0.00", situacao_rt: "aguardando_cliente" });
    await db.query("insert into rt_recebimentos (lancamento_id, valor) values ($1, 0.01)", [id]);
    expect(await lanc(o.id)).toMatchObject({ rt_liberado: "50.00", situacao_rt: "a_pagar" });
  });

  it("acompanha o orçamento: valor muda enquanto não há movimento; sai de Aprovado → cancelado", async () => {
    const adm = await login("Admin", "admin"), fab = await login("Fabiano");
    await como(fab);
    const it1 = item("1000.00");
    const o = await salvar({ arquiteto: "Anderson", indicacao_arquiteto: true, itens: [it1] });
    await salvar({ id: o.id, status: "aprovado", arquiteto: "Anderson", indicacao_arquiteto: true, itens: [it1] });
    await salvar({ id: o.id, status: "aprovado", arquiteto: "Anderson", indicacao_arquiteto: true, itens: [{ ...it1, preco_base: "2000.00" }] });
    await como(adm);
    expect(await lanc(o.id)).toMatchObject({ valor_compra: "2000.00", valor_rt: "100.00", cancelado: false });

    await como(fab);
    await salvar({ id: o.id, status: "perdido", arquiteto: "Anderson", indicacao_arquiteto: true, itens: [it1] });
    await como(adm);
    expect(await lanc(o.id)).toMatchObject({ cancelado: true, situacao_rt: "cancelado" });

    await como(fab);
    await salvar({ id: o.id, status: "aprovado", arquiteto: "Anderson", indicacao_arquiteto: false, itens: [it1] });
    await como(adm);
    expect((await lanc(o.id)).cancelado).toBe(true); // tirou a indicação: continua cancelado

    await db.query("update rt_lancamentos set ajustado = true, valor_compra = 1500, cancelado = false where orcamento_id = $1", [o.id]);
    await como(fab);
    await salvar({ id: o.id, status: "aprovado", arquiteto: "Anderson", indicacao_arquiteto: true, itens: [{ ...it1, preco_base: "3000.00" }] });
    await como(adm);
    expect(await lanc(o.id)).toMatchObject({ valor_compra: "1500.00" }); // ajuste do admin prevalece
  });

  it("vendedor não enxerga nem mexe em RT, % ou dados de pagamento do arquiteto", async () => {
    const fab = await login("Fabiano");
    await como(fab);
    const o = await salvar({ arquiteto: "Mayara", indicacao_arquiteto: true, itens: [item("100.00")] });
    await db.query("update orcamentos set status = 'aprovado' where id = $1", [o.id]);
    for (const t of ["rt_lancamentos", "rt_resumo", "rt_config", "arquitetos", "rt_recebimentos", "rt_pagamentos"]) {
      expect((await db.query(`select * from ${t}`)).rowCount).toBe(0);
    }
    expect((await db.query("select * from arquitetos_usados()")).rows.map((r) => r.arquitetos_usados)).toContain("Mayara");
    await db.query("savepoint s");
    await expect(db.query("insert into arquitetos (nome) values ('X')")).rejects.toThrow(/row-level security/);
    await db.query("rollback to savepoint s");
    expect((await db.query("update rt_config set pct_padrao = 50")).rowCount).toBe(0);
  });
});
