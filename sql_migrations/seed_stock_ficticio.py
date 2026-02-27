#!/usr/bin/env python3
"""
seed_stock_ficticio.py
Carga stock ficticio a todos los productos nivel 5 de arbol_materia_prima.

Estrategia: 2 llamadas PATCH globales (muy rapido):
  1. Actualiza stock_actual, stock_minimo, stock_maximo para TODOS los nivel 5 activos
  2. Actualiza costo_promedio solo donde sea 0

Luego: PATCH individuales para agregar variacion realista al stock.
"""

import urllib.request
import urllib.error
import json
import random
import time
import sys

# ── Config ──────────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://ulboklgzjriatmaxzpsi.supabase.co"
SERVICE_KEY  = "sb_secret_R-yFmIRlPNITmp86n5Ix-g_4Tvf3qAk"
BASE_HEADERS = {
    "apikey":        SERVICE_KEY,
    "Authorization": "Bearer " + SERVICE_KEY,
    "Content-Type":  "application/json",
    "Prefer":        "return=minimal",
}
PAGE_SIZE = 1000

# ── Estimacion de costo por codigo ───────────────────────────────────────────
def estimar_costo(codigo, nombre):
    cod = (codigo or "")
    nom = (nombre or "").upper()
    if cod.startswith("1.1"):   return round(random.uniform(8_000, 45_000), 2)
    if cod.startswith("1.2"):   return round(random.uniform(2_500, 12_000), 2)
    if cod.startswith("1.3"):   return round(random.uniform(800,   6_000),  2)
    if cod.startswith("1.4"):   return round(random.uniform(1_500, 8_000),  2)
    if cod.startswith("1.5"):   return round(random.uniform(3_000, 15_000), 2)
    if cod.startswith("1.6"):   return round(random.uniform(1_000, 6_000),  2)
    for kw in ["RES","CERDO","POLLO","PESCADO","ATUN","SALMON","CARNE"]:
        if kw in nom: return round(random.uniform(10_000, 45_000), 2)
    for kw in ["LECHE","QUESO","YOGUR","HUEVO"]:
        if kw in nom: return round(random.uniform(2_500, 10_000), 2)
    for kw in ["ZANAHORIA","PAPA","CEBOLLA","TOMATE","LECHUGA","REPOLLO","ARVEJA"]:
        if kw in nom: return round(random.uniform(800, 4_000), 2)
    for kw in ["ARROZ","FRIJOL","LENTEJA","GARBANZO","MAIZ","PASTA"]:
        if kw in nom: return round(random.uniform(1_500, 6_000), 2)
    return round(random.uniform(1_000, 20_000), 2)

# ── HTTP helpers ──────────────────────────────────────────────────────────────
def do_patch(endpoint, body, extra_headers=None):
    url = SUPABASE_URL + "/rest/v1/" + endpoint
    headers = {**BASE_HEADERS}
    if extra_headers:
        headers.update(extra_headers)
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="PATCH")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, None
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")

