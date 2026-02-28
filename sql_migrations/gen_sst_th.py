import pandas as pd
import os
import re

path = r"C:\Users\crist\Downloads\modulo_nomina\EMPLEADOS_HEALTHY_INTEGRADO.xlsx"
output_dir = r"C:\PRESENTACION\sql_migrations"

# Read SST_TALENTO_HUMANO sheet using openpyxl to handle encoding
df = pd.read_excel(path, sheet_name='SST_TALENTO_HUMANO', header=1, dtype=str, engine='openpyxl')

# Column indices (0-based, based on sheet structure)
# 0:CEDULA, 1:NOMBRES, 2:EPS, 3:AFP, 4:CAJA COMP, 5:ARL
# 6:FECHA EXAMEN, 7:ESTADO EXAMEN, 8:OBS EXAMEN
# 9:FECHA CURSO MANIP, 10:ESTADO CURSO MANIP, 11:FECHA INDUCCION
# 12:COVID, 13:COVID DOSIS, 14:HEPATITIS A, 15:TETANO, 16:TALLAS

cols = df.columns.tolist()
print(f"Total cols: {len(cols)}")
for i, c in enumerate(cols):
    print(f"  [{i}]: {repr(c)}")

def clean(val):
    """Return None if empty/nan, else stripped string"""
    if val is None:
        return None
    s = str(val).strip()
    if s in ('', 'nan', 'NaT', 'None'):
        return None
    return s

def sql_str(val):
    """SQL string or NULL"""
    v = clean(val)
    if v is None:
        return 'NULL'
    v = v.replace("'", "''")
    return f"'{v}'"

def sql_bool(val):
    """Convert SI/X/1/2/3/NO/empty to boolean SQL"""
    v = clean(val)
    if v is None:
        return 'NULL'
    v_upper = v.upper()
    if v_upper in ('SI', 'S', 'X', 'TRUE', '1', '2', '3', '4', '5'):
        # Check if it's a number (covid dosis)
        if v_upper not in ('SI', 'S', 'X', 'TRUE'):
            try:
                int(v)
                return 'true'  # it's a dose count, so covid = true
            except:
                pass
        return 'true'
    if v_upper in ('NO', 'N', 'FALSE', '0'):
        return 'false'
    # Clothing sizes (M, L, XL, S) or other unknown → NULL
    return 'NULL'

def sql_int(val):
    """Convert to integer SQL or NULL"""
    v = clean(val)
    if v is None:
        return 'NULL'
    # Remove non-numeric chars
    digits = re.sub(r'[^\d]', '', v)
    if digits:
        return digits
    return 'NULL'

def sql_date(val):
    """Convert date string to SQL date or NULL"""
    v = clean(val)
    if v is None:
        return 'NULL'
    # Extract YYYY-MM-DD part
    m = re.search(r'(\d{4}-\d{2}-\d{2})', v)
    if m:
        return f"'{m.group(1)}'"
    return 'NULL'

def bool_from_date(val):
    """Return true if date present, false/NULL otherwise"""
    v = clean(val)
    if v is None:
        return 'NULL'
    m = re.search(r'\d{4}-\d{2}-\d{2}', v)
    return 'true' if m else 'NULL'

def split_tallas(val):
    """Split 'camisa / pantalon / zapatos' into 3 parts"""
    v = clean(val)
    if v is None:
        return 'NULL', 'NULL', 'NULL'
    parts = [p.strip() for p in v.split('/')]
    def part_or_null(p):
        if not p or p.lower() in ('nan', 'none', ''):
            return 'NULL'
        return f"'{p.replace(chr(39), chr(39)*2)}'"
    while len(parts) < 3:
        parts.append('')
    return part_or_null(parts[0]), part_or_null(parts[1]), part_or_null(parts[2])

# Generate SQL for empleados_talento_humano
th_lines = []
sst_lines = []

