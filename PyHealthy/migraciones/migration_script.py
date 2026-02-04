"""
Script de migración: sube datos de Excel a Supabase
- 1_ARBOL_RECETAS_FINAL_SUPABASE.xlsx  →  tabla arbol_recetas
- 2_RECETA_INGREDIENTES_FINAL_SUPABASE.xlsx  →  tabla receta_ingredientes

Flujo:
  1. Consulta arbol_platos para mapear plato_code_ref → plato_id
  2. Inserta arbol_recetas nivel por nivel (1 → 2 → 3) para resaltar parent_id
  3. Consulta arbol_materia_prima para mapear materia_prima_code_ref → materia_prima_id
  4. Inserta receta_ingredientes usando los mapeos resueltos
"""

import pandas as pd
import os
import sys
import time
from supabase import create_client

# ─── Configuración ────────────────────────────────────────────────────────────
SUPABASE_URL = "https://ulboklgzjriatmaxzpsi.supabase.co"
SUPABASE_KEY = "sb_secret_R-yFmIRlPNITmp86n5Ix-g_4Tvf3qAk"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_ARBOL    = os.path.join(BASE_DIR, "1_ARBOL_RECETAS_FINAL_SUPABASE.xlsx")
EXCEL_INGR     = os.path.join(BASE_DIR, "2_RECETA_INGREDIENTES_FINAL_SUPABASE.xlsx")

BATCH_SIZE = 100  # filas por lote en cada insert

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ─── Utilidades ───────────────────────────────────────────────────────────────
def nan_to_none(val):
    """Convierte NaN / NaT a None para Supabase."""
    if pd.isna(val):
        return None
    # Si es numpy int/float, conviértelo a Python nativo
    if hasattr(val, 'item'):
        return val.item()
    return val


def insertar_en_lotes(tabla, registros, upsert=False, conflict_col=None):
    """
    Inserta una lista de dicts en la tabla, en lotes de BATCH_SIZE.
    Si upsert=True, usa upsert con conflict_col como columna de conflicto.
    Retorna la cantidad total insertada/actualizada.
    """
    total = 0
    for i in range(0, len(registros), BATCH_SIZE):
        lote = registros[i:i + BATCH_SIZE]
        if upsert and conflict_col:
            resp = (
                supabase.table(tabla)
                .upsert(lote, on_conflict=conflict_col)
                .execute()
            )
        else:
            resp = supabase.table(tabla).insert(lote).execute()

        insertados = len(resp.data) if resp.data else 0
        total += insertados
        print(f"  └─ lote {i // BATCH_SIZE + 1}: {insertados} registros")
    return total


# ─── Fase 0: Verificar archivos ──────────────────────────────────────────────
def verificar_archivos():
    for f in [EXCEL_ARBOL, EXCEL_INGR]:
        if not os.path.exists(f):
            print(f"[ERROR] No existe el archivo: {f}")
            sys.exit(1)
    print("[OK] Ambos archivos Excel encontrados.\n")


# ─── Fase 1: Cargar mapeo de platos (arbol_platos → codigo → id) ─────────────
def cargar_mapeo_platos():
    """
    Descarga todos los registros de arbol_platos y construye un dict codigo → id.
    Si la tabla no tiene datos o no existe, retorna dict vacío (los nodos nivel 1
    se insertan sin plato_id en ese caso).
    """
    print("[Fase 1] Cargando mapeo de platos desde arbol_platos...")
    try:
        # Supabase pagination: traer hasta 10 000 registros
        resp = supabase.table("arbol_platos").select("id, codigo").limit(10000).execute()
        mapeo = {row["codigo"]: row["id"] for row in (resp.data or [])}
        print(f"  └─ {len(mapeo)} platos cargados.\n")
        return mapeo
    except Exception as e:
        print(f"  [WARN] No se pudo cargar arbol_platos: {e}")
        print("  Los campos plato_id se dejarán en NULL.\n")
        return {}


