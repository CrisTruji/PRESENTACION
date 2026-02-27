// ========================================
// exportService.js — Exportación a Excel
// ========================================

import * as XLSX from 'xlsx';

export function exportToExcel(data, filename, sheetName = 'Hoja 1') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportMultipleSheets(sheets, filename) {
  const wb = XLSX.utils.book_new();
  for (const { data, name } of sheets) {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
