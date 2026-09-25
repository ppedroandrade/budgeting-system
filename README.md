# Orçamentos — Arte Decor Revest

Sistema web de orçamentos da Arte Decor Revest (Foz do Iguaçu – PR), substituindo a planilha Excel.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind 4 · Supabase (Postgres, Auth, Storage, RLS) · @react-pdf/renderer · Vercel.

## Situação
Fases 1 a 4 prontas e testadas; Fase 5 com guias prontos (a publicação em si depende das suas contas).

- **Publicar:** [docs/PUBLICAR.md](docs/PUBLICAR.md) — passo a passo Supabase + Vercel.
- **Guia do vendedor (1 página):** [docs/GUIA-VENDEDOR.md](docs/GUIA-VENDEDOR.md).
- **Exemplo de PDF:** [docs/exemplo-orcamento.pdf](docs/exemplo-orcamento.pdf) (fotos de teste).

### RT de arquitetos (somente admin)
- No orçamento, o vendedor marca **Indicação do arquiteto(a)** (e se ele acompanhou o cliente). Ao virar **Aprovado**,
  nasce sozinho um lançamento de RT com valor da compra = total à vista e o % padrão (ou o % próprio do arquiteto).
- Menu **RT Arquitetos**: lançamentos por mês (mesmas colunas da planilha), pagamentos do cliente (parcelas),
  pagamentos ao arquiteto, "a pagar por arquiteto" com PIX, cadastro de arquitetos, exportar para Excel.
- Valor da RT = compra × % — **sempre calculado** (a planilha de junho tinha 1.930 e 11.800 digitados; o correto é
  1.927,50 e 11.812,00). Regra de liberação configurável: proporcional ao que o cliente pagou, ou só quando quitar.
- Vendedor nunca vê % ou valores de RT, e nada disso sai no PDF do cliente (garantido no banco, por RLS).
- `supabase/seed-rt-junho-2026.sql` (opcional) traz os dois lançamentos de junho/2026 da planilha.

### Decisão pendente
- **Modo B**: implementado como na regra escrita (preço digitado = à vista; à prazo = vista × (1 + %)).
  O valor esperado da especificação (R$ 22.194,58) corresponde a outra regra (à vista = prazo ÷ 1,20).
  Troca simples em `calcular_item()` (banco) e `calcularItem()` (tela), se for o caso.

## Onde está cada coisa
| Caminho | O quê |
|---|---|
| `supabase/schema.sql` | **Arquivo único do banco**: colar no Supabase → SQL Editor → Run |
| `supabase/seed-produtos.sql` | Os 10 produtos do orçamento do Ali (opcional) |
| `supabase/seed-rt-junho-2026.sql` | Os lançamentos de RT de junho/2026 da planilha (opcional) |
| `src/app/(app)/rt/` | Tela de RT dos arquitetos (admin) e exportação para Excel |
| `supabase/dev/` | Só para testes locais (simula o Supabase num Postgres local) |
| `src/components/orcamentos/` | Tela única de orçamento, salvamento automático, compartilhar |
| `src/pdf/` | PDF do orçamento (react-pdf), fontes e logos |
| `src/lib/calculo.ts` | Regras de cálculo em centavos (mesma regra do banco) |
| `src/styles/tokens.css` | Cores, fontes e medidas (design tokens) |
| `src/app/(app)/` | Telas do sistema (painel, vendedores, configurações…) |
| `src/lib/` | Sessão, Supabase e formatação brasileira |
| `tests/` | Testes automáticos (`npm test`; banco: `TEST_DATABASE_URL=postgres://…/teste npm run test:db — use um banco separado, os testes criam dados`) |
| `assets/` | Logos originais (branca) e versão escura gerada para fundo claro/PDF |

## Regras de acesso (garantidas no banco, via RLS)
- **Admin:** vê e edita tudo, cadastra/desativa vendedores, altera configurações, vê o Painel.
- **Vendedor:** só os próprios orçamentos e os clientes que cadastrou (ou que estão nos orçamentos dele). Catálogo de produtos é compartilhado.
- O **primeiro login criado** no Supabase vira admin automaticamente.
- Vendedor desativado não consegue entrar e não enxerga nada; o histórico é mantido.

## Rodar localmente
```bash
cp .env.example .env.local   # preencher com as chaves do Supabase
npm install
npm run dev
```
