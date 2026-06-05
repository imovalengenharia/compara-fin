# O que mudou nesta versão

## 1. Não precisa mais digitar código CVM
Agora você anexa os demonstrativos (PDF) e a plataforma **identifica a empresa
automaticamente** — pelo nome ou CNPJ no documento. O código CVM só é pedido se a
identificação falhar (ex.: PDF corrompido ou escaneado ilegível).

## 2. O botão "Gerar análise" ativa com arquivos dos dois lados
Basta ter arquivo no lado "foco" e no lado "comparativas". Sem depender de digitar nada.

## 3. Como funciona (decisão de robustez)
- O PDF serve para **identificar a empresa**.
- Os **números** vêm da base CVM (estruturados, validados, que fecham).
- Assim, erro de leitura de PDF nunca compromete os cálculos.

## Arquivos novos neste pacote
- `identificador.py` — lê o PDF e descobre a empresa (CNPJ → nome → OCR → fallback).
- `indice_empresas.json` — índice CNPJ/nome → código CVM (426 empresas).

## Para subir ao GitHub
Suba TODOS os arquivos desta pasta (substituindo os antigos). Principais que mudaram:
`app.py`, `templates/home.html`, e os novos `identificador.py` e `indice_empresas.json`.
Depois o Render refaz o deploy sozinho.

## Observação sobre PDFs escaneados
PDFs escaneados (imagem) ou corrompidos podem não ser identificados automaticamente.
Nesse caso a tela mostra um campo para você confirmar o código CVM. É o comportamento
seguro — melhor pedir confirmação do que adivinhar errado.