# ─── Fase 2: Cargar mapeo de materia prima (arbol_materia_prima → codigo → id) ─
def cargar_mapeo_materia_prima():
    """
    Descarga todos los registros de arbol_materia_prima y construye un dict codigo → id.
    """
    print("[Fase 3] Cargando mapeo de materia prima desde arbol_materia_prima...")
    try:
        resp = supabase.table("arbol_materia_prima").select("id, codigo").limit(50000).execute()
        mapeo = {row["codigo"]: row["id"] for row in (resp.data or [])}
        print(f"  └─ {len(mapeo)} productos de materia prima cargados.\n")
        return mapeo
    except Exception as e:
        print(f"  [WARN] No se pudo cargar arbol_materia_prima: {e}")
        print("  Los campos materia_prima_id se dejarán en NULL.\n")
        return {}


# ─── Fase 2: Migrar arbol_recetas ─────────────────────────────────────────────
def migrar_arbol_recetas(mapeo_platos):
    """
    Lee el Excel, ordena por nivel_actual, y sube nivel por nivel.
    Construye codigo → id a medida que inserta para resolver parent_id.
    """
    print("[Fase 2] Leyendo Excel de arbol_recetas...")
    df = pd.read_excel(EXCEL_ARBOL)
    print(f"  └─ {len(df)} filas cargadas.\n")

    # Mapa codigo → id que se va construyendo durante la inserción
    codigo_a_id = {}

    # Ordenar por nivel para insertar padres antes que hijos
    for nivel in sorted(df["nivel_actual"].unique()):
        df_nivel = df[df["nivel_actual"] == nivel].copy()
        print(f"[Fase 2] Insertando nivel {nivel} ({len(df_nivel)} registros)...")

        registros = []
        for _, row in df_nivel.iterrows():
            codigo = str(row["codigo"])

            # Resolver parent_id
            parent_code = nan_to_none(row.get("parent_code_ref"))
            parent_id = None
            if parent_code is not None:
                parent_code = str(parent_code)
                parent_id = codigo_a_id.get(parent_code)
                if parent_id is None:
                    print(f"  [WARN] parent_code_ref '{parent_code}' no encontrado para codigo '{codigo}'")

            # Resolver plato_id
            plato_code = nan_to_none(row.get("plato_code_ref"))
            plato_id = None
            if plato_code is not None:
                plato_code = str(plato_code)
                plato_id = mapeo_platos.get(plato_code)

            # Construir registro
            reg = {
                "codigo":               codigo,
                "nombre":               nan_to_none(row.get("nombre")),
                "descripcion":          nan_to_none(row.get("descripcion")),
                "nivel_actual":         nan_to_none(row.get("nivel_actual")),
                "parent_id":            parent_id,
                "plato_id":             plato_id,
                "rendimiento":          nan_to_none(row.get("rendimiento")),
                "version":              nan_to_none(row.get("version")),
                "activo":               bool(row.get("activo", True)),
                "tipo_nodo":            nan_to_none(row.get("tipo_nodo")),
                "codigo_tecfood_plato": nan_to_none(row.get("codigo_tecfood_plato")),
                "codigo_unidad":        nan_to_none(row.get("codigo_unidad")),
                "costo_calculado":      nan_to_none(row.get("costo_calculado")),
                "tiempo_preparacion":   nan_to_none(row.get("tiempo_preparacion")),
                "instrucciones":        nan_to_none(row.get("instrucciones")),
                "cambios_pendientes":   bool(row.get("cambios_pendientes", False)),
            }
            registros.append(reg)

        # Insertar en lotes usando upsert por "codigo" para evitar duplicados
        total = insertar_en_lotes("arbol_recetas", registros, upsert=True, conflict_col="codigo")
        print(f"  └─ Nivel {nivel}: {total} registros procesados.\n")

        # Ahora traer los IDs que Supabase asignó para los códigos insertados
        # Consultamos los codigos que acabamos de insertar
        codigos_insertados = [r["codigo"] for r in registros]
        for i in range(0, len(codigos_insertados), BATCH_SIZE):
            lote_codigos = codigos_insertados[i:i + BATCH_SIZE]
            resp = (
                supabase.table("arbol_recetas")
                .select("id, codigo")
                .in_("codigo", lote_codigos)
                .execute()
            )
            for row in (resp.data or []):
                codigo_a_id[row["codigo"]] = row["id"]

    print(f"[Fase 2] arbol_recetas completado. Total codigos mapeados: {len(codigo_a_id)}\n")
    return codigo_a_id


