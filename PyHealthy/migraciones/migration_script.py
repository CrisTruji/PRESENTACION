"""
Script de migración: sube datos de Excel a Supabase
- SUPABASE_1_ARBOL_RECETAS.xlsx        →  tabla arbol_recetas
- SUPABASE_2_RECETA_INGREDIENTES.xlsx  →  tabla receta_ingredientes

Flujo:
  1. Consulta arbol_platos para mapear plato_code_ref → plato_id
  2. Inserta arbol_recetas nivel por nivel (1 → 2 → 3) para resolver parent_id
  3. Consulta arbol_materia_prima para mapear materia_prima_code_ref → materia_prima_id
  4. Inserta receta_ingredientes usando los mapeos resueltos
"""

import pandas as pd
import os
import sys
from supabase import create_client

# ─── Configuración ────────────────────────────────────────────────────────────
SUPABASE_URL = "https://ulboklgzjriatmaxzpsi.supabase.co"
SUPABASE_KEY = "sb_secret_R-yFmIRlPNITmp86n5Ix-g_4Tvf3qAk"

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
EXCEL_ARBOL   = os.path.join(BASE_DIR, "SUPABASE_1_ARBOL_RECETAS.xlsx")
EXCEL_INGR    = os.path.join(BASE_DIR, "SUPABASE_2_RECETA_INGREDIENTES.xlsx")

BATCH_SIZE = 100

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ─── Utilidades ───────────────────────────────────────────────────────────────
def nan_to_none(val):
    """Convierte NaN / NaT a None para Supabase."""
    if pd.isna(val):
        return None
    if hasattr(val, 'item'):          # numpy int/float → Python nativo
        return val.item()
    return val


def insertar_en_lotes(tabla, registros, upsert=False, conflict_col=None):
    """
    Inserta una lista de dicts en lotes de BATCH_SIZE.
    Si upsert=True usa upsert con conflict_col.
    Retorna cantidad total procesada.
    """
    total = 0
    for i in range(0, len(registros), BATCH_SIZE):
        lote = registros[i:i + BATCH_SIZE]
        try:
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
        except Exception as e:
            print(f"  [ERROR] lote {i // BATCH_SIZE + 1}: {e}")
    return total


# ─── Fase 0: Verificar archivos ──────────────────────────────────────────────
def verificar_archivos():
    for f in [EXCEL_ARBOL, EXCEL_INGR]:
        if not os.path.exists(f):
            print(f"[ERROR] No existe el archivo: {f}")
            sys.exit(1)
    print("[OK] Ambos archivos Excel encontrados.\n")


# ─── Fase 0b: Verificar constraint nivel 3 ───────────────────────────────────
def verificar_constraint_nivel_3():
    """
    Verifica que el constraint permita nivel 3 antes de migrar.
    Evita errores masivos durante la migración.
    """
    print("[Pre-check] Verificando constraint nivel_actual...")
    try:
        # Intentar insertar un registro nivel 3 de prueba
        test_data = {
            "codigo": "TEST.CONSTRAINT.PRECHECK",
            "nombre": "Test Constraint Nivel 3",
            "nivel_actual": 3,
            "activo": False,
            "version": 1
        }

        resp = supabase.table("arbol_recetas").insert(test_data).execute()

        if resp.data:
            # Si funciona, eliminar el test
            supabase.table("arbol_recetas").delete().eq("codigo", "TEST.CONSTRAINT.PRECHECK").execute()
            print("  ✓ Constraint permite nivel 3 correctamente\n")
            return True
        else:
            raise Exception("No se pudo insertar registro de prueba")

    except Exception as e:
        error_msg = str(e)
        print(f"  ✗ BLOQUEADO: {error_msg}")

        if "arbol_recetas_nivel_actual_check" in error_msg:
            print("\n  SOLUCIÓN:")
            print("  1. Abre Supabase SQL Editor")
            print("  2. Ejecuta el script SQL para corregir el constraint:")
            print("     ALTER TABLE arbol_recetas DROP CONSTRAINT arbol_recetas_nivel_actual_check;")
            print("     ALTER TABLE arbol_recetas ADD CONSTRAINT arbol_recetas_nivel_actual_check")
            print("     CHECK (nivel_actual IN (1, 2, 3));")
            print("  3. Re-ejecuta este script\n")

        return False


