import pandas as pd
import requests
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import time
import os

# ============================================================================
# CONFIGURACIÓN - EDITA TUS CREDENCIALES AQUÍ
# ============================================================================

SUPABASE_URL = "https://ulboklgzjriatmaxzpsi.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsYm9rbGd6anJpYXRtYXh6cHNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc4NDE0MCwiZXhwIjoyMDc4MzYwMTQwfQ.5k7-_iRN-IHuDwQTo23vRAFKZxyIHuP6twjk0HiuF0c"

# ⚠️ IMPORTANTE: Reemplaza SUPABASE_KEY con tu service_role key completa
# La encuentras en: Supabase Dashboard > Settings > API > service_role key

# ============================================================================
# CONFIGURACIÓN DE RUTA DEL EXCEL
# ============================================================================

# Ruta relativa desde donde está este script
EXCEL_PATH = "productos_arbol1_limpio.xlsx"

# Si el Excel está en otra carpeta, ajusta la ruta:
# EXCEL_PATH = "../datos/productos_arbol1_limpio.xlsx"

# ============================================================================


class SupabaseMigrator:
    """Clase para manejar la migración a Supabase"""
    
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.key = key
        self.headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        self.productos_insertados = {}  # Mapeo codigo -> id
        
    def test_connection(self) -> bool:
        """Probar conexión a Supabase"""
        try:
            response = requests.get(
                f"{self.url}/rest/v1/arbol_materia_prima",
                headers=self.headers,
                params={'select': 'count', 'limit': 1}
            )
            if response.status_code == 200:
                print("✅ Conexión exitosa a Supabase")
                return True
            else:
                print(f"❌ Error de conexión: {response.status_code}")
                print(f"   Respuesta: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error de conexión: {e}")
            return False
    
    def limpiar_tabla(self) -> bool:
        """Limpiar tabla arbol_materia_prima (USAR CON CUIDADO)"""
        print("\n⚠️  ¿Estás seguro de que quieres ELIMINAR todos los datos existentes?")
        confirmacion = input("   Escribe 'SI CONFIRMO' para continuar: ")
        
        if confirmacion != "SI CONFIRMO":
            print("❌ Operación cancelada")
            return False
        
        try:
            # Eliminar todos los registros
            response = requests.delete(
                f"{self.url}/rest/v1/arbol_materia_prima",
                headers=self.headers,
                params={'id': 'gte.0'}  # Elimina todos
            )
            
            if response.status_code in [200, 204]:
                print("✅ Tabla limpiada exitosamente")
                return True
            else:
                print(f"❌ Error al limpiar tabla: {response.status_code}")
                print(f"   Respuesta: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def extraer_niveles(self, codigo: str) -> Dict[str, Optional[str]]:
        """
        Extrae los niveles de un código jerárquico
        Ejemplo: "1.1.01.02.003.01" → nivel_1="1", nivel_2="1.1", etc.
        """
        partes = codigo.split('.')
        
        niveles = {
            'nivel_1': None,
            'nivel_2': None,
            'nivel_3': None,
            'nivel_4': None,
            'nivel_5': None,
            'nivel_6': None
        }
        
        if len(partes) >= 1:
            niveles['nivel_1'] = partes[0]
        if len(partes) >= 2:
            niveles['nivel_2'] = f"{partes[0]}.{partes[1]}"
        if len(partes) >= 3:
            niveles['nivel_3'] = f"{partes[0]}.{partes[1]}.{partes[2]}"
        if len(partes) >= 4:
            niveles['nivel_4'] = f"{partes[0]}.{partes[1]}.{partes[2]}.{partes[3]}"
        if len(partes) >= 5:
            niveles['nivel_5'] = f"{partes[0]}.{partes[1]}.{partes[2]}.{partes[3]}.{partes[4]}"
        if len(partes) >= 6:
            niveles['nivel_6'] = codigo
        
        return niveles
    
    def preparar_registro(self, row: pd.Series, parent_id: Optional[int] = None) -> Dict:
        """Preparar un registro para inserción"""
        
        codigo = row['codigo_nuevo']
        niveles = self.extraer_niveles(codigo)
        nivel_actual = int(row['nivel_actual'])
        
        # Mapear tipo_nombre a tipo_rama (formato de la BD)
        tipo_map = {
            'produccion': 'produccion',
            'entregable': 'entregable',
            'desechable': 'desechable'
        }
        tipo_rama = tipo_map.get(row['tipo_nombre'], 'produccion')
        
        # Determinar si maneja stock (solo nivel 5)
        maneja_stock = (nivel_actual == 5)
        
        # Preparar datos básicos
        registro = {
            'codigo': codigo,
            'nombre': str(row['nombre']).strip().upper(),
            'descripcion': None,
            'nivel_1': niveles['nivel_1'],
            'nivel_2': niveles['nivel_2'],
            'nivel_3': niveles['nivel_3'],
            'nivel_4': niveles['nivel_4'],
            'nivel_5': niveles['nivel_5'],
            'nivel_6': niveles['nivel_6'],
            'nivel_actual': nivel_actual,
            'parent_id': parent_id,
            'tipo_rama': tipo_rama,
            'maneja_stock': maneja_stock,
            'stock_actual': 0.0 if maneja_stock else None,
            'unidad_stock': row['unidad_normalizada'] if maneja_stock else None,
            'stock_minimo': None,
            'stock_maximo': None,
            'activo': True
        }
        
        # Si es nivel 6 (presentación), agregar contenido
        if nivel_actual == 6:
            contenido = row['contenido_unidad']
            if pd.notna(contenido) and contenido > 0:
                registro['contenido_unidad'] = float(contenido)
                registro['unidad_contenido'] = row['unidad_normalizada']
        
        return registro
    
    def insertar_registro(self, registro: Dict) -> Optional[int]:
        """Insertar un registro y retornar su ID"""
        try:
            response = requests.post(
                f"{self.url}/rest/v1/arbol_materia_prima",
                headers=self.headers,
                json=registro
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    nuevo_id = data[0]['id']
                    self.productos_insertados[registro['codigo']] = nuevo_id
                    return nuevo_id
                else:
                    print(f"⚠️  Respuesta inesperada: {data}")
                    return None
            else:
                print(f"❌ Error al insertar {registro['codigo']}: {response.status_code}")
                print(f"   Respuesta: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Excepción al insertar {registro['codigo']}: {e}")
            return None
    
    def migrar_productos(self, df: pd.DataFrame) -> Tuple[int, int]:
        """
        Migrar productos desde DataFrame
        Retorna: (exitosos, fallidos)
        """
        # Filtrar solo productos bien clasificados
        df_ok = df[df['categoria_nivel3'] != 'OTROS'].copy()
        df_ok = df_ok[~df_ok['codigo_nuevo'].str.startswith('TEMP', na=False)].copy()
        
        print(f"\n📊 Total productos a migrar: {len(df_ok)}")
        
        # Separar por nivel
        nivel_5 = df_ok[df_ok['nivel_actual'] == 5].copy()
        nivel_6 = df_ok[df_ok['nivel_actual'] == 6].copy()
        
        print(f"   - Nivel 5 (productos base): {len(nivel_5)}")
        print(f"   - Nivel 6 (presentaciones): {len(nivel_6)}")
        
        exitosos = 0
        fallidos = 0
        
        # PASO 1: Insertar productos nivel 5
        print("\n" + "=" * 80)
        print("FASE 1: INSERTANDO PRODUCTOS BASE (NIVEL 5)")
        print("=" * 80)
        
        for idx, row in nivel_5.iterrows():
            registro = self.preparar_registro(row)
            
            if idx % 50 == 0:
                print(f"Progreso: {idx}/{len(nivel_5)} productos...")
            
            producto_id = self.insertar_registro(registro)
            
            if producto_id:
                exitosos += 1
            else:
                fallidos += 1
                print(f"❌ Falló: {registro['codigo']} - {registro['nombre']}")
        
        print(f"\n✅ Productos nivel 5 insertados: {exitosos}")
        print(f"❌ Productos nivel 5 fallidos: {fallidos}")
        
        # PASO 2: Insertar presentaciones nivel 6
        print("\n" + "=" * 80)
        print("FASE 2: INSERTANDO PRESENTACIONES (NIVEL 6)")
        print("=" * 80)
        
        exitosos_n6 = 0
        fallidos_n6 = 0
        
        for idx, row in nivel_6.iterrows():
            parent_code = row['parent_code']
            
            # Buscar ID del padre
            parent_id = self.productos_insertados.get(parent_code)
            
            if not parent_id:
                print(f"⚠️  Presentación sin padre: {row['codigo_nuevo']} (padre: {parent_code})")
                fallidos_n6 += 1
                continue
            
            registro = self.preparar_registro(row, parent_id=parent_id)
            
            if idx % 50 == 0:
                print(f"Progreso: {idx}/{len(nivel_6)} presentaciones...")
            
            producto_id = self.insertar_registro(registro)
            
            if producto_id:
                exitosos_n6 += 1
            else:
                fallidos_n6 += 1
                print(f"❌ Falló: {registro['codigo']} - {registro['nombre']}")
        
        print(f"\n✅ Presentaciones nivel 6 insertadas: {exitosos_n6}")
        print(f"❌ Presentaciones nivel 6 fallidas: {fallidos_n6}")
        
        return (exitosos + exitosos_n6, fallidos + fallidos_n6)


def main():
    """Función principal"""
    
    print("=" * 80)
    print("MIGRACIÓN DE ÁRBOL DE MATERIA PRIMA A SUPABASE")
    print("=" * 80)
    
    # Verificar que se configuraron las credenciales
    if SUPABASE_KEY == "tu_key_aqui" or "TU_" in SUPABASE_KEY:
        print("\n❌ ERROR: Debes configurar tu SUPABASE_KEY")
        print("   Edita la línea 14 del script con tu service_role key")
        print("   La encuentras en: Supabase > Settings > API")
        return
    
    # Inicializar migrador
    migrador = SupabaseMigrator(SUPABASE_URL, SUPABASE_KEY)
    
    # Probar conexión
    if not migrador.test_connection():
        print("\n❌ No se pudo conectar a Supabase. Verifica tus credenciales.")
        return
    
    # Obtener ruta del directorio actual
    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_path = os.path.join(script_dir, EXCEL_PATH)
    
    # Cargar datos
    print(f"\n📂 Cargando datos desde: {excel_path}")
    
    if not os.path.exists(excel_path):
        print(f"\n❌ ERROR: No se encontró el archivo Excel")
        print(f"   Buscado en: {excel_path}")
        print(f"\n💡 SOLUCIÓN:")
        print(f"   1. Verifica que 'productos_arbol1_limpio.xlsx' esté en la carpeta MIGRACIONES")
        print(f"   2. O edita la línea 19 del script con la ruta correcta")
        return
    
    try:
        df = pd.read_excel(excel_path, sheet_name='Todos')
        print(f"✅ Datos cargados: {len(df)} productos")
    except Exception as e:
        print(f"❌ Error al cargar Excel: {e}")
        return
    
    # Opción de limpiar tabla
    print("\n⚠️  OPCIONES:")
    print("   1. Migrar SIN limpiar tabla (agregar a datos existentes)")
    print("   2. LIMPIAR tabla y migrar desde cero (RECOMENDADO para primera vez)")
    
    opcion = input("\n¿Qué deseas hacer? (1/2): ").strip()
    
    if opcion == "2":
        if not migrador.limpiar_tabla():
            return
    elif opcion != "1":
        print("❌ Opción inválida")
        return
    
    # Confirmar migración
    print("\n🚀 ¿Iniciar migración?")
    confirmacion = input("   Escribe 'SI' para continuar: ")
    
    if confirmacion.upper() != "SI":
        print("❌ Migración cancelada")
        return
    
    # Ejecutar migración
    inicio = time.time()
    exitosos, fallidos = migrador.migrar_productos(df)
    fin = time.time()
    
    # Resumen final
    print("\n" + "=" * 80)
    print("RESUMEN DE MIGRACIÓN")
    print("=" * 80)
    print(f"✅ Productos insertados exitosamente: {exitosos}")
    print(f"❌ Productos fallidos: {fallidos}")
    print(f"⏱️  Tiempo total: {fin - inicio:.2f} segundos")
    if (exitosos + fallidos) > 0:
        print(f"🎯 Tasa de éxito: {(exitosos / (exitosos + fallidos) * 100):.1f}%")
    
    print("\n✅ MIGRACIÓN COMPLETADA")


if __name__ == "__main__":
    main()