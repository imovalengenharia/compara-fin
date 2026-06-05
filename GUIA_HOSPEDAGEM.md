# 🚀 GUIA: Como colocar a plataforma no ar (passo a passo)

Este guia assume que você nunca hospedou um site. Siga na ordem, sem pular.
Vamos usar **GitHub** (guarda o código) + **Render** (roda o site). Ambos têm
plano gratuito.

> ⚠️ **Antes de começar — leia isto.** Esta versão tem login com um usuário fixo
> (`anderson` / `compara2025`), escrito no código. Serve para você testar e mostrar
> para pessoas de confiança. **NÃO divulgue como produto público** antes de trocar
> por um sistema de senhas de verdade (banco de dados). Está tudo explicado no fim.

---

## PARTE 1 — Subir o código para o GitHub

O GitHub é onde o código fica guardado. O Render vai ler de lá.

### 1.1 — Criar conta no GitHub
1. Acesse **https://github.com** e clique em **Sign up**.
2. Crie usuário, e-mail e senha. Confirme o e-mail.

### 1.2 — Criar um repositório
1. Logado, clique no **+** no canto superior direito → **New repository**.
2. Em **Repository name**, escreva: `compara-fin`
3. Marque **Private** (só você vê o código — importante por causa da senha).
4. Clique em **Create repository**.

### 1.3 — Subir os arquivos
A forma mais fácil, sem instalar nada:
1. Na página do repositório recém-criado, clique em **uploading an existing file**
   (link azul no meio da tela).
2. Abra a pasta `compara-fin` (que veio no .zip), selecione **TODOS** os arquivos
   e pastas de dentro dela, e **arraste** para a área de upload do GitHub.
   - Inclua: `app.py`, `motor.py`, `requirements.txt`, `Procfile`, `render.yaml`,
     `.gitignore`, a pasta `templates`, e os arquivos `.csv`.
3. Espere o upload terminar (os CSVs somam ~24 MB, pode levar 1-2 min).
4. Em baixo, clique em **Commit changes**.

✅ Pronto — seu código está no GitHub.

---

## PARTE 2 — Colocar no ar pelo Render

### 2.1 — Criar conta no Render
1. Acesse **https://render.com** e clique em **Get Started**.
2. Escolha **Sign up with GitHub** (conecta as duas contas automaticamente).
3. Autorize o Render a acessar seus repositórios.

### 2.2 — Criar o Web Service
1. No painel do Render, clique em **New +** → **Web Service**.
2. Encontre o repositório `compara-fin` na lista e clique em **Connect**.
3. O Render vai ler o arquivo `render.yaml` e preencher quase tudo sozinho. Confira:
   - **Name:** compara-fin
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** **Free**
4. Clique em **Create Web Service**.

### 2.3 — Esperar o deploy
- O Render vai instalar tudo e iniciar (leva 2-5 minutos na primeira vez).
- Quando aparecer **"Live"** em verde, está no ar.
- O endereço será algo como: `https://compara-fin.onrender.com`

✅ Acesse esse endereço — vai abrir a tela de login.
   Entre com **anderson** / **compara2025**.

---

## ⚠️ Detalhe do plano gratuito do Render

No plano free, o site **"dorme"** após 15 min sem uso. O primeiro acesso depois
disso leva ~30-50 segundos para "acordar". É normal. Para acesso instantâneo, o
plano pago mais barato resolve (cerca de US$ 7/mês).

---

## PARTE 3 — O que fazer ANTES de usar como produto de verdade

Estas três coisas são necessárias para ser seguro/profissional:

### 3.1 — Sistema de senhas de verdade (o mais importante)
Hoje o usuário/senha está fixo no `app.py`. Para vários usuários com segurança,
é preciso um **banco de dados** (o Render oferece PostgreSQL gratuito) e guardar
senhas com **bcrypt**. É a próxima evolução natural do projeto.

### 3.2 — Leitura automática de PDF
Hoje o cálculo usa os CSVs da CVM (empresas abertas). Para analisar empresas de
capital fechado, falta a camada que lê os números direto do PDF enviado.

### 3.3 — Gerar o relatório completo
Hoje a plataforma mostra a tabela comparativa de índices. O próximo passo é gerar
o relatório completo (igual ao laudo da Cyrela) a partir dos dados calculados.

---

## Resumo do fluxo

```
Seu PC (pasta compara-fin)
      │  (upload)
      ▼
   GitHub  ──(Render lê)──►  Render  ──►  https://compara-fin.onrender.com
                                              (site no ar, com login)
```

Qualquer dúvida em qualquer passo, me chame que eu destravo.
