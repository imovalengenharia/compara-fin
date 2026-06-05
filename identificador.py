"""
IDENTIFICADOR DE EMPRESA A PARTIR DO PDF
=========================================
Descobre o código CVM de uma empresa lendo o demonstrativo enviado, em camadas
(da mais confiável para a menos):
  1. CNPJ no texto do PDF        → match exato na base CVM
  2. Nome da empresa no texto    → match na base CVM
  3. PDF escaneado (sem texto)   → OCR só da 1ª página para achar nome/CNPJ
  4. Nada encontrado             → retorna None (a interface pedirá confirmação)

Importante: o PDF serve só para IDENTIFICAR a empresa. Os NÚMEROS vêm da base CVM
(estruturados e validados). Assim, erro de leitura/OCR nunca compromete a análise.
"""
import csv, json, re, os, subprocess, tempfile
from pathlib import Path

BASE = Path(__file__).parent
_INDICE = None

def _carrega_indice():
    global _INDICE
    if _INDICE is None:
        caminho = BASE / "indice_empresas.json"
        if caminho.exists():
            _INDICE = json.loads(caminho.read_text(encoding="utf-8"))
        else:
            _INDICE = _constroi_indice()
    return _INDICE

def _constroi_indice():
    """Monta CNPJ→cd e nome→cd a partir de um CSV da CVM disponível."""
    idx = {"cnpj": {}, "nome": {}}
    for f in BASE.glob("dfp_cia_aberta_DRE_con_*.csv"):
        with open(f, encoding="latin-1") as fh:
            for row in csv.DictReader(fh, delimiter=";"):
                cd = row["CD_CVM"]
                cnpj = re.sub(r"\D", "", row.get("CNPJ_CIA", ""))
                nome = row.get("DENOM_CIA", "").strip().upper()
                if cnpj:
                    idx["cnpj"][cnpj] = cd
                if nome:
                    idx["nome"][nome] = cd
        break
    return idx

# ─────────────────────────────────────────────────────────────────────────────
def _texto_pdf(caminho):
    """Extrai texto do PDF. Se vier vazio (escaneado), faz OCR da 1ª página."""
    try:
        txt = subprocess.run(
            ["pdftotext", "-f", "1", "-l", "5", str(caminho), "-"],
            capture_output=True, text=True, timeout=60
        ).stdout
    except Exception:
        txt = ""
    if len(txt.strip()) > 100:
        return txt, "texto"
    # fallback OCR — rasteriza a 1ª página e roda tesseract
    try:
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(["pdftoppm", "-png", "-f", "1", "-l", "1", "-r", "150",
                            str(caminho), f"{tmp}/pg"], timeout=90, capture_output=True)
            pngs = list(Path(tmp).glob("*.png"))
            if pngs:
                ocr = subprocess.run(["tesseract", str(pngs[0]), "-", "-l", "por"],
                                     capture_output=True, text=True, timeout=90).stdout
                return ocr, "ocr"
    except Exception:
        pass
    return "", "vazio"

def _normaliza(s):
    s = s.upper()
    s = re.sub(r"[ÁÀÂÃÄ]", "A", s); s = re.sub(r"[ÉÈÊË]", "E", s)
    s = re.sub(r"[ÍÌÎÏ]", "I", s); s = re.sub(r"[ÓÒÔÕÖ]", "O", s)
    s = re.sub(r"[ÚÙÛÜ]", "U", s); s = re.sub(r"[Ç]", "C", s)
    return s

def identifica_empresa(caminho_pdf):
    """Retorna dict: {cd_cvm, nome, metodo, confianca} ou None se não achar."""
    idx = _carrega_indice()
    texto, origem = _texto_pdf(caminho_pdf)
    if not texto:
        return None
    txt_norm = _normaliza(texto)

    # 1) CNPJ
    for m in re.finditer(r"\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}", texto):
        cnpj = re.sub(r"\D", "", m.group(0))
        if cnpj in idx["cnpj"]:
            cd = idx["cnpj"][cnpj]
            return {"cd_cvm": cd, "nome": _nome_de(idx, cd),
                    "metodo": f"CNPJ ({origem})", "confianca": "alta"}

    # 2) Nome — procura o nome da base dentro do texto do PDF
    melhor = None
    for nome, cd in idx["nome"].items():
        nome_norm = _normaliza(nome)
        # usa as 2 primeiras palavras significativas como âncora (ex.: "CYRELA BRAZIL")
        ancora = " ".join([p for p in nome_norm.split() if len(p) > 2][:2])
        if ancora and ancora in txt_norm:
            # pontua pelo nº de palavras do nome presentes no texto
            palavras = [p for p in nome_norm.split() if len(p) > 2]
            score = sum(1 for p in palavras if p in txt_norm)
            if melhor is None or score > melhor[2]:
                melhor = (cd, nome, score)
    if melhor:
        return {"cd_cvm": melhor[0], "nome": melhor[1],
                "metodo": f"nome ({origem})", "confianca": "média" if origem == "ocr" else "alta"}

    return None

def _nome_de(idx, cd):
    for nome, c in idx["nome"].items():
        if c == cd:
            return nome
    return cd


if __name__ == "__main__":
    # Teste com os PDFs do projeto
    import glob
    for pdf in sorted(glob.glob("/mnt/project/*.pdf")):
        nome = os.path.basename(pdf)
        if "RES_008" in nome or "PROJETO" in nome:
            continue
        r = identifica_empresa(pdf)
        if r:
            print(f"{nome:24} → CVM {r['cd_cvm']} · {r['nome'][:38]} · via {r['metodo']}")
        else:
            print(f"{nome:24} → NÃO IDENTIFICADO")