# ─── Fase 1a: Mapeo platos (arbol_platos codigo → id) ───────────────────────
def cargar_mapeo_platos():
    print("[Fase 1a] Cargando mapeo de platos desde arbol_platos...")
    try:
        mapeo  = {}
        offset = 0
        while True:
            resp = supabase.table("arbol_platos").select("id, codigo").range(offset, offset + 999).execute()
            rows = resp.data or []
            if not rows:
                break
            for row in rows:
                mapeo[row["codigo"]] = row["id"]
            offset += 1000
        print(f"  └─ {len(mapeo)} platos cargados.\n")
        return mapeo
    except Exception as e:
        print(f"  [WARN] No se pudo cargar arbol_platos: {e}")
        print("  Los campos plato_id se dejarán en NULL.\n")
        return {}


# ─── Fase 1b: Mapeo materia prima (arbol_materia_prima codigo → id) ─────────
def cargar_mapeo_materia_prima():
    print("[Fase 1b] Cargando mapeo de materia prima desde arbol_materia_prima...")
    try:
        # Puede haber muchos registros → paginar manualmente
        mapeo = {}
        offset = 0
        while True:
            resp = (
                supabase.table("arbol_materia_prima")
                .select("id, codigo")
                .range(offset, offset + 999)
                .execute()
            )
            rows = resp.data or []
            if not rows:
                break
            for row in rows:
                mapeo[row["codigo"]] = row["id"]
            offset += 1000
        print(f"  └─ {len(mapeo)} productos de materia prima cargados.\n")
        return mapeo
    except Exception as e:
        print(f"  [WARN] No se pudo cargar arbol_materia_prima: {e}")
        print("  Los campos materia_prima_id se dejarán en NULL.\n")
        return {}


# ─── Fase 2: Migrar arbol_recetas (nivel por nivel) ─────────────────────────
def migrar_arbol_recetas(mapeo_platos):
    """
    Lee el Excel, inserta nivel 1 → 2 → 3.
    Tras cada nivel consulta los IDs asignados para resolver parent_id de los siguientes.
    """
    print("[Fase 2] Leyendo Excel de arbol_recetas...")
    df = pd.read_excel(EXCEL_ARBOL)
    print(f"  └─ {len(df)} filas cargadas.\n")

    codigo_a_id = {}   # se construye nivel a nivel

    for nivel in sorted(df["nivel_actual"].unique()):
        df_nivel = df[df["nivel_actual"] == nivel].copy()
        print(f"[Fase 2] Insertando nivel {nivel} ({len(df_nivel)} registros)...")

        registros = []
        for _, row in df_nivel.iterrows():
            codigo = str(row["codigo"])

            # ── parent_id ──
            parent_code = nan_to_none(row.get("parent_code_ref"))
            parent_id   = None
            if parent_code is not None:
                parent_code = str(parent_code)
                parent_id   = codigo_a_id.get(parent_code)
                if parent_id is None:
                    print(f"  [WARN] parent_code_ref '{parent_code}' no encontrado para codigo '{codigo}'")

            # ── plato_id ──
            plato_code = nan_to_none(row.get("plato_code_ref"))
            plato_id   = None
            if plato_code is not None:
                plato_id = mapeo_platos.get(str(plato_code))

            reg = {
                "codigo":             codigo,
                "nombre":             nan_to_none(row.get("nombre")),
                "descripcion":        nan_to_none(row.get("descripcion")),
                "nivel_actual":       nan_to_none(row.get("nivel_actual")),
                "parent_id":          parent_id,
                "plato_id":           plato_id,
                "rendimiento":        nan_to_none(row.get("rendimiento")),
                "version":            nan_to_none(row.get("version")),
                "activo":             bool(row.get("activo", True)),
                "codigo_unidad":      nan_to_none(row.get("codigo_unidad")),
                "costo_calculado":    nan_to_none(row.get("costo_calculado")),
                "tiempo_preparacion": nan_to_none(row.get("tiempo_preparacion")),
                "instrucciones":      nan_to_none(row.get("instrucciones")),
                "cambios_pendientes": bool(row.get("cambios_pendientes", False)),
            }
            registros.append(reg)

        # ========================================
        # DEDUPLICAR: Eliminar códigos duplicados dentro del mismo nivel
        # Mantener última ocurrencia de cada código
        # ========================================
        registros_dict = {}
        for reg in registros:
            registros_dict[reg["codigo"]] = reg  # Última ocurrencia sobrescribe

        registros_unicos = list(registros_dict.values())

        duplicados_count = len(registros) - len(registros_unicos)
        if duplicados_count > 0:
            print(f"  [WARN] Encontrados {duplicados_count} códigos duplicados en nivel {nivel}")
            print(f"  [INFO] Se mantendrá la última ocurrencia de cada código")

        # Upsert por "codigo" → no duplica si ya existe
        total = insertar_en_lotes("arbol_recetas", registros_unicos, upsert=True, conflict_col="codigo")
        print(f"  └─ Nivel {nivel}: {total} registros procesados.\n")

        # Traer los IDs que Supabase asignó para estos códigos
        codigos_insertados = [r["codigo"] for r in registros_unicos]  # ← USAR registros_unicos
        for i in range(0, len(codigos_insertados), BATCH_SIZE):
            lote_codigos = codigos_insertados[i:i + BATCH_SIZE]
            resp = (
                supabase.table("arbol_recetas")
                .select("id, codigo")
                .in_("codigo", lote_codigos)
                .execute()
            )
            for r in (resp.data or []):
                codigo_a_id[r["codigo"]] = r["id"]

    print(f"[Fase 2] arbol_recetas completado. Codigos mapeados: {len(codigo_a_id)}\n")
    return codigo_a_id


