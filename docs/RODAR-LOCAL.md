# Como rodar o sistema no seu computador

O sistema roda no seu computador, mas o **banco de dados e o login ficam no Supabase** (gratuito).
É o mesmo projeto Supabase que depois será usado na publicação, então nada é perdido.

Tempo: uns 20 minutos na primeira vez. Depois, só o passo 6.

---

## 1. Instalar o Node.js (uma vez só)
1. Acesse **https://nodejs.org** e baixe a versão **LTS** (22 ou mais nova).
2. Instale com as opções padrão (Avançar, Avançar, Concluir).
3. Para conferir, abra o terminal e digite `node -v`. Deve aparecer `v22…` ou maior.
   - **Windows**: menu Iniciar → digite **PowerShell** → abrir.
   - **Mac**: Cmd + Espaço → digite **Terminal** → Enter.

## 2. Baixar o código (uma vez só)
- **Jeito mais fácil**: na página do repositório no GitHub, clique em **Code → Download ZIP**, descompacte e guarde a pasta (ex.: em Documentos).
- **Com Git** (se tiver instalado): `git clone -b main https://github.com/ppedroandrade/budgeting-system.git`

## 3. Preparar o Supabase (uma vez só)
Siga a **Parte A** do guia [PUBLICAR.md](PUBLICAR.md) (etapas A1 a A6): criar o projeto, rodar o `schema.sql`, criar seu usuário admin e copiar as 3 chaves.

## 4. Colocar as chaves no projeto (uma vez só)
1. Na pasta do projeto, faça uma cópia do arquivo **`.env.example`** e renomeie a cópia para **`.env.local`**.
   - No Windows, se não aparecer o arquivo: no Explorador, menu **Exibir → Mostrar → Itens ocultos**.
2. Abra o `.env.local` no Bloco de Notas (ou TextEdit) e troque os 3 valores pelas chaves da etapa A6:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
3. Salve. **Nunca envie esse arquivo para ninguém** (ele já é ignorado pelo Git).

## 5. Instalar as dependências (uma vez só, e depois de cada atualização do código)
No terminal, entre na pasta do projeto e rode:
```
cd caminho/da/pasta/budgeting-system
npm install
```
Dica: digite `cd ` (com espaço) e arraste a pasta para dentro do terminal — o caminho aparece sozinho.

## 6. Ligar o sistema (toda vez que for usar)
```
npm run dev
```
Quando aparecer `Ready`, abra no navegador: **http://localhost:3000** e entre com o usuário admin da etapa A5.

Para desligar: no terminal, **Ctrl + C**.

### Abrir no celular (mesma rede Wi-Fi)
O terminal mostra uma linha `Network: http://192.168.x.x:3000`. Digite esse endereço no navegador do celular.
(Para compartilhar pelo WhatsApp com o PDF, o celular exige site seguro — isso funciona de verdade depois de publicado na Vercel.)

---

## Deu erro?
| Mensagem | O que fazer |
|---|---|
| `node` / `npm` não é reconhecido | Feche e abra o terminal de novo depois de instalar o Node. |
| `Your Node.js version…` ou `requires Node >= 20.9` | Instale a versão LTS mais nova do Node. |
| Tela de login diz "E-mail ou senha incorretos" | Confira o usuário criado na etapa A5 e se marcou *Auto Confirm User*. |
| Página em branco / erro de "supabase URL" | O `.env.local` não foi criado ou tem chave errada. Confira o passo 4 e reinicie (`Ctrl + C`, depois `npm run dev`). |
| `Port 3000 is in use` | O sistema já está ligado em outra janela, ou use o endereço que o terminal mostrar (ex.: `localhost:3001`). |
