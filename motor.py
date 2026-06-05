"""
MOTOR DE CÁLCULO FINANCEIRO GENÉRICO — multissetorial, baseado em demonstrativos CVM
==================================================================================
Princípio (open-closed): o núcleo opera SOBRE NATUREZAS, nunca sobre contas de um
setor específico. Adicionar empresa/setor/índice = acrescentar config, não reescrever.

Três camadas:
  1. CARGA      — lê CSV CVM (BPA/BPP/DRE/DFC) de qualquer empresa por código.
  2. MAPEAMENTO — converte códigos CVM em naturezas canônicas (parametrizável).
  3. CÁLCULO    — fórmulas declarativas sobre naturezas + validação de fechamento.
"""
import csv, json, os

CSV_DIR = os.path.dirname(os.path.abspath(__file__))

# ─────────────────────────────────────────────────────────────────────────────
# CAMADA 1 — CARGA: lê os CSVs da CVM para uma empresa/ano
# ─────────────────────────────────────────────────────────────────────────────
def carrega_demonstrativo(cd_cvm, ano, escopo='con'):
    """Lê BPA, BPP, DRE e DFC-MI de uma empresa. Retorna dict {cod_conta: valor}.
    Usa ORDEM_EXERC=ÚLTIMO (saldo de fechamento do exercício)."""
    contas = {}
    descricoes = {}
    for tipo in ['BPA', 'BPP', 'DRE', 'DFC_MI']:
        caminho = f'{CSV_DIR}/dfp_cia_aberta_{tipo}_{escopo}_{ano}.csv'
        if not os.path.exists(caminho):
            continue
        with open(caminho, encoding='latin-1') as f:
            for row in csv.DictReader(f, delimiter=';'):
                if row['CD_CVM'] == str(cd_cvm) and row['ORDEM_EXERC'] == 'ÚLTIMO':
                    cod = row['CD_CONTA']
                    contas[cod] = float(row['VL_CONTA'])
                    descricoes[cod] = row['DS_CONTA']
    return contas, descricoes


# ─────────────────────────────────────────────────────────────────────────────
# CAMADA 2 — MAPEAMENTO: código CVM → natureza canônica
# Estrutura padrão CVM (vale para QUALQUER empresa não-financeira):
#   1       Ativo Total
#   1.01    Ativo Circulante      1.02  Ativo Não Circulante
#   2.01    Passivo Circulante    2.02  Passivo Não Circulante   2.03  PL
#   3.01    Receita ... 3.11 Lucro Líquido
# O mapa é PARAMETRIZÁVEL: cada setor/empresa pode sobrescrever.
# ─────────────────────────────────────────────────────────────────────────────
MAPA_PADRAO = {
    # Ativo
    'ativo_total':         '1',
    'ativo_circulante':    '1.01',
    'caixa':               '1.01.01',
    'aplicacoes_fin':      '1.01.02',
    'contas_receber_cp':   '1.01.03',
    'estoques':            '1.01.04',
    'ativo_nao_circ':      '1.02',
    'realizavel_lp':       '1.02.01',
    'investimentos':       '1.02.02',
    'imobilizado':         '1.02.03',
    'intangivel':          '1.02.04',
    # Passivo
    'passivo_total':       '2',
    'passivo_circulante':  '2.01',
    'fornecedores':        '2.01.02',
    'emprestimos_cp':      '2.01.04',
    'passivo_nao_circ':    '2.02',
    'emprestimos_lp':      '2.02.01',
    'pl':                  '2.03',
    'capital_social':      '2.03.01',
    # DRE
    'receita':             '3.01',
    'custo':               '3.02',
    'lucro_bruto':         '3.03',
    'desp_operacionais':   '3.04',
    'ebit':                '3.05',
    'result_financeiro':   '3.06',
    'result_antes_trib':   '3.07',
    'tributos':            '3.08',
    'lucro_liquido':       '3.11',
}