# ─── Fase 3: Migrar receta_ingredientes ──────────────────────────────────────
def migrar_receta_ingredientes(codigo_a_id_recetas, mapeo_materia_prima):
    """
    Lee el Excel de ingredientes y sube los datos mapeando código → id.
    Columnas insertadas: receta_id, materia_prima_id, cantidad_requerida, unidad_medida, orden
    """
    print("[Fase 3] Leyendo Excel de receta_ingredientes...")
    df = pd.read_excel(EXCEL_INGR)
    print(f"  └─ {len(df)} filas cargadas.\n")

    sin_receta    = 0
    sin_mat_prima = 0

    registros = []
    for _, row in df.iterrows():
        receta_code = str(row["receta_code_ref"])
        receta_id   = codigo_a_id_recetas.get(receta_code)

        if receta_id is None:
            sin_receta += 1
            continue

        # ── materia_prima_id ──
        mp_code          = nan_to_none(row.get("materia_prima_code_ref"))
        materia_prima_id = None
        if mp_code is not None:
            mp_code          = str(mp_code)
            materia_prima_id = mapeo_materia_prima.get(mp_code)
            if materia_prima_id is None:
                sin_mat_prima += 1

        reg = {
            "receta_id":          receta_id,
            "materia_prima_id":   materia_prima_id,
            "cantidad_requerida": nan_to_none(row.get("cantidad_requerida")),
            "unidad_medida":      nan_to_none(row.get("unidad_medida")),
            "orden":              nan_to_none(row.get("orden")),
        }
        registros.append(reg)

    # materia_prima_id es NOT NULL en la tabla → filtrar los sin mapeo
    registros_validos = [r for r in registros if r["materia_prima_id"] is not None]

    print(f"  └─ Registros preparados  : {len(registros)}")
    print(f"  └─ Skipped sin receta_id : {sin_receta}")
    print(f"  └─ Sin materia_prima_id (descartados): {sin_mat_prima}")
    print(f"  └─ Registros a insertar  : {len(registros_validos)}\n")

    registros = registros_validos
    if registros:
        print("[Fase 3] Insertando receta_ingredientes...")
        total = insertar_en_lotes("receta_ingredientes", registros)
        print(f"  └─ receta_ingredientes completado: {total} registros insertados.\n")
    else:
        print("  [WARN] No hay registros para insertar en receta_ingredientes.\n")


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("=" * 80)
    print("  MIGRACIÓN DE DATOS: ARBOL RECETAS + INGREDIENTES")
    print("=" * 80 + "\n")

    verificar_archivos()

    # ========= NUEVA VALIDACIÓN =========
    if not verificar_constraint_nivel_3():
        sys.exit(1)
    # ====================================

    # Fase 1: mapeos de tablas relacionadas
    mapeo_platos        = cargar_mapeo_platos()
    mapeo_materia_prima = cargar_mapeo_materia_prima()

    # Fase 2: arbol_recetas nivel por nivel
    codigo_a_id_recetas = migrar_arbol_recetas(mapeo_platos)

    # Fase 3: receta_ingredientes
    migrar_receta_ingredientes(codigo_a_id_recetas, mapeo_materia_prima)

    print("=" * 80)
    print("  MIGRACIÓN COMPLETADA")
    print("=" * 80)


if __name__ == "__main__":
    main()
