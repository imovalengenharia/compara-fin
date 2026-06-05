"""
SERVIDOR DA PLATAFORMA DE ANÁLISE FINANCEIRA COMPARATIVA
=========================================================
FastAPI + autenticação por sessão + conexão com o motor de cálculo.

Fluxo:
  /            → redireciona para /login ou /home conforme sessão
  /login       → tela de login (POST valida e cria sessão)
  /home        → Home com explicação + dois uploads (foco / comparativas)
  /api/analisar→ recebe os uploads, roda o motor, devolve JSON com os índices
  /relatorio   → renderiza o relatório a partir do resultado do motor

Para rodar localmente:
  pip install fastapi uvicorn python-multipart itsdangerous jinja2 openpyxl
  uvicorn app:app --reload
  abrir http://127.0.0.1:8000
"""
import os, json, secrets, hashlib
from pathlib import Path
from fastapi import FastAPI, Request, Form, UploadFile, File, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

# motor de cálculo (mesmo diretório, copiado do protótipo)
import motor

BASE = Path(__file__).parent
app = FastAPI(title="Compara·Fin")
app.add_middleware(SessionMiddleware, secret_key=os.environ.get("SECRET_KEY", secrets.token_hex(32)))
app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")

UPLOAD_DIR = BASE / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# AUTENTICAÇÃO (simples, para protótipo — trocar por banco de dados em produção)
# Senha guardada como hash. Em produção: tabela de usuários + bcrypt.
# ─────────────────────────────────────────────────────────────────────────────
def _hash(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()

# usuário de demonstração: anderson / compara2025
USUARIOS = {
    "anderson": _hash("compara2025"),
}

def usuario_logado(request: Request):
    return request.session.get("user")

def requer_login(request: Request):
    u = usuario_logado(request)
    if not u:
        raise HTTPException(status_code=303, headers={"Location": "/login"})
    return u

# ─────────────────────────────────────────────────────────────────────────────
# ROTAS
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
def raiz(request: Request):
    if usuario_logado(request):
        return RedirectResponse("/home", status_code=303)
    return RedirectResponse("/login", status_code=303)


@app.get("/login", response_class=HTMLResponse)
def login_form(request: Request, erro: str = ""):
    return (BASE / "templates" / "login.html").read_text(encoding="utf-8").replace(
        "{{ERRO}}", '<p class="erro">Usuário ou senha inválidos.</p>' if erro else "")


@app.post("/login")
def login_post(request: Request, usuario: str = Form(...), senha: str = Form(...)):
    if USUARIOS.get(usuario) == _hash(senha):
        request.session["user"] = usuario
        return RedirectResponse("/home", status_code=303)
    return RedirectResponse("/login?erro=1", status_code=303)


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", status_code=303)


@app.get("/home", response_class=HTMLResponse)
def home(request: Request):
    u = usuario_logado(request)
    if not u:
        return RedirectResponse("/login", status_code=303)
    html = (BASE / "templates" / "home.html").read_text(encoding="utf-8")
    return html.replace("{{USER}}", u)


@app.post("/api/analisar")
async def analisar(
    request: Request,
    cd_foco: str = Form(...),
    cd_comp: str = Form(...),       # códigos separados por vírgula
    ano: str = Form("2025"),
    ano_ant: str = Form("2024"),
    arquivos_foco: list[UploadFile] = File(default=[]),
    arquivos_comp: list[UploadFile] = File(default=[]),
):
    """Recebe códigos CVM (e, opcionalmente, arquivos enviados) e roda o motor.
    No protótipo, o cálculo usa os CSVs da CVM por código. Os uploads são salvos
    para a futura camada de leitura de PDF/planilha (porta 2 de ingestão)."""
    if not usuario_logado(request):
        return JSONResponse({"erro": "não autenticado"}, status_code=401)

    # salvar uploads (para auditoria / futura leitura de PDF)
    for f in (arquivos_foco or []) + (arquivos_comp or []):
        if f and f.filename:
            destino = UPLOAD_DIR / f.filename
            destino.write_bytes(await f.read())

    # rodar o motor para cada empresa
    resultado = {"foco": None, "comparaveis": [], "alertas": []}
    try:
        rf = motor.analisa(cd_foco, ano, ano_ant)
        resultado["foco"] = _serializa(cd_foco, rf)
        if not rf["fechamento_ok"]:
            resultado["alertas"].append(f"Balanço da empresa em foco ({cd_foco}) não fecha.")
    except Exception as e:
        return JSONResponse({"erro": f"Falha ao analisar empresa em foco: {e}"}, status_code=400)

    for cd in [c.strip() for c in cd_comp.split(",") if c.strip()]:
        try:
            rc = motor.analisa(cd, ano, ano_ant)
            resultado["comparaveis"].append(_serializa(cd, rc))
            if not rc["fechamento_ok"]:
                resultado["alertas"].append(f"Balanço de {cd} não fecha.")
        except Exception as e:
            resultado["alertas"].append(f"Não foi possível analisar {cd}: {e}")

    return JSONResponse(resultado)


def _serializa(cd, r):
    """Converte o resultado do motor em JSON limpo para o front-end."""
    i = r["indices"]
    return {
        "codigo_cvm": cd,
        "fechamento_ok": r["fechamento_ok"],
        "indices": {k: v for k, v in i.items()},
        "natureza": r["natureza"],
    }


# health check para hospedagem
@app.get("/health")
def health():
    return {"status": "ok"}
