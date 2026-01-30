"""
Script de migración: 1_ARBOL_RECETAS_FINAL.xlsx -> tabla arbol_recetas
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

def migrar_arbol_recetas():
    """Migra datos desde Excel a Supabase"""
    print("=" * 60)
    print("MIGRACIÓN: ARBOL DE RECETAS")
    print("=" * 60)

    # 1. Leer archivo Excel
    print("\n[1/5] Leyendo archivo Excel...")
    try:
        df = pd.read_excel('1_ARBOL_RECETAS_FINAL.xlsx')
        print(f"   Registros leídos: {len(df)}")
    except Exception as e:
        print(f"   ERROR al leer Excel: {e}")
        return

    # 2. Cargar mapa de platos
    print("\n[2/5] Cargando mapa de platos...")
    platos = obtener_todos_registros('arbol_platos')
    plato_codigo_to_id = {p['codigo']: p['id'] for p in platos}
    print(f"   Platos cargados: {len(plato_codigo_to_id)}")

    # 3. Preparar datos para inserción
    print("\n[3/5] Preparando datos...")
    registros = []
    codigo_map = {}

    for idx, row in df.iterrows():
        try:
            codigo = str(row['codigo']).strip()
            plato_code = limpiar_valor(row.get('plato_code_ref'))
            plato_id = plato_codigo_to_id.get(plato_code) if plato_code else None

            registro = {
                'codigo': codigo,
                'nombre': str(row['nombre']).strip() if pd.notna(row['nombre']) else '',
                'descripcion': limpiar_valor(row.get('descripcion')),
                'plato_id': plato_id,
                'nivel_actual': limpiar_numero(row['nivel_actual']),
                'parent_id': None,  # Se actualizará después
                'codigo_unidad': None,  # No usar FK por ahora
                'rendimiento': limpiar_numero(row.get('rendimiento')) or 1,
                'costo_calculado': None,
                'tiempo_preparacion': limpiar_numero(row.get('tiempo_preparacion')),
                'instrucciones': limpiar_valor(row.get('instrucciones')),
                'version': limpiar_numero(row.get('version')) or 1,
                'cambios_pendientes': bool(row.get('cambios_pendientes', False)) if pd.notna(row.get('cambios_pendientes')) else False,
                'activo': bool(row.get('activo', True)) if pd.notna(row.get('activo')) else True
            }

            # Validar campos requeridos
            if not registro['codigo'] or not registro['nivel_actual']:
                print(f"   SKIP fila {idx + 2}: código o nivel_actual vacío")
                continue

            # Guardar parent_code para después
            parent_code = limpiar_valor(row.get('parent_code_ref'))
            codigo_map[codigo] = {'registro': registro, 'parent_code': parent_code}
            registros.append(registro)

        except Exception as e:
            print(f"   ERROR fila {idx + 2}: {str(e)}")

    print(f"   Registros preparados: {len(registros)}")

    # 4. Insertar en lotes
    print("\n[4/5] Insertando datos en Supabase...")
    BATCH_SIZE = 50
    total_insertados = 0

    for i in range(0, len(registros), BATCH_SIZE):
        batch = registros[i:i + BATCH_SIZE]
        try:
            response = supabase.table('arbol_recetas').insert(batch).execute()
            total_insertados += len(batch)
            progreso = (i + len(batch)) / len(registros) * 100
            print(f"   Progreso: {progreso:.1f}% ({total_insertados}/{len(registros)})")
        except Exception as e:
            print(f"   ERROR en lote {i // BATCH_SIZE + 1}: {e}")
            # Intentar uno por uno
            for reg in batch:
                try:
                    supabase.table('arbol_recetas').insert(reg).execute()
                    total_insertados += 1
                except Exception as e2:
                    print(f"      Error en {reg['codigo']}: {e2}")

        time.sleep(0.1)

    # 5. Actualizar parent_id
    print("\n[5/5] Actualizando referencias parent_id...")
    try:
        # Obtener todos los registros insertados
        all_records = obtener_todos_registros('arbol_recetas')
        codigo_to_id = {r['codigo']: r['id'] for r in all_records}
        print(f"   Registros en BD: {len(codigo_to_id)}")

        # Actualizar parent_id
        updated = 0
        for codigo, data in codigo_map.items():
            parent_code = data['parent_code']
            if parent_code and parent_code in codigo_to_id and codigo in codigo_to_id:
                parent_id = codigo_to_id[parent_code]
                try:
                    supabase.table('arbol_recetas').update({
                        'parent_id': parent_id
                    }).eq('codigo', codigo).execute()
                    updated += 1
                except:
                    pass

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
    migrar_arbol_recetas()
