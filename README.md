# Compara·Fin — Plataforma de Análise Financeira Comparativa

Servidor web com login que recebe os demonstrativos de uma empresa em foco e de
comparáveis, recalcula todos os indicadores sob uma régua contábil única (via o
motor genérico) e devolve o comparativo, validando o fechamento de cada balanço.

## Como rodar localmente

```bash
# 1. instalar as dependências
pip install -r requirements.txt

# 2. subir o servidor
uvicorn app:app --reload

# 3. abrir no navegador
#    http://127.0.0.1:8000
#    login de demonstração:  anderson  /  compara2025
```

## Estrutura

```
servidor/
├── app.py                 ← servidor FastAPI (login, rotas, API)
├── motor.py               ← motor de cálculo genérico (régua única)
├── requirements.txt       ← dependências
├── templates/
│   ├── login.html         ← tela de login
│   └── home.html          ← home com explicação + dois uploads
├── static/                ← (CSS/JS estáticos, se necessário)
├── uploads/               ← arquivos enviados pelos usuários (criado em runtime)
└── dfp_cia_aberta_*.csv   ← base CVM Dados Abertos (BPA/BPP/DRE/DFC)
```

## Como funciona o fluxo

1. **Login** (`/login`) — autentica e cria sessão. No protótipo o usuário é fixo
   (hash em `app.py`). Em produção: tabela de usuários + bcrypt.
2. **Home** (`/home`) — o usuário informa o código CVM da empresa em foco e das
   comparáveis, e pode anexar os demonstrativos (PDF/XLSX/CSV).
3. **API** (`/api/analisar`) — roda `motor.analisa()` para cada empresa, valida o
   fechamento (Ativo = Passivo + PL) e devolve os índices em JSON.
4. O front-end monta a tabela comparativa e sinaliza qualquer balanço que não feche.

No protótipo, o cálculo usa os CSVs da CVM por código. Os arquivos enviados ficam
salvos em `uploads/` para a futura **camada de leitura automática de PDF** (porta 2
de ingestão), que vai extrair os números de empresas fechadas e a parte narrativa.

## Próximos passos para produção

- **Banco de dados** (PostgreSQL) para usuários, senhas (bcrypt) e análises salvas.
- **Leitura de PDF/planilha** dos uploads — hoje só os CSVs CVM alimentam o cálculo.
- **Geração do relatório completo** (o HTML estilo laudo) a partir do resultado,
  não só a tabela de índices.
- **Hospedagem** — Render, Railway, Fly.io ou AWS. O `app.py` já tem `/health` para
  o health check da plataforma de hospedagem.

## Segurança (importante antes de hospedar)

- Trocar a autenticação fixa por banco + bcrypt.
- Definir `SECRET_KEY` por variável de ambiente (já suportado em `app.py`).
- Validar tamanho/tipo dos uploads e limitar requisições.
