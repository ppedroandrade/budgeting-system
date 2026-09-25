-- =====================================================================
-- Arte Decor Revest — Sistema de Orçamentos
-- Arquivo único de instalação do banco (Supabase → SQL Editor → Run).
--
-- Contém: tabelas, regras de segurança (RLS), numeração sequencial,
-- cálculo dos valores e as consultas do painel do admin.
-- Rodar UMA vez num projeto Supabase novo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funções utilitárias
-- ---------------------------------------------------------------------

-- "Hoje" no fuso da loja (Foz do Iguaçu), não em UTC.
create or replace function public.hoje()
returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Usuários (perfil de cada login do Supabase Auth)
-- ---------------------------------------------------------------------
create table public.usuarios (
  id          uuid primary key references auth.users (id) on delete restrict,
  nome        text not null,
  email       text not null unique,
  whatsapp    text,
  perfil      text not null default 'vendedor' check (perfil in ('admin', 'vendedor')),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- SECURITY DEFINER para poderem ser usadas dentro das políticas sem recursão.
create or replace function public.usuario_ativo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select ativo from usuarios where id = auth.uid()), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select ativo and perfil = 'admin' from usuarios where id = auth.uid()), false)
$$;

-- Cria o perfil automaticamente quando um login é criado.
-- O primeiro login do sistema vira admin; os demais, vendedor.
create or replace function public.criar_perfil_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_perfil text;
begin
  if not exists (select 1 from usuarios) then
    v_perfil := 'admin';
  else
    v_perfil := coalesce(new.raw_app_meta_data ->> 'perfil', 'vendedor');
  end if;

  insert into usuarios (id, nome, email, whatsapp, perfil)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'whatsapp', ''),
    v_perfil
  );
  return new;
end $$;

create trigger ao_criar_login
  after insert on auth.users
  for each row execute function public.criar_perfil_usuario();

-- ---------------------------------------------------------------------
-- Empresa / Configurações (uma única linha)
-- ---------------------------------------------------------------------
create table public.empresa (
  id                  int primary key default 1 check (id = 1),
  razao_social        text not null default 'Arte Decor Revest LTDA',
  cnpj                text not null default '',
  endereco            text not null default 'Av. José Maria de Brito, 1665, Monjolo, Foz do Iguaçu – PR',
  telefone            text not null default '(45) 3198-1111',
  whatsapp            text not null default '(45) 98827-4710',
  instagram           text not null default '@artedecorrevest',
  site                text not null default 'artedecorrevest.com.br',
  horario             text not null default 'Seg–Sex 8h às 18h · Sáb 8h às 12h',
  logo_url            text,
  modo_calculo        text not null default 'A' check (modo_calculo in ('A', 'B')),
  pct_padrao          numeric(5,2) not null default 20 check (pct_padrao between 0 and 100),
  validade_dias       int not null default 6 check (validade_dias between 1 and 365),
  condicoes_padrao    text not null default 'Cartão em até 10x sem juros.',
  observacoes_padrao  text not null default 'Prazo de entrega a combinar conforme disponibilidade do fornecedor.',
  pdf_mostrar_pct     boolean not null default false,
  atualizado_em       timestamptz not null default now()
);
insert into public.empresa (id) values (1);

create trigger empresa_atualizado_em before update on public.empresa
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (length(trim(nome)) > 0),
  cpf_cnpj    text,
  telefone    text,
  email       text,
  endereco    text,
  criado_por  uuid not null default auth.uid() references public.usuarios (id),
  criado_em   timestamptz not null default now()
);
create index clientes_nome_idx on public.clientes (lower(nome));

