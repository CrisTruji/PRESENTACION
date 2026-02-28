import pandas as pd
import os
import math

path = r"C:\Users\crist\Downloads\modulo_nomina\EMPLEADOS_HEALTHY_INTEGRADO.xlsx"
output_dir = r"C:\PRESENTACION\sql_migrations"
os.makedirs(output_dir, exist_ok=True)

# Read the SST_TALENTO_HUMANO sheet (headers on row 1, index=1)
df = pd.read_excel(path, sheet_name='SST_TALENTO_HUMANO', header=1, dtype=str)

# Print columns to understand structure
print("Columns:", list(df.columns))
print("Shape:", df.shape)
print("\nFirst 3 rows sample:")
print(df.head(3).to_string())
print("\nUnique values in key boolean columns:")
for col_idx in range(min(17, len(df.columns))):
    col = df.columns[col_idx]
    vals = df[col].dropna().unique()[:10]
    print(f"  Col[{col_idx}] '{col}': {vals}")