def aplica_mapa(contas, mapa=None, overrides=None):
    """Converte o dict de contas CVM em naturezas canônicas.
    overrides: permite incluir/excluir/redirecionar contas por empresa."""
    mapa = dict(mapa or MAPA_PADRAO)
    if overrides:
        mapa.update(overrides)
    nat = {}
    for natureza, cod in mapa.items():
        nat[natureza] = contas.get(cod, 0.0)
    return nat


# ─────────────────────────────────────────────────────────────────────────────
# CAMADA 1.5 — VALIDAÇÃO: invariante de fechamento (BLOQUEANTE, universal)
# ─────────────────────────────────────────────────────────────────────────────
def valida_fechamento(nat, tol=1.0):
    """Ativo = Passivo + PL. Vale para qualquer empresa. Retorna (ok, detalhe)."""
    ativo = nat.get('ativo_total', 0)
    passivo_total = nat.get('passivo_total', 0)  # CVM: '2' já inclui PC+PNC+PL
    diff = abs(ativo - passivo_total)
    ok = diff <= tol
    return ok, {'ativo': ativo, 'passivo_total': passivo_total, 'diferenca': diff}


# ─────────────────────────────────────────────────────────────────────────────
# CAMADA 3 — CÁLCULO: fórmulas declarativas sobre naturezas
# Cada índice é uma função de (atual, anterior, da). Retorna None se indeterminado.
# 'da' = depreciação/amortização (vem da DFC, fora do plano padrão).
# ─────────────────────────────────────────────────────────────────────────────
def _div(a, b):
    return a / b if b not in (0, None) else None

def calcula_indices(nat, nat_ant=None, da=0.0):
    ac  = nat['ativo_circulante']; anc = nat['ativo_nao_circ']
    pc  = nat['passivo_circulante']; pnc = nat['passivo_nao_circ']
    pl  = nat['pl']; ativo = nat['ativo_total']
    estoque = nat['estoques']; rlp = nat['realizavel_lp']
    caixa = nat['caixa']; aplic = nat['aplicacoes_fin']
    cr = nat['contas_receber_cp']; forn = nat['fornecedores']
    divida = nat['emprestimos_cp'] + nat['emprestimos_lp']
    rec = nat['receita']; custo = abs(nat['custo'])
    lb = nat['lucro_bruto']; ebit = nat['ebit']; ll = nat['lucro_liquido']
    ebitda = ebit + da if da else ebit

    # base média (usa anterior se houver)
    pl_med = (pl + nat_ant['pl']) / 2 if nat_ant else pl
    ativo_med = (ativo + nat_ant['ativo_total']) / 2 if nat_ant else ativo

    return {
        # Liquidez
        'liquidez_corrente': _div(ac, pc),
        'liquidez_seca':     _div(ac - estoque, pc),
        'liquidez_geral':    _div(ac + rlp, pc + pnc),
        # Estrutura de capital
        'particip_ct':       _div(pc + pnc, ativo),
        'ct_proprios':       _div(pc + pnc, pl),
        'exig_cp':           _div(pc, pc + pnc),
        'divida_liquida':    divida - caixa - aplic,
        'divida_liq_ebitda': _div(divida - caixa - aplic, ebitda) if ebitda > 0 else None,
        # Atividade (360 dias)
        'giro_estoque_dias': _div(estoque * 360, custo),
        'pmr_dias':          _div(cr * 360, rec),
        'pmp_dias':          _div(forn * 360, custo) if forn > 0 else None,
        'giro_ativo':        _div(rec, ativo),
        # Rentabilidade
        'roi':               _div(ll, ativo_med),
        'roe':               _div(ll, pl_med),
        'giro_pl':           _div(rec, pl),
        # Margens
        'margem_bruta':      _div(lb, rec),
        'margem_ebit':       _div(ebit, rec),
        'margem_ebitda':     _div(ebitda, rec),
        'margem_liquida':    _div(ll, rec),
        # auxiliares
        'ebitda': ebitda,
        'receita': rec, 'lucro_liquido': ll, 'pl': pl, 'ativo_total': ativo,
    }