-- ---------------------------------------------------------------------
-- Produtos (catálogo — compartilhado entre todos)
-- ---------------------------------------------------------------------
create table public.produtos (
  id             uuid primary key default gen_random_uuid(),
  marca          text not null default '',
  nome           text not null check (length(trim(nome)) > 0),
  referencia     text not null default '',
  acabamento     text not null default '',
  unidade        text not null default 'un' check (unidade in ('un', 'm²', 'cx', 'm', 'pç')),
  preco_base     numeric(12,2) not null default 0 check (preco_base >= 0),
  foto_url       text,
  ativo          boolean not null default true,
  criado_por     uuid default auth.uid() references public.usuarios (id),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index produtos_busca_idx on public.produtos (lower(marca), lower(nome), lower(referencia));

create trigger produtos_atualizado_em before update on public.produtos
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Orçamentos
-- ---------------------------------------------------------------------
create table public.orcamento_contadores (
  ano     int primary key,
  ultimo  int not null
);

create table public.orcamentos (
  id                 uuid primary key default gen_random_uuid(),
  ano                int not null,
  sequencial         int not null,
  numero             text generated always as (ano::text || '-' || lpad(sequencial::text, 4, '0')) stored,
  cliente_id         uuid references public.clientes (id),
  vendedor_id        uuid not null default auth.uid() references public.usuarios (id),
  arquiteto          text not null default '',
  data               date not null default public.hoje(),
  validade           date not null,
  status             text not null default 'rascunho'
                       check (status in ('rascunho', 'enviado', 'aprovado', 'perdido')),
  modo_calculo       text not null check (modo_calculo in ('A', 'B')),
  desconto           numeric(12,2) not null default 0 check (desconto >= 0),
  motivo_desconto    text not null default '',
  acrescimo          numeric(12,2) not null default 0 check (acrescimo >= 0),
  motivo_acrescimo   text not null default '',
  formas_pagamento   text[] not null default '{}',
  forma_outro        text not null default '',
  condicoes          text not null default '',
  observacoes        text not null default '',
  -- Totais: calculados pelo banco, nunca digitados.
  subtotal_prazo     numeric(12,2) not null default 0,
  subtotal_vista     numeric(12,2) not null default 0,
  total_prazo        numeric(12,2) not null default 0,
  total_vista        numeric(12,2) not null default 0,
  -- Cópias congeladas para o PDF sair igual ao que foi enviado.
  snapshot_cliente   jsonb,
  snapshot_empresa   jsonb,
  snapshot_consultor jsonb,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  unique (ano, sequencial),
  check (formas_pagamento <@ array['boleto', 'pix', 'cartao', 'dinheiro', 'outro'])
);
create index orcamentos_vendedor_idx on public.orcamentos (vendedor_id);
create index orcamentos_cliente_idx on public.orcamentos (cliente_id);
create index orcamentos_data_idx on public.orcamentos (data);

create table public.orcamento_itens (
  id            uuid primary key default gen_random_uuid(),
  orcamento_id  uuid not null references public.orcamentos (id) on delete cascade,
  ordem         int not null default 0,
  produto_id    uuid references public.produtos (id),
  marca         text not null default '',
  nome          text not null default '',
  referencia    text not null default '',
  acabamento    text not null default '',
  unidade       text not null default 'un' check (unidade in ('un', 'm²', 'cx', 'm', 'pç')),
  foto_url      text,
  ambiente      text not null default '',
  qtd           numeric(12,3) not null default 1 check (qtd > 0),
  preco_base    numeric(12,2) not null default 0 check (preco_base >= 0),
  pct           numeric(5,2) not null default 0 check (pct between 0 and 100),
  unit_prazo    numeric(12,2) not null default 0,
  unit_vista    numeric(12,2) not null default 0,
  total_prazo   numeric(12,2) not null default 0,
  total_vista   numeric(12,2) not null default 0
);
create index orcamento_itens_orcamento_idx on public.orcamento_itens (orcamento_id, ordem);

-- Número sequencial por ano. O UPDATE trava a linha do ano, então dois
-- vendedores salvando ao mesmo tempo nunca recebem o mesmo número; e como
-- o contador só sobe, número apagado nunca é reaproveitado.
create or replace function public.numerar_orcamento()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_modo text;
  v_validade_dias int;
begin
  select modo_calculo, validade_dias into v_modo, v_validade_dias from empresa where id = 1;

  new.ano := extract(year from new.data)::int;
  insert into orcamento_contadores as c (ano, ultimo) values (new.ano, 1)
    on conflict (ano) do update set ultimo = c.ultimo + 1
    returning ultimo into new.sequencial;

  new.modo_calculo := coalesce(new.modo_calculo, v_modo);
  new.validade := coalesce(new.validade, new.data + v_validade_dias);
  return new;
end $$;

create trigger orcamento_numero before insert on public.orcamentos
  for each row execute function public.numerar_orcamento();

-- Número e ano não mudam depois de criados.
create or replace function public.proteger_orcamento()
returns trigger language plpgsql as $$
begin
  new.ano := old.ano;
  new.sequencial := old.sequencial;
  new.atualizado_em := now();
  return new;
end $$;

create trigger orcamento_protegido before update on public.orcamentos
  for each row execute function public.proteger_orcamento();

-- ---------------------------------------------------------------------
-- Cálculo (regras da seção 6). round() do Postgres em numeric arredonda
-- meio para cima (half-up) para valores positivos.
--   Modo A: preco_base = preço à prazo; à vista = prazo × (1 − %)
--   Modo B: preco_base = preço à vista; à prazo = vista × (1 + %)
-- A mesma regra existe em src/lib/calculo.ts (tela) e as duas são testadas.
-- ---------------------------------------------------------------------
create or replace function public.calcular_item()
returns trigger language plpgsql as $$
declare
  v_modo text;
begin
  select modo_calculo into v_modo from orcamentos where id = new.orcamento_id;

  if v_modo = 'B' then
    new.unit_vista := new.preco_base;
    new.unit_prazo := round(new.preco_base * (1 + new.pct / 100), 2);
  else
    new.unit_prazo := new.preco_base;
    new.unit_vista := round(new.preco_base * (1 - new.pct / 100), 2);
  end if;

  new.total_prazo := round(new.qtd * new.unit_prazo, 2);
  new.total_vista := round(new.qtd * new.unit_vista, 2);
  return new;
end $$;

create trigger item_calculo before insert or update on public.orcamento_itens
  for each row execute function public.calcular_item();

-- Qualquer mudança nos itens "toca" o orçamento, que então se recalcula.
create or replace function public.item_alterado()
returns trigger language plpgsql as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update orcamentos set atualizado_em = now() where id = old.orcamento_id;
  end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.orcamento_id <> old.orcamento_id) then
    update orcamentos set atualizado_em = now() where id = new.orcamento_id;
  end if;
  return null;
