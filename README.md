# Orçamentos — Arte Decor Revest

Sistema web de orçamentos da Arte Decor Revest (Foz do Iguaçu – PR), substituindo a planilha Excel.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind 4 · Supabase (Postgres, Auth, Storage, RLS) · @react-pdf/renderer · Vercel.

## Situação
- **Fase 1 — Base:** login, perfis Admin/Vendedor, Vendedores, Configurações e Painel do admin.
- Fases 2–5: catálogo e clientes, orçamento, PDF, publicação.

## Onde está cada coisa
| Caminho | O quê |
|---|---|
| `supabase/schema.sql` | **Arquivo único do banco**: colar no Supabase → SQL Editor → Run |
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
