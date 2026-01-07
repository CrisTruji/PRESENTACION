"""
Script de prueba para verificar descarga de PDFs desde Supabase
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from pathlib import Path
import requests
from supabase import create_client, Client

# Configuración
TEMP_PDF_DIR = Path("PDF_Descargados")
TEMP_PDF_DIR.mkdir(exist_ok=True)

SUPABASE_URL = "https://ulboklgzjriatmaxzpsi.supabase.co"
SUPABASE_KEY = "sb_secret_R-yFmIRlPNITmp86n5Ix-g_4Tvf3qAk"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def descargar_pdf_desde_supabase(pdf_url, factura_id):
    """Descarga un PDF desde Supabase Storage"""
    try:
        print(f"\n[DESCARGA] PDF de factura {factura_id}...")
        print(f"   URL: {pdf_url[:80]}...")

        response = requests.get(pdf_url, timeout=30)
        response.raise_for_status()

        # Crear la ruta completa del archivo
        pdf_path = TEMP_PDF_DIR / f"factura_{factura_id}.pdf"

        # Escribir el contenido del PDF
        with open(pdf_path, 'wb') as f:
            f.write(response.content)

        # Verificar que el archivo fue creado
        if pdf_path.exists():
            tamaño = pdf_path.stat().st_size
            print(f"[OK] PDF descargado exitosamente: {pdf_path}")
            print(f"   Tamaño: {tamaño:,} bytes")
        else:
            raise Exception("El archivo no se creó en el disco")

        return str(pdf_path.absolute())

    except Exception as e:
        print(f"[ERROR] Error al descargar PDF: {e}")
        raise

# Prueba principal
print("="*60)
print("PRUEBA DE DESCARGA DE PDFs DESDE SUPABASE")
print("="*60)

try:
    # Obtener una factura de prueba con PDF
    response = supabase.table('facturas') \
        .select('id, numero_factura, pdf_url') \
        .not_.is_('pdf_url', 'null') \
        .limit(1) \
        .execute()

    if response.data:
        factura = response.data[0]
        print(f"\n[INFO] Factura encontrada:")
        print(f"   ID: {factura['id']}")
        print(f"   Numero: {factura['numero_factura']}")
        print(f"   PDF URL: {factura['pdf_url'][:80]}...")

        # Intentar descargar
        pdf_path = descargar_pdf_desde_supabase(factura['pdf_url'], factura['id'])

        print(f"\n[EXITO] PDF conservado en: {pdf_path}")
        print("\n" + "="*60)
        print("RESULTADO: PRUEBA EXITOSA")
        print("="*60)

    else:
        print("\n[ADVERTENCIA] No se encontraron facturas con PDF en Supabase")
        print("   Por favor, asegurate de tener al menos una factura con pdf_url")

except Exception as e:
    print(f"\n[ERROR] Error en la prueba: {e}")
    import traceback
    traceback.print_exc()

# Listar archivos descargados
print(f"\n[INFO] Archivos en {TEMP_PDF_DIR}:")
for archivo in sorted(TEMP_PDF_DIR.glob("factura_*.pdf")):
    tamaño = archivo.stat().st_size
    print(f"   - {archivo.name} ({tamaño:,} bytes)")