end $$;

create trigger item_totais after insert or update or delete on public.orcamento_itens
  for each row execute function public.item_alterado();

-- Subtotais e totais vêm SEMPRE da soma dos itens (valores enviados pela
-- tela são ignorados) + bloqueio de desconto maior que o subtotal.
create or replace function public.calcular_totais()
returns trigger language plpgsql as $$
begin
  select coalesce(sum(total_prazo), 0), coalesce(sum(total_vista), 0)
    into new.subtotal_prazo, new.subtotal_vista
    from orcamento_itens where orcamento_id = new.id;

  new.total_prazo := new.subtotal_prazo - new.desconto + new.acrescimo;
  new.total_vista := new.subtotal_vista - new.desconto + new.acrescimo;
  if new.total_vista < 0 or new.total_prazo < 0 then
    raise exception 'O desconto (R$ %) é maior que o subtotal do orçamento.', new.desconto
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger orcamento_totais before insert or update on public.orcamentos
  for each row execute function public.calcular_totais();

-- Situação exibida: "vencido" é calculado, nunca escolhido.
create or replace function public.situacao_orcamento(p_status text, p_validade date)
returns text language sql stable as $$
  select case
    when p_status in ('rascunho', 'enviado') and p_validade < public.hoje() then 'vencido'
    else p_status
  end
$$;

-- ---------------------------------------------------------------------
-- Segurança (RLS). Login desativado não enxerga nada.
-- ---------------------------------------------------------------------
alter table public.usuarios enable row level security;
alter table public.empresa enable row level security;
alter table public.clientes enable row level security;
alter table public.produtos enable row level security;
alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;
alter table public.orcamento_contadores enable row level security; -- sem políticas: só o banco mexe

-- Usuários: cada um vê o próprio perfil; admin vê e edita todos.
create policy usuarios_ler on public.usuarios for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy usuarios_admin_editar on public.usuarios for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Empresa: todos os ativos leem (sai no PDF); só admin altera.
create policy empresa_ler on public.empresa for select to authenticated
  using (public.usuario_ativo());
create policy empresa_admin_editar on public.empresa for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Produtos: catálogo compartilhado. Ativos leem, criam e editam; só admin desativa.
create policy produtos_ler on public.produtos for select to authenticated
  using (public.usuario_ativo());
create policy produtos_criar on public.produtos for insert to authenticated
  with check (public.usuario_ativo());
create policy produtos_editar on public.produtos for update to authenticated
  using (public.usuario_ativo())
  with check (public.usuario_ativo() and (ativo or public.is_admin()));

-- Orçamentos: vendedor só os próprios; admin todos.
create policy orcamentos_ler on public.orcamentos for select to authenticated
  using (public.is_admin() or (vendedor_id = auth.uid() and public.usuario_ativo()));