# ─── Fase 4: Migrar receta_ingredientes ───────────────────────────────────────
def migrar_receta_ingredientes(codigo_a_id_recetas, mapeo_materia_prima):
    """
    Lee el Excel de ingredientes y sube los datos mapeando las referencias por código
    a los IDs reales de Supabase.
    """
    print("[Fase 4] Leyendo Excel de receta_ingredientes...")
    df = pd.read_excel(EXCEL_INGR)
    print(f"  └─ {len(df)} filas cargadas.\n")

    sin_receta   = 0
    sin_mat_prima = 0

    registros = []
    for _, row in df.iterrows():
        receta_code = str(row["receta_code_ref"])
        receta_id   = codigo_a_id_recetas.get(receta_code)

        if receta_id is None:
            sin_receta += 1
            continue

        # Resolver materia_prima_id
        mp_code = nan_to_none(row.get("materia_prima_code_ref"))
        materia_prima_id = None
        if mp_code is not None:
            mp_code = str(mp_code)
            materia_prima_id = mapeo_materia_prima.get(mp_code)
            if materia_prima_id is None:
                sin_mat_prima += 1

        reg = {
            "receta_id":              receta_id,
            "materia_prima_id":       materia_prima_id,
            "cantidad_requerida":     nan_to_none(row.get("cantidad_requerida")),
            "unidad_medida":          nan_to_none(row.get("unidad_medida")),
            "orden":                  nan_to_none(row.get("orden")),
            "producto_codigo_tecfood":nan_to_none(row.get("producto_codigo_tecfood")),
            "producto_nombre":        nan_to_none(row.get("producto_nombre")),
            "producto_encontrado":    bool(row.get("producto_encontrado", False)) if pd.notna(row.get("producto_encontrado")) else None,
            "metodo_mapeo":           nan_to_none(row.get("metodo_mapeo")),
            "ganancia_coccion_pct":   nan_to_none(row.get("ganancia_coccion_pct")),
            "aprob_coccion_pct":      nan_to_none(row.get("aprob_coccion_pct")),
            "perdida_limpieza_pct":   nan_to_none(row.get("perdida_limpieza_pct")),
            "aprob_limpieza_pct":     nan_to_none(row.get("aprob_limpieza_pct")),
        }
        registros.append(reg)

    print(f"  └─ Registros preparados: {len(registros)}")
    print(f"  └─ Skipped sin receta_id: {sin_receta}")
    print(f"  └─ Sin materia_prima_id (se insertan con NULL): {sin_mat_prima}\n")

    if registros:
        print("[Fase 4] Insertando receta_ingredientes...")
        total = insertar_en_lotes("receta_ingredientes", registros)
        print(f"  └─ receta_ingredientes completado: {total} registros insertados.\n")
    else:
        print("  [WARN] No hay registros para insertar en receta_ingredientes.\n")


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  SCRIPT DE MIGRACIÓN → SUPABASE")
    print("=" * 60)
    print()

    verificar_archivos()

    # Fase 1: mapeos previos
    mapeo_platos         = cargar_mapeo_platos()
    mapeo_materia_prima  = cargar_mapeo_materia_prima()

    # Fase 2: arbol_recetas (nivel por nivel)
    codigo_a_id_recetas = migrar_arbol_recetas(mapeo_platos)

    # Fase 4: receta_ingredientes
    migrar_receta_ingredientes(codigo_a_id_recetas, mapeo_materia_prima)

    print("=" * 60)
    print("  MIGRACIÓN COMPLETADA")
    print("=" * 60)


if __name__ == "__main__":
    main()