for _, row in df.iterrows():
    cedula = clean(row.iloc[0])
    if not cedula:
        continue
    
    # Skip header rows or invalid cedulas
    if not re.match(r'^\d+$', cedula.replace(' ', '')):
        continue
    cedula = cedula.replace(' ', '')
    
    eps = sql_str(row.iloc[2] if len(row) > 2 else None)
    afp = sql_str(row.iloc[3] if len(row) > 3 else None)
    caja = sql_str(row.iloc[4] if len(row) > 4 else None)
    arl = sql_str(row.iloc[5] if len(row) > 5 else None)
    
    fecha_examen = sql_date(row.iloc[6] if len(row) > 6 else None)
    estado_examen = sql_str(row.iloc[7] if len(row) > 7 else None)
    obs_examen = sql_str(row.iloc[8] if len(row) > 8 else None)
    
    fecha_curso = row.iloc[9] if len(row) > 9 else None
    curso_manip = bool_from_date(fecha_curso)
    obs_cma = sql_str(row.iloc[10] if len(row) > 10 else None)
    
    fecha_ind = row.iloc[11] if len(row) > 11 else None
    induccion = bool_from_date(fecha_ind)
    
    covid_raw = clean(row.iloc[12] if len(row) > 12 else None)
    covid = sql_bool(covid_raw)
    covid_dosis = sql_int(row.iloc[13] if len(row) > 13 else None)
    
    hepatitis_a = sql_bool(row.iloc[14] if len(row) > 14 else None)
    tetano_raw = clean(row.iloc[15] if len(row) > 15 else None)
    # Only treat as boolean if it's SI/NO/X, not clothing sizes
    tetano = 'NULL'
    if tetano_raw:
        if tetano_raw.upper() in ('SI', 'S', 'X'):
            tetano = 'true'
        elif tetano_raw.upper() in ('NO', 'N'):
            tetano = 'false'
    
    tallas_raw = row.iloc[16] if len(row) > 16 else None
    tc, tp, tz = split_tallas(tallas_raw)
    
    # examenes_medicos = true if fecha_examen present
    examen_bool = 'true' if fecha_examen != 'NULL' else 'NULL'
    
    # empleados_talento_humano INSERT
    th_lines.append(
        f"  (SELECT id FROM empleados WHERE documento_identidad = '{cedula}' LIMIT 1), "
        f"{eps}, {afp}, {tc}, {tp}, {tz}"
    )
    
    # empleados_sst INSERT
    sst_lines.append(
        f"  (SELECT id FROM empleados WHERE documento_identidad = '{cedula}' LIMIT 1), "
        f"{examen_bool}, {fecha_examen}, {estado_examen}, {obs_examen}, "
        f"{curso_manip}, {obs_cma}, {induccion}, NULL, "  # reinduccion=NULL
        f"{covid}, {covid_dosis}, {hepatitis_a}, {tetano}, "
        f"{arl}, {caja}, NULL"  # observaciones=NULL
    )

# Write TH SQL in batches of 50
BATCH = 50
th_batches = [th_lines[i:i+BATCH] for i in range(0, len(th_lines), BATCH)]
for i, batch in enumerate(th_batches, 1):
    fname = os.path.join(output_dir, f'import_th_{i:02d}.sql')
    with open(fname, 'w', encoding='utf-8') as f:
        f.write("INSERT INTO empleados_talento_humano (empleado_id, eps, afp, talla_camisa, talla_pantalon, talla_zapatos) VALUES\n")
        f.write(",\n".join(f"({line})" for line in batch))
        f.write("\nON CONFLICT (empleado_id) DO UPDATE SET eps=EXCLUDED.eps, afp=EXCLUDED.afp, talla_camisa=EXCLUDED.talla_camisa, talla_pantalon=EXCLUDED.talla_pantalon, talla_zapatos=EXCLUDED.talla_zapatos;\n")
    print(f"Written {fname} ({len(batch)} rows)")

# Write SST SQL in batches of 50
sst_batches = [sst_lines[i:i+BATCH] for i in range(0, len(sst_lines), BATCH)]
for i, batch in enumerate(sst_batches, 1):
    fname = os.path.join(output_dir, f'import_sst_{i:02d}.sql')
    with open(fname, 'w', encoding='utf-8') as f:
        f.write("INSERT INTO empleados_sst (empleado_id, examenes_medicos, fecha_examen, estado_examen, observaciones_em, curso_manipulacion, observaciones_cma, induccion, reinduccion, covid, covid_dosis, hepatitis_a, tetano, arl, caja_compensacion, observaciones) VALUES\n")
        f.write(",\n".join(f"({line})" for line in batch))
        f.write("\nON CONFLICT (empleado_id) DO UPDATE SET arl=EXCLUDED.arl, caja_compensacion=EXCLUDED.caja_compensacion, fecha_examen=EXCLUDED.fecha_examen, estado_examen=EXCLUDED.estado_examen;\n")
    print(f"Written {fname} ({len(batch)} rows)")

print(f"\nDone! {len(th_lines)} TH rows, {len(sst_lines)} SST rows")