create policy orcamentos_criar on public.orcamentos for insert to authenticated
  with check (public.is_admin() or (vendedor_id = auth.uid() and public.usuario_ativo()));
create policy orcamentos_editar on public.orcamentos for update to authenticated
  using (public.is_admin() or (vendedor_id = auth.uid() and public.usuario_ativo()))
  with check (public.is_admin() or vendedor_id = auth.uid());
create policy orcamentos_admin_apagar on public.orcamentos for delete to authenticated
  using (public.is_admin());

-- Itens seguem o orçamento a que pertencem.
create policy itens_todos on public.orcamento_itens for all to authenticated
  using (exists (select 1 from public.orcamentos o where o.id = orcamento_id))
  with check (exists (select 1 from public.orcamentos o where o.id = orcamento_id));

-- Clientes: vendedor vê os que cadastrou e os dos seus orçamentos; admin todos.
create policy clientes_ler on public.clientes for select to authenticated
  using (
    public.is_admin()
    or (public.usuario_ativo() and (
      criado_por = auth.uid()
      or exists (select 1 from public.orcamentos o where o.cliente_id = clientes.id and o.vendedor_id = auth.uid())
    ))
  );
create policy clientes_criar on public.clientes for insert to authenticated
  with check (public.usuario_ativo() and (criado_por = auth.uid() or public.is_admin()));
create policy clientes_editar on public.clientes for update to authenticated
  using (public.is_admin() or (public.usuario_ativo() and criado_por = auth.uid()));

-- ---------------------------------------------------------------------
-- Lista de orçamentos com situação calculada (respeita o RLS de quem consulta)
-- ---------------------------------------------------------------------
create view public.orcamentos_lista with (security_invoker = true) as
select
  o.id, o.numero, o.ano, o.sequencial, o.data, o.validade, o.status,
  public.situacao_orcamento(o.status, o.validade) as situacao,
  o.total_prazo, o.total_vista,
  o.cliente_id, coalesce(c.nome, o.snapshot_cliente ->> 'nome', '') as cliente_nome,
  o.vendedor_id, u.nome as vendedor_nome,
  o.atualizado_em,
  coalesce(o.snapshot_cliente ->> 'telefone', c.telefone, '') as cliente_telefone,
  coalesce(o.snapshot_consultor ->> 'nome', u.nome) as consultor_nome
from public.orcamentos o
left join public.clientes c on c.id = o.cliente_id
left join public.usuarios u on u.id = o.vendedor_id;

-- ---------------------------------------------------------------------
-- Painel do admin
-- Valores em "total à vista". Situações:
--   aprovado  = entrou
--   em aberto = rascunho/enviado ainda dentro da validade
--   vencido   = rascunho/enviado com validade passada (ficou para trás)
--   perdido   = marcado como perdido
-- ---------------------------------------------------------------------
create or replace function public.painel_mensal(p_meses int default 6)
returns table (
  mes date, aprovado numeric, em_aberto numeric, vencido numeric, perdido numeric,
  qtd_total bigint, qtd_aprovado bigint
)
language sql stable security invoker set search_path = public as $$
  with meses as (
    select generate_series(
      date_trunc('month', hoje()) - make_interval(months => p_meses - 1),
      date_trunc('month', hoje()), interval '1 month')::date as mes
  )
  select
    m.mes,
    coalesce(sum(o.total_vista) filter (where o.situacao = 'aprovado'), 0),
    coalesce(sum(o.total_vista) filter (where o.situacao in ('rascunho', 'enviado')), 0),
    coalesce(sum(o.total_vista) filter (where o.situacao = 'vencido'), 0),
    coalesce(sum(o.total_vista) filter (where o.situacao = 'perdido'), 0),
    count(o.id),
    count(o.id) filter (where o.situacao = 'aprovado')
  from meses m
  left join orcamentos_lista o on date_trunc('month', o.data)::date = m.mes
  group by m.mes
  order by m.mes
$$;

