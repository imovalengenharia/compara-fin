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

# Garante que as pastas existam (o GitHub pode não subir pastas vazias/ocultas)
STATIC_DIR = BASE / "static"
UPLOAD_DIR = BASE / "uploads"
STATIC_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

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


async def _salva_e_identifica(arquivos):
    """Salva os uploads e tenta identificar a empresa pelos PDFs.
    Retorna (cd_cvm, info) — info descreve como foi identificada (ou o motivo da falha)."""
    import identificador
    cd = None
    info = {"identificada": False, "metodo": None, "nome": None, "arquivos": []}
    for f in arquivos or []:
        if not f or not f.filename:
            continue
        destino = UPLOAD_DIR / f.filename
        destino.write_bytes(await f.read())
        info["arquivos"].append(f.filename)
        if cd is None and f.filename.lower().endswith(".pdf"):
            r = identificador.identifica_empresa(destino)
            if r:
                cd = r["cd_cvm"]
                info.update(identificada=True, metodo=r["metodo"], nome=r["nome"])
    return cd, info


@app.post("/api/identificar")
async def identificar(request: Request, arquivos: list[UploadFile] = File(default=[])):
    """Chamada pela Home assim que o usuário anexa arquivos de um lado.
    Tenta descobrir a empresa pelo PDF. Se não conseguir, a interface pede confirmação."""
    if not usuario_logado(request):
        return JSONResponse({"erro": "não autenticado"}, status_code=401)
    cd, info = await _salva_e_identifica(arquivos)
    if cd:
        return JSONResponse({"ok": True, "cd_cvm": cd, "nome": info["nome"], "metodo": info["metodo"]})
    return JSONResponse({"ok": False, "motivo": "Não foi possível identificar a empresa pelo arquivo. "
                         "Informe o código CVM para confirmar."})


@app.post("/api/analisar")
async def analisar(
    request: Request,
    cd_foco: str = Form(""),        # opcional: só se a identificação automática falhar
    cd_comp: str = Form(""),        # idem, separado por vírgula
    ano: str = Form("2025"),
    ano_ant: str = Form("2024"),
    arquivos_foco: list[UploadFile] = File(default=[]),
    arquivos_comp: list[UploadFile] = File(default=[]),
):
    """Identifica as empresas pelos PDFs enviados e roda o motor.
    Os números vêm da base CVM (confiáveis); o PDF serve para identificar a empresa.
    cd_foco/cd_comp são usados apenas como fallback se a identificação falhar."""
    if not usuario_logado(request):
        return JSONResponse({"erro": "não autenticado"}, status_code=401)

    # 1) identificar empresa em foco
    cd_f, info_f = await _salva_e_identifica(arquivos_foco)
    if not cd_f and cd_foco.strip():
        cd_f = cd_foco.strip()
    if not cd_f:
        return JSONResponse({"erro": "Não identifiquei a empresa em foco pelos arquivos. "
                             "Confirme o código CVM."}, status_code=400)

    # 2) identificar comparáveis (cada arquivo pode ser uma empresa)
    cds_comp = []
    import identificador
    for f in arquivos_comp or []:
        if f and f.filename and f.filename.lower().endswith(".pdf"):
            destino = UPLOAD_DIR / f.filename
            if not destino.exists():
                destino.write_bytes(await f.read())
            r = identificador.identifica_empresa(destino)
            if r and r["cd_cvm"] not in cds_comp and r["cd_cvm"] != cd_f:
                cds_comp.append(r["cd_cvm"])
    # fallback: códigos digitados
    for c in [c.strip() for c in cd_comp.split(",") if c.strip()]:
        if c not in cds_comp and c != cd_f:
            cds_comp.append(c)
    if not cds_comp:
        return JSONResponse({"erro": "Não identifiquei nenhuma empresa comparável pelos arquivos. "
                             "Confirme o(s) código(s) CVM."}, status_code=400)

    # 3) rodar o motor
    resultado = {"foco": None, "comparaveis": [], "alertas": []}
    try:
        rf = motor.analisa(cd_f, ano, ano_ant)
        resultado["foco"] = _serializa(cd_f, rf)
        if not rf["fechamento_ok"]:
            resultado["alertas"].append(f"Balanço da empresa em foco não fecha.")
    except Exception as e:
        return JSONResponse({"erro": f"Falha ao analisar empresa em foco ({cd_f}): {e}"}, status_code=400)

    for cd in cds_comp:
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
