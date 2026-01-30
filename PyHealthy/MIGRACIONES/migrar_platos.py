"""
Script de migración: ARBOL_PLATOS_FINAL.xlsx -> tabla arbol_platos
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

def migrar_arbol_platos():
    """Migra datos desde Excel a Supabase"""
    print("=" * 60)
    print("MIGRACIÓN: ARBOL DE PLATOS")
    print("=" * 60)

    # 1. Leer archivo Excel
    print("\n[1/4] Leyendo archivo Excel...")
    try:
        df = pd.read_excel('ARBOL_PLATOS_FINAL.xlsx')
        print(f"   Registros leídos: {len(df)}")
    except Exception as e:
        print(f"   ERROR al leer Excel: {e}")
        return

    # 2. Preparar datos para inserción (sin parent_id primero)
    print("\n[2/4] Preparando datos...")
    registros = []
    codigo_map = {}  # Para guardar código -> datos

    for idx, row in df.iterrows():
        try:
            codigo = str(row['codigo']).strip()

            registro = {
                'codigo': codigo,
                'nombre': str(row['nombre']).strip() if pd.notna(row['nombre']) else '',
                'descripcion': limpiar_valor(row.get('descripcion')),
                'nivel_1': limpiar_valor(row.get('nivel_1')),
                'nivel_2': limpiar_valor(row.get('nivel_2')),
                'nivel_3': limpiar_valor(row.get('nivel_3')),
                'nivel_4': limpiar_valor(row.get('nivel_4')),
                'nivel_5': limpiar_valor(row.get('nivel_5')),
                'nivel_actual': limpiar_numero(row['nivel_actual']),
                'es_hoja': bool(row.get('es_hoja', False)) if pd.notna(row.get('es_hoja')) else False,
                'activo': bool(row.get('activo', True)) if pd.notna(row.get('activo')) else True,
                'parent_id': None  # Se actualizará después
            }

            # Validar campos requeridos
            if not registro['codigo'] or not registro['nivel_actual']:
                print(f"   SKIP fila {idx + 2}: código o nivel_actual vacío")
                continue

            # Guardar parent_code para después
            parent_code = limpiar_valor(row.get('parent_code'))
            codigo_map[codigo] = {'registro': registro, 'parent_code': parent_code}
            registros.append(registro)

        except Exception as e:
            print(f"   ERROR fila {idx + 2}: {str(e)}")

    print(f"   Registros preparados: {len(registros)}")

    # 3. Insertar en lotes (sin parent_id)
    print("\n[3/4] Insertando datos en Supabase...")
    BATCH_SIZE = 50
    total_insertados = 0

    for i in range(0, len(registros), BATCH_SIZE):
        batch = registros[i:i + BATCH_SIZE]
        try:
            response = supabase.table('arbol_platos').insert(batch).execute()
            total_insertados += len(batch)
            progreso = (i + len(batch)) / len(registros) * 100
            print(f"   Progreso: {progreso:.1f}% ({total_insertados}/{len(registros)})")
        except Exception as e:
            print(f"   ERROR en lote {i // BATCH_SIZE + 1}: {e}")
            # Intentar uno por uno
            for reg in batch:
                try:
                    supabase.table('arbol_platos').insert(reg).execute()
                    total_insertados += 1
                except Exception as e2:
                    print(f"      Error en {reg['codigo']}: {e2}")

        time.sleep(0.1)

    # 4. Actualizar parent_id
    print("\n[4/4] Actualizando referencias parent_id...")
    try:
        # Obtener todos los registros insertados
        all_records = supabase.table('arbol_platos').select('id, codigo').execute()
        codigo_to_id = {r['codigo']: r['id'] for r in all_records.data}
        print(f"   Registros en BD: {len(codigo_to_id)}")

        # Actualizar parent_id
        updated = 0
        for codigo, data in codigo_map.items():
            parent_code = data['parent_code']
            if parent_code and parent_code in codigo_to_id:
                parent_id = codigo_to_id[parent_code]
                if codigo in codigo_to_id:
                    supabase.table('arbol_platos').update({
                        'parent_id': parent_id
                    }).eq('codigo', codigo).execute()
                    updated += 1

        print(f"   Referencias actualizadas: {updated}")
    except Exception as e:
        print(f"   Error actualizando parent_id: {e}")

    # Resumen
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    print(f"Total registros Excel: {len(df)}")
    print(f"Registros insertados: {total_insertados}")
    print("=" * 60)


if __name__ == '__main__':
    migrar_arbol_platos()