# ─────────────────────────────────────────────────────────────────────────────
# ÍNDICE SETORIAL (plugin) — Kanitz. Só faz sentido p/ não-financeiras.
# ─────────────────────────────────────────────────────────────────────────────
def kanitz(ind):
    """FI = 0,05·ROE% + 1,65·LG + 3,55·LS − 1,06·(CT/PP) − 0,33·LC"""
    roe, lg, ls = ind['roe'], ind['liquidez_geral'], ind['liquidez_seca']
    ctpp, lc = ind['ct_proprios'], ind['liquidez_corrente']
    if None in (roe, lg, ls, ctpp, lc):
        return None
    return 0.05*(roe*100) + 1.65*lg + 3.55*ls - 1.06*ctpp - 0.33*lc


# ─────────────────────────────────────────────────────────────────────────────
# ORQUESTRADOR — análise completa de uma empresa em um ano
# ─────────────────────────────────────────────────────────────────────────────
def busca_da(cd_cvm, ano, escopo='con'):
    """Depreciação+amortização da DFC método indireto (fora do plano padrão)."""
    caminho = f'{CSV_DIR}/dfp_cia_aberta_DFC_MI_{escopo}_{ano}.csv'
    if not os.path.exists(caminho):
        return 0.0
    total = 0.0
    with open(caminho, encoding='latin-1') as f:
        for row in csv.DictReader(f, delimiter=';'):
            if row['CD_CVM'] == str(cd_cvm) and row['ORDEM_EXERC'] == 'ÚLTIMO':
                d = row['DS_CONTA'].lower()
                if ('deprecia' in d or 'amortiza' in d) and 'exaust' not in d:
                    total += abs(float(row['VL_CONTA']))
    return total

def analisa(cd_cvm, ano, ano_ant=None, escopo='con', overrides=None, com_kanitz=True):
    contas, desc = carrega_demonstrativo(cd_cvm, ano, escopo)
    nat = aplica_mapa(contas, overrides=overrides)
    ok, fech = valida_fechamento(nat)
    nat_ant = None
    if ano_ant:
        c_ant, _ = carrega_demonstrativo(cd_cvm, ano_ant, escopo)
        nat_ant = aplica_mapa(c_ant, overrides=overrides)
    da = busca_da(cd_cvm, ano, escopo)
    ind = calcula_indices(nat, nat_ant, da)
    if com_kanitz:
        ind['kanitz'] = kanitz(ind)
    return {'natureza': nat, 'indices': ind, 'fechamento_ok': ok, 'fechamento': fech, 'da': da}


if __name__ == '__main__':
    # AUDITORIA: roda nas 3 empresas e confere fechamento + confluência
    EMP = {'Cyrela': '014460', 'JHSF': '020605', 'Even': '020524'}
    print("="*64)
    print("AUDITORIA DO MOTOR GENÉRICO — 3 empresas, 2025 (vs 2024)")
    print("="*64)
    for nome, cd in EMP.items():
        r = analisa(cd, '2025', '2024')
        i = r['indices']
        flag = '✓' if r['fechamento_ok'] else '✗ NÃO FECHA'
        print(f"\n{nome} (CVM {cd}) — fechamento {flag}")
        print(f"  Receita {i['receita']/1e6:.2f}bi · LL {i['lucro_liquido']/1e6:.2f}bi · PL {i['pl']/1e6:.2f}bi")
        print(f"  LC {i['liquidez_corrente']:.2f} · LS {i['liquidez_seca']:.2f} · LG {i['liquidez_geral']:.2f}")
        print(f"  ML {i['margem_liquida']*100:.1f}% · ROE {i['roe']*100:.1f}% · ROI {i['roi']*100:.1f}%")
        print(f"  CT/PP {i['ct_proprios']:.2f} · DívLíq {i['divida_liquida']/1e3:.0f}mil · EBITDA {i['ebitda']/1e6:.2f}bi")
        k = i.get('kanitz')
        print(f"  Kanitz {k:.2f}" if k else "  Kanitz n/d")
