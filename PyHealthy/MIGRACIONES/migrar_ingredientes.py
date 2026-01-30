"""
Script de migración: 2_RECETA_INGREDIENTES_FINAL.xlsx -> tabla receta_ingredientes
Adaptado a la estructura real de la tabla en Supabase
"""

import pandas as pd
import numpy as np
from supabase import create_client, Client
import time

# Configuración de Supabase
SUPABASE_URL = "https://ulboklgzjriatmaxzpsi.supabase.co"
SUPABASE_KEY = "sb_secret_R-yFmIRlPNITmp86n5Ix-g_4Tvf3qAk"

# Crear cliente
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def limpiar_valor(valor):
    """Limpia valores NaN"""
    if pd.isna(valor) or valor == '' or valor is None:
        return None
    return str(valor).strip()

def limpiar_numero(valor):
    """Convierte a entero o None"""
    if pd.isna(valor) or valor == '' or valor is None:
        return None
    try:
        return int(float(valor))
    except:
        return None

def limpiar_decimal(valor):
    """Convierte a decimal o None"""
    if pd.isna(valor) or valor == '' or valor is None:
        return None
    try:
        return float(valor)
    except:
        return None

def obtener_todos_registros(tabla, campos='id, codigo'):
    """Obtiene todos los registros de una tabla (sin límite de 1000)"""
    all_records = []
    offset = 0
    while True:
        response = supabase.table(tabla).select(campos).range(offset, offset + 999).execute()
        if not response.data:
            break
        all_records.extend(response.data)
        offset += 1000
    return all_records

def migrar_ingredientes():
    """Migra datos desde Excel a Supabase"""
    print("=" * 60)
    print("MIGRACIÓN: INGREDIENTES DE RECETAS")
    print("=" * 60)

    # 1. Leer archivo Excel
    print("\n[1/4] Leyendo archivo Excel...")
    try:
        df = pd.read_excel('2_RECETA_INGREDIENTES_FINAL.xlsx')
        print(f"   Registros leídos: {len(df)}")
    except Exception as e:
        print(f"   ERROR al leer Excel: {e}")
        return

    # 2. Cargar mapas de referencias
    print("\n[2/4] Cargando mapas de referencias...")

    # Mapa de recetas
    recetas = obtener_todos_registros('arbol_recetas')
    receta_codigo_to_id = {r['codigo']: r['id'] for r in recetas}
    print(f"   Recetas cargadas: {len(receta_codigo_to_id)}")

    # Mapa de materia prima
    mp = obtener_todos_registros('arbol_materia_prima')
    mp_codigo_to_id = {m['codigo']: m['id'] for m in mp}
    print(f"   Materia prima cargada: {len(mp_codigo_to_id)}")

    # 3. Preparar datos para inserción
    print("\n[3/4] Preparando datos...")
    registros = []
    sin_receta = 0
    sin_mp = 0

    for idx, row in df.iterrows():
        try:
            receta_code = limpiar_valor(row.get('receta_code_ref'))
            mp_code = limpiar_valor(row.get('materia_prima_code_ref'))

            receta_id = receta_codigo_to_id.get(receta_code) if receta_code else None
            mp_id = mp_codigo_to_id.get(mp_code) if mp_code else None

            if not receta_id:
                sin_receta += 1
                continue  # Saltar si no hay receta

            if not mp_id:
                sin_mp += 1
                continue  # Saltar si no hay materia prima

            registro = {
                'receta_id': receta_id,
                'materia_prima_id': mp_id,
                'cantidad_requerida': limpiar_decimal(row.get('cantidad_requerida')) or 0,
                'unidad_medida': str(row.get('unidad_medida', 'UN')).strip().upper() if pd.notna(row.get('unidad_medida')) else 'UN',
                'costo_unitario': limpiar_decimal(row.get('costo_unitario')),
                'subtotal': limpiar_decimal(row.get('subtotal')),
                'orden': limpiar_numero(row.get('orden')) or 0
            }

            registros.append(registro)

        except Exception as e:
            print(f"   ERROR fila {idx + 2}: {str(e)}")

    print(f"   Registros preparados: {len(registros)}")
    print(f"   Sin referencia a receta: {sin_receta}")
    print(f"   Sin referencia a materia prima: {sin_mp}")

    # 4. Insertar en lotes
    print("\n[4/4] Insertando datos en Supabase...")
    BATCH_SIZE = 50
    total_insertados = 0
    errores = 0

    for i in range(0, len(registros), BATCH_SIZE):
        batch = registros[i:i + BATCH_SIZE]
        try:
            response = supabase.table('receta_ingredientes').insert(batch).execute()
            total_insertados += len(batch)
            progreso = (i + len(batch)) / len(registros) * 100
            print(f"   Progreso: {progreso:.1f}% ({total_insertados}/{len(registros)})")
        except Exception as e:
            print(f"   ERROR en lote {i // BATCH_SIZE + 1}: {e}")
            # Intentar uno por uno
            for reg in batch:
                try:
                    supabase.table('receta_ingredientes').insert(reg).execute()
                    total_insertados += 1
                except Exception as e2:
                    errores += 1
                    if errores <= 5:
                        print(f"      Error: {e2}")

        time.sleep(0.1)

    # Resumen
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"Total registros Excel: {len(df)}")
    print(f"Registros preparados: {len(registros)}")
    print(f"Registros insertados: {total_insertados}")
    print(f"Sin referencia a receta: {sin_receta}")
    print(f"Sin referencia a materia prima: {sin_mp}")
    print("=" * 60)


if __name__ == '__main__':
    migrar_ingredientes()