create or replace function public.painel_vendedores(p_inicio date, p_fim date)
returns table (
  vendedor_id uuid, nome text, ativo boolean,
  qtd_total bigint, qtd_aprovado bigint,
  aprovado numeric, em_aberto numeric, vencido numeric
)
language sql stable security invoker set search_path = public as $$
  select
    u.id, u.nome, u.ativo,
    count(o.id),
    count(o.id) filter (where o.situacao = 'aprovado'),
    coalesce(sum(o.total_vista) filter (where o.situacao = 'aprovado'), 0),
    coalesce(sum(o.total_vista) filter (where o.situacao in ('rascunho', 'enviado')), 0),
    coalesce(sum(o.total_vista) filter (where o.situacao = 'vencido'), 0)
  from usuarios u
  left join orcamentos_lista o on o.vendedor_id = u.id and o.data between p_inicio and p_fim
  where u.perfil = 'vendedor' or o.id is not null
  group by u.id, u.nome, u.ativo
  order by 6 desc, u.nome
$$;

-- ---------------------------------------------------------------------
-- Busca sem acento ("ceramica" acha "Cerâmica")
-- ---------------------------------------------------------------------
create or replace function public.sem_acento(t text)
returns text language sql immutable parallel safe as $$
  select translate(lower(coalesce(t, '')),
    'áàâãäåéèêëíìîïóòôõöúùûüçñ', 'aaaaaaeeeeiiiiooooouuuucn')
$$;

alter table public.produtos add column busca text
  generated always as (public.sem_acento(marca || ' ' || nome || ' ' || referencia || ' ' || acabamento)) stored;
alter table public.clientes add column busca text
  generated always as (public.sem_acento(nome || ' ' || coalesce(cpf_cnpj, '') || ' ' || coalesce(telefone, '') || ' ' || coalesce(email, ''))) stored;

-- ---------------------------------------------------------------------
-- Cópias congeladas (snapshots) usadas no PDF
-- ---------------------------------------------------------------------
create or replace function public.empresa_snapshot()
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(e) - 'id' - 'atualizado_em' from empresa e where id = 1
$$;

