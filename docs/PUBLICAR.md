# Como colocar o sistema no ar

São 3 partes: **Supabase** (banco e login), **Vercel** (o site) e **primeiro acesso**.
Faça um passo de cada vez. Leva uns 30 minutos no total.

> Antes de começar: o código precisa estar no branch principal (`main`) do GitHub.
> Se ainda estiver no branch `claude/orcamentos-arte-decor-i13p8g`, peça para abrir e juntar o "pull request".

---

## Parte A — Supabase (banco de dados e login)

**A1. Criar a conta**
1. Acesse **https://supabase.com** e clique em **Start your project**.
2. Entre com o GitHub.

**A2. Criar o projeto**
1. Clique em **New project**.
2. Nome: `arte-decor-orcamentos`.
3. **Database password**: clique em *Generate a password* e **guarde essa senha** num lugar seguro.
4. Region: **South America (São Paulo)**.
5. Clique em **Create new project** e espere uns 2 minutos até terminar.

**A3. Criar as tabelas (o arquivo único)**
1. No menu da esquerda, abra **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo [`supabase/schema.sql`](../supabase/schema.sql) no GitHub, clique no botão **Copy raw file** e cole tudo na tela do Supabase.
4. Clique em **Run**. Deve aparecer *Success. No rows returned*.
5. (Opcional) Faça o mesmo com [`supabase/seed-produtos.sql`](../supabase/seed-produtos.sql) para já ter os 10 produtos de exemplo.
6. (Opcional) E com [`supabase/seed-rt-junho-2026.sql`](../supabase/seed-rt-junho-2026.sql) para já ter a RT de junho/2026 da planilha.

**A4. Fechar o cadastro público** (só o admin cria contas)
1. Menu **Authentication** → **Sign In / Providers**.
2. Desligue **Allow new users to sign up** e salve.

**A5. Criar o seu usuário (vira admin automaticamente)**
1. Menu **Authentication** → **Users** → **Add user** → **Create new user**.
2. Digite seu e-mail e uma senha, **marque "Auto Confirm User"** e confirme.
3. O **primeiro** usuário criado vira **Administrador**. Os próximos você cadastra dentro do sistema, em *Vendedores*.

**A6. Copiar as 3 chaves**
Menu **Project Settings** → **API** (ou **API Keys**). Copie para um bloco de notas:
- **Project URL** (ex.: `https://abcd1234.supabase.co`)
- **anon public** key (ou *publishable key*)
- **service_role** key (ou *secret key*) — **esta é secreta, não mande para ninguém.**

---

## Parte B — Vercel (o site)

**B1. Criar a conta**
1. Acesse **https://vercel.com** → **Sign Up** → **Continue with GitHub**.

**B2. Importar o projeto**
1. Clique em **Add New…** → **Project**.
2. Ache o repositório **budgeting-system** e clique em **Import**.

**B3. Colar as chaves** (antes de publicar)
Abra **Environment Variables** e crie as 3 abaixo, com os valores da etapa A6:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |

**B4. Publicar**
1. Clique em **Deploy** e espere uns 2 minutos.
2. Ao terminar, a Vercel mostra o endereço do site (ex.: `https://budgeting-system.vercel.app`). Guarde.

**B5. Avisar o Supabase do endereço**
1. No Supabase: **Authentication** → **URL Configuration**.
2. Em **Site URL**, cole o endereço da Vercel e salve.

---

## Parte C — Primeiro acesso

1. Abra o endereço do site e entre com o e-mail e a senha da etapa A5.
2. **Configurações**: preencha o **CNPJ**, confira os dados da loja e envie a **logo escura** (o PDF tem fundo branco).
3. **Vendedores**: cadastre cada vendedor (nome, e-mail, WhatsApp e senha inicial) e passe a senha pessoalmente.
4. Em **Vendedores**, clique no seu nome para corrigir como ele aparece no PDF (o Supabase usa o começo do e-mail como nome).
5. **RT Arquitetos**: confira o **% padrão de RT** (começa em 5%) e quando a RT pode ser paga. No *Cadastro de arquitetos*, preencha o PIX e o % próprio de quem tiver.
6. Faça um orçamento de teste, gere o PDF e compartilhe com você mesmo.

---

## Bom saber

- **Plano gratuito do Supabase pausa o projeto após 7 dias sem nenhum acesso.** Com uso diário isso não acontece. Se pausar, entre no painel do Supabase e clique em *Restore*. Para nunca pausar e ter backup automático diário, o plano Pro custa US$ 25/mês.
- **Esqueceram a senha?** O admin define uma nova em *Vendedores* → clicar no vendedor → *Nova senha*.
- **Vendedor saiu da loja?** *Vendedores* → clicar nele → *Desativar*. Os orçamentos dele continuam guardados.
- **Atualizações do sistema**: quando o código mudar no GitHub (`main`), a Vercel publica sozinha em ~2 minutos.