def do_get(endpoint, params=""):
    url = SUPABASE_URL + "/rest/v1/" + endpoint + ("?" + params if params else "")
    req = urllib.request.Request(url, headers=BASE_HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

# ── Paso 1: PATCH global de stock (mismos valores para todos) ─────────────────
def patch_global_stock():
    print("Paso 1: PATCH global stock_actual/minimo/maximo...")
    # stock base ficticio: 80 unidades, min=15, max=400
    status, err = do_patch(
        "arbol_materia_prima?nivel_actual=eq.5&activo=eq.true",
        {"stock_actual": 80.0, "stock_minimo": 15.0, "stock_maximo": 400.0}
    )
    if status in (200, 201, 204):
        print("  OK - todos los nivel 5 actualizados con stock base 80")
    else:
        print(f"  ERROR {status}: {err}")
        sys.exit(1)

# ── Paso 2: PATCH costo_promedio solo donde sea 0 ─────────────────────────────
def fetch_sin_costo():
    """Obtiene todos los productos nivel 5 sin costo_promedio."""
    productos = []
    offset = 0
    while True:
        items = do_get(
            "arbol_materia_prima",
            f"nivel_actual=eq.5&activo=eq.true&costo_promedio=eq.0"
            f"&select=id,codigo,nombre&offset={offset}&limit={PAGE_SIZE}"
        )
        productos.extend(items)
        if len(items) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return productos

def patch_costos_individuales(productos):
    """PATCH individual para cada producto sin costo."""
    print(f"Paso 2: Asignando costo_promedio a {len(productos)} productos sin costo...")
    ok = 0
    err_count = 0
    for i, p in enumerate(productos):
        costo = estimar_costo(p.get("codigo",""), p.get("nombre",""))
        status, err = do_patch(
            f"arbol_materia_prima?id=eq.{p['id']}",
            {"costo_promedio": costo}
        )
        if status in (200, 201, 204):
            ok += 1
        else:
            err_count += 1
            if err_count <= 3:
                print(f"  ERROR id={p['id']}: {err[:100]}")
        # Progreso cada 100
        if (i + 1) % 100 == 0 or i == len(productos) - 1:
            print(f"  [{i+1:>5}/{len(productos)}] ok={ok} err={err_count}")
    return ok, err_count

# ── Paso 3: Variacion de stock por rangos ──────────────────────────────────────
def fetch_all_nivel5_ids():
    """Obtiene todos los IDs nivel 5."""
    ids = []
    offset = 0
    while True:
        items = do_get(
            "arbol_materia_prima",
            f"nivel_actual=eq.5&activo=eq.true&select=id,codigo&offset={offset}&limit={PAGE_SIZE}"
        )
        ids.extend(items)
        if len(items) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return ids

def patch_variacion_stock(productos):
    """
    Aplica variacion de stock:
    - 20% de productos: stock CRITICO (por debajo del minimo = 5-12)
    - 20% de productos: stock BAJO (minimo 15-25)
    - 10% de productos: stock EXCESO (maximo 500-800)
    - 50% restante: NORMAL (80-300)
    Esto hace que el dashboard de stock muestre alertas reales.
    """
    print(f"Paso 3: Aplicando variacion de stock ({len(productos)} productos)...")
    random.shuffle(productos)
    n = len(productos)

    # Distribucion
    criticos = productos[:int(n * 0.20)]
    bajos    = productos[int(n * 0.20):int(n * 0.40)]
    exceso   = productos[int(n * 0.40):int(n * 0.50)]
    normales = productos[int(n * 0.50):]

    grupos = [
        ("CRITICO",  criticos, lambda: round(random.uniform(1, 12), 2)),
        ("BAJO",     bajos,    lambda: round(random.uniform(15, 25), 2)),
        ("EXCESO",   exceso,   lambda: round(random.uniform(500, 800), 2)),
        ("NORMAL",   normales, lambda: round(random.uniform(50, 300), 2)),
    ]

    ok_total = 0
    for estado, grupo, gen_stock in grupos:
        ok = 0
        for p in grupo:
            stock = gen_stock()
            status, _ = do_patch(
                f"arbol_materia_prima?id=eq.{p['id']}",
                {"stock_actual": stock}
            )
            if status in (200, 201, 204):
                ok += 1
        print(f"  {estado:8s}: {ok}/{len(grupo)} actualizados")
        ok_total += ok

    return ok_total

# ── Verificacion final ─────────────────────────────────────────────────────────
def verificar():
    print("\nVerificacion final (muestra de 8 productos):")
    items = do_get(
        "arbol_materia_prima",
        "nivel_actual=eq.5&activo=eq.true"
        "&select=codigo,nombre,stock_actual,stock_minimo,costo_promedio&limit=8"
    )
    print(f"  {'CODIGO':22s} {'NOMBRE':28s} {'STOCK':>8} {'MIN':>6} {'COSTO':>10}")
    print("  " + "-"*80)
    for p in items:
        est = ""
        sa = p.get("stock_actual") or 0
        sm = p.get("stock_minimo") or 0
        if sa < sm:     est = " [CRITICO]"
        elif sa < sm*1.2: est = " [BAJO]"
        print(f"  {(p.get('codigo') or ''):22s} {(p.get('nombre') or ''):28.28s} "
              f"{sa:>8.1f} {sm:>6.1f} {(p.get('costo_promedio') or 0):>10.0f}{est}")

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    random.seed(99)
    print("=" * 60)
    print("SEED STOCK FICTICIO - arbol_materia_prima nivel 5")
    print("=" * 60)
    print()

    # Paso 1: stock base a todos
    patch_global_stock()
    print()

    # Paso 2: costo a los que tienen 0
    sin_costo = fetch_sin_costo()
    if sin_costo:
        ok, err = patch_costos_individuales(sin_costo)
        print(f"  Total: {ok} costos asignados, {err} errores")
    else:
        print("Paso 2: Todos los productos ya tienen costo_promedio. Saltando.")
    print()

    # Paso 3: variacion de stock
    todos = fetch_all_nivel5_ids()
    patch_variacion_stock(todos)
    print()

    # Verificacion
    verificar()

    print()
    print("=" * 60)
    print("LISTO! Stock ficticio cargado en los 1705 productos.")
    print("=" * 60)

if __name__ == "__main__":
    main()