create or replace function public.consultor_snapshot(p_usuario uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('nome', nome, 'whatsapp', whatsapp, 'email', email) from usuarios where id = p_usuario
$$;

-- ---------------------------------------------------------------------
-- Salvar o orçamento inteiro de uma vez (usado pelo salvamento automático).
-- Roda com as permissões de quem chamou (RLS vale normalmente).
-- ---------------------------------------------------------------------
create or replace function public.salvar_orcamento(p jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_id          uuid := nullif(p ->> 'id', '')::uuid;
  v_cli         jsonb := p -> 'cliente';
  v_cli_id      uuid;
  v_vendedor    uuid := coalesce(nullif(p ->> 'vendedor_id', '')::uuid, auth.uid());
  v_status_ant  text;
  v_data        date;
  v_validade    date := nullif(p ->> 'validade', '')::date;
  v_ids         uuid[];
begin
  if not usuario_ativo() then
    raise exception 'Seu acesso está desativado.' using errcode = 'insufficient_privilege';
  end if;

  -- 1) Cliente: atualiza o existente (se a pessoa pode ver) ou cria um novo.
  if v_cli is not null and length(trim(coalesce(v_cli ->> 'nome', ''))) > 0 then
    v_cli_id := nullif(v_cli ->> 'id', '')::uuid;
    if v_cli_id is not null and not exists (select 1 from clientes where id = v_cli_id) then
      v_cli_id := null; -- id de cliente que o vendedor não enxerga: trata como novo
    end if;
    if v_cli_id is null then
      insert into clientes (nome, cpf_cnpj, telefone, email, endereco)
      values (trim(v_cli ->> 'nome'), nullif(trim(v_cli ->> 'cpf_cnpj'), ''), nullif(trim(v_cli ->> 'telefone'), ''),
              nullif(trim(v_cli ->> 'email'), ''), nullif(trim(v_cli ->> 'endereco'), ''))
      returning id into v_cli_id;
    else
      update clientes set
        nome = trim(v_cli ->> 'nome'),
        cpf_cnpj = nullif(trim(v_cli ->> 'cpf_cnpj'), ''),
        telefone = nullif(trim(v_cli ->> 'telefone'), ''),
        email = nullif(trim(v_cli ->> 'email'), ''),
        endereco = nullif(trim(v_cli ->> 'endereco'), '')
      where id = v_cli_id; -- sem permissão de edição: 0 linhas, sem erro
    end if;
  end if;

  -- 2) Cria o orçamento (ganha número) ou zera ajustes para reprocessar os itens.
  if v_id is null then
    insert into orcamentos (cliente_id, vendedor_id, validade)
    values (v_cli_id, v_vendedor, v_validade)
    returning id, status into v_id, v_status_ant;
  else
    select status into v_status_ant from orcamentos where id = v_id;
    if not found then
      raise exception 'Orçamento não encontrado.' using errcode = 'P0002';
    end if;
    update orcamentos set desconto = 0, acrescimo = 0 where id = v_id;
  end if;

  -- 3) Itens: apaga os removidos e grava os demais na ordem da tela.
  select coalesce(array_agg((i ->> 'id')::uuid), '{}') into v_ids
    from jsonb_array_elements(coalesce(p -> 'itens', '[]')) i;
  delete from orcamento_itens where orcamento_id = v_id and not (id = any (v_ids));

  insert into orcamento_itens as it
    (id, orcamento_id, ordem, produto_id, marca, nome, referencia, acabamento, unidade, foto_url, ambiente, qtd, preco_base, pct)
  select (i ->> 'id')::uuid, v_id, (ord - 1)::int, nullif(i ->> 'produto_id', '')::uuid,
         coalesce(i ->> 'marca', ''), coalesce(i ->> 'nome', ''), coalesce(i ->> 'referencia', ''),
         coalesce(i ->> 'acabamento', ''), coalesce(nullif(i ->> 'unidade', ''), 'un'), nullif(i ->> 'foto_url', ''),
         trim(coalesce(i ->> 'ambiente', '')), (i ->> 'qtd')::numeric, (i ->> 'preco_base')::numeric, (i ->> 'pct')::numeric
  from jsonb_array_elements(coalesce(p -> 'itens', '[]')) with ordinality as t(i, ord)
  on conflict (id) do update set
    ordem = excluded.ordem, produto_id = excluded.produto_id, marca = excluded.marca, nome = excluded.nome,
    referencia = excluded.referencia, acabamento = excluded.acabamento, unidade = excluded.unidade,
    foto_url = excluded.foto_url, ambiente = excluded.ambiente, qtd = excluded.qtd,
    preco_base = excluded.preco_base, pct = excluded.pct
  where it.orcamento_id = excluded.orcamento_id;

  -- 4) Cabeçalho, ajustes e cópias para o PDF.
  select data into v_data from orcamentos where id = v_id;
  if v_validade is not null and v_validade < v_data then
    raise exception 'A validade não pode ser antes da data do orçamento.' using errcode = 'check_violation';
  end if;

  update orcamentos o set
    cliente_id       = v_cli_id,
    vendedor_id      = v_vendedor,
    arquiteto        = trim(coalesce(p ->> 'arquiteto', '')),
    validade         = coalesce(v_validade, o.validade),
    status           = coalesce(nullif(p ->> 'status', ''), o.status),
    desconto         = coalesce((p ->> 'desconto')::numeric, 0),
    motivo_desconto  = trim(coalesce(p ->> 'motivo_desconto', '')),
    acrescimo        = coalesce((p ->> 'acrescimo')::numeric, 0),
    motivo_acrescimo = trim(coalesce(p ->> 'motivo_acrescimo', '')),
    formas_pagamento = coalesce(array(select jsonb_array_elements_text(p -> 'formas_pagamento')), '{}'),
    forma_outro      = trim(coalesce(p ->> 'forma_outro', '')),
    condicoes        = coalesce(p ->> 'condicoes', ''),
    observacoes      = coalesce(p ->> 'observacoes', ''),
    snapshot_cliente = case when v_cli_id is null then null else jsonb_build_object(
                         'nome', trim(v_cli ->> 'nome'), 'cpf_cnpj', trim(coalesce(v_cli ->> 'cpf_cnpj', '')),
                         'telefone', trim(coalesce(v_cli ->> 'telefone', '')), 'email', trim(coalesce(v_cli ->> 'email', '')),
                         'endereco', trim(coalesce(v_cli ->> 'endereco', ''))) end,
    -- Empresa e consultor ficam congelados depois que o orçamento sai de Rascunho.
    snapshot_empresa   = case when v_status_ant = 'rascunho' or o.snapshot_empresa is null
                              then empresa_snapshot() else o.snapshot_empresa end,
    snapshot_consultor = case when v_status_ant = 'rascunho' or o.snapshot_consultor is null or o.vendedor_id <> v_vendedor
                              then consultor_snapshot(v_vendedor) else o.snapshot_consultor end
  where o.id = v_id;

  return (
    select jsonb_build_object(
      'id', o.id, 'numero', o.numero, 'status', o.status,
      'situacao', situacao_orcamento(o.status, o.validade),
      'data', o.data, 'validade', o.validade, 'cliente_id', o.cliente_id, 'modo_calculo', o.modo_calculo,
      'subtotal_prazo', o.subtotal_prazo, 'subtotal_vista', o.subtotal_vista,
      'total_prazo', o.total_prazo, 'total_vista', o.total_vista, 'atualizado_em', o.atualizado_em,
      'itens', coalesce((select jsonb_agg(jsonb_build_object(
          'id', i.id, 'unit_prazo', i.unit_prazo, 'unit_vista', i.unit_vista,
          'total_prazo', i.total_prazo, 'total_vista', i.total_vista) order by i.ordem)
        from orcamento_itens i where i.orcamento_id = o.id), '[]'))
    from orcamentos o where o.id = v_id
  );
