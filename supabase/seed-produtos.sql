-- Produtos de exemplo (planilha do orçamento do cliente Ali).
-- Opcional: rodar no SQL Editor DEPOIS do schema.sql.
-- Preços à prazo (Modo A). Marcas/referências em branco onde a planilha não informa.
insert into public.produtos (marca, nome, referencia, acabamento, unidade, preco_base) values
  ('',        'Dispenser detergente',                              '',                  'Aço escovado',   'un',  494.80),
  ('',        'Cuba retangular',                                   '',                  'Aço escovado',   'un', 3324.00),
  ('Debacco', 'Escorredor de pratos individual',                   '00118 20.04.001',   '',               'un',  600.00),
  ('Debacco', 'Porta talheres individual',                         '',                  '',               'un',  764.40),
  ('Debacco', 'Escorredor raso 150 mm',                            '',                  '',               'un',  249.52),
  ('Debacco', 'Lixeira redonda de embutir 5 litros',               '',                  '',               'un',  956.34),
  ('Debacco', 'Escorredor de utensílios horizontal 300 mm',        '',                  '',               'un',  780.84),
  ('Docol',   'Chuveiro parede Novo Tecnoshower',                  '',                  'Grafite polido', 'un', 1221.60),
  ('Docol',   'Misturador monocomando lavatório New Edge',         '',                  'Grafite polido', 'un', 2722.80),
  ('',        'Canal organizador inox 90 cm',                      '',                  'Inox',           'un', 3686.00);
