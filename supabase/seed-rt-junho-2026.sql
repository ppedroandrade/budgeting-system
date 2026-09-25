-- RT de junho/2026 (planilha "RT JUNHO 2026"). Opcional: rodar no SQL Editor
-- DEPOIS do schema.sql. O valor da RT é calculado pelo sistema:
--   38.550,00 × 5% = 1.927,50   (a planilha trazia 1.930,00 digitado)
--  236.240,00 × 5% = 11.812,00  (a planilha trazia 11.800,00 digitado)
with a as (
  insert into public.arquitetos (nome) values ('Camila Lobato'), ('Anderson Szelemel')
  on conflict (public.sem_acento(trim(nome))) do update set nome = excluded.nome
  returning id, nome
), l as (
  insert into public.rt_lancamentos (arquiteto_id, cliente_nome, mes_ref, data_pedido, nota_fiscal, acompanhou, valor_compra, pct, ajustado)
  select a.id, v.cliente, '2026-06-01', v.pedido::date, v.nf, true, v.valor, 5, true
  from a join (values
    ('Camila Lobato',     'Restaurante Pasta Mia', '2026-06-19', '2727',  38550.00),
    ('Anderson Szelemel', 'Andressa Fernanda',     '2026-06-30', '703',  236240.00)
  ) as v(arquiteto, cliente, pedido, nf, valor) on v.arquiteto = a.nome
  returning id, cliente_nome
)
-- "(PAGO 50,000)" da planilha: pagamento parcial da cliente Andressa (data não informada na planilha).
insert into public.rt_recebimentos (lancamento_id, data, valor, forma, observacao)
select id, '2026-06-30', 50000.00, '', 'Informado na planilha de junho (data a confirmar)'
from l where cliente_nome = 'Andressa Fernanda';