end $$;

-- Duplicar: novo número, data de hoje, Rascunho, consultor = quem duplicou.
create or replace function public.duplicar_orcamento(p_id uuid)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  o orcamentos;
  v_novo uuid;
begin
  select * into o from orcamentos where id = p_id;
  if not found then
    raise exception 'Orçamento não encontrado.' using errcode = 'P0002';
  end if;

  insert into orcamentos (cliente_id, vendedor_id, arquiteto, modo_calculo, formas_pagamento, forma_outro,
                          condicoes, observacoes, snapshot_cliente)
  values (o.cliente_id, auth.uid(), o.arquiteto, o.modo_calculo, o.formas_pagamento, o.forma_outro,
          o.condicoes, o.observacoes, o.snapshot_cliente)
  returning id into v_novo;

  insert into orcamento_itens (orcamento_id, ordem, produto_id, marca, nome, referencia, acabamento, unidade,
                               foto_url, ambiente, qtd, preco_base, pct)
  select v_novo, ordem, produto_id, marca, nome, referencia, acabamento, unidade, foto_url, ambiente, qtd, preco_base, pct
  from orcamento_itens where orcamento_id = p_id;

  update orcamentos set
    desconto = o.desconto, motivo_desconto = o.motivo_desconto,
    acrescimo = o.acrescimo, motivo_acrescimo = o.motivo_acrescimo,
    snapshot_empresa = empresa_snapshot(), snapshot_consultor = consultor_snapshot(auth.uid())
  where id = v_novo;
  return v_novo;
end $$;

-- Ao compartilhar: Rascunho vira Enviado e os dados do PDF ficam congelados.
create or replace function public.marcar_enviado(p_id uuid)
returns text language plpgsql security invoker set search_path = public as $$
declare
  v_status text;
begin
  update orcamentos set
    status = 'enviado',
    snapshot_empresa = empresa_snapshot(),
    snapshot_consultor = consultor_snapshot(vendedor_id)
  where id = p_id and status = 'rascunho';
  select status into v_status from orcamentos where id = p_id;
  return v_status;
end $$;

-- Sugestões de preenchimento (cada um só enxerga o que o RLS permite).
create or replace function public.arquitetos_usados()
returns setof text language sql stable security invoker set search_path = public as $$
  select distinct arquiteto from orcamentos where arquiteto <> '' order by 1 limit 300
$$;

create or replace function public.marcas_usadas()
returns setof text language sql stable security invoker set search_path = public as $$
  select distinct marca from produtos where marca <> '' and ativo order by 1
$$;

-- ---------------------------------------------------------------------
-- Arquivos (fotos de produtos e logo). Bucket público para leitura; só
-- usuários ativos enviam fotos de produto e só admin envia a logo.
-- Arquivos nunca são sobrescritos nem apagados: orçamentos antigos
-- continuam apontando para a foto que tinham.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('arquivos', 'arquivos', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy arquivos_enviar_produto on storage.objects for insert to authenticated
  with check (bucket_id = 'arquivos' and name like 'produtos/%' and public.usuario_ativo());
create policy arquivos_enviar_logo on storage.objects for insert to authenticated
  with check (bucket_id = 'arquivos' and name like 'empresa/%' and public.is_admin());

-- Permissões de acesso via API (as regras finas ficam no RLS acima).
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select on public.orcamentos_lista to authenticated, service_role;
revoke all on public.orcamento_contadores from authenticated;
grant execute on all functions in schema public to authenticated, service_role;
