# Correção: travamento em "Identificando empresa…"

## O problema
A identificação dependia de programas de sistema (pdftotext, tesseract/OCR) que
não existem no servidor do Render, e tinha tempos limite longos (até 4 minutos).
Resultado: a tela travava em "Identificando empresa…".

## A correção
- A leitura do PDF agora usa **pdfplumber** (biblioteca Python, sem depender de
  programas externos). Rápida e funciona em qualquer servidor.
- Removido o OCR pesado. PDFs escaneados/corrompidos caem direto no campo de
  confirmação do código CVM, sem travar.
- A tela tem **tempo limite de 25 segundos**: se não identificar, mostra o campo
  para você informar o código, em vez de ficar presa.

## Para subir
Suba estes arquivos (substituindo): `identificador.py`, `templates/home.html`,
`requirements.txt`. O Render refaz o deploy sozinho.
