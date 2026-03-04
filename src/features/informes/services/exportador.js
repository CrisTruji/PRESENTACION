// ============================================================
// exportador.js
// Genera archivos Excel y PDF a partir de filas planas.
// Usa ExcelJS (para Excel) y jsPDF (para PDF).
// Ambas librerías ya están instaladas en el proyecto.
// ============================================================

// ── Excel con ExcelJS ────────────────────────────────────

export async function exportarExcel(filas, nombreArchivo, titulo) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Healthy Catering';
  wb.created  = new Date();

  const ws = wb.addWorksheet('Informe', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  if (!filas || filas.length === 0) {
    ws.addRow(['Sin datos para el período seleccionado']);
    const buf = await wb.xlsx.writeBuffer();
    descargarBuffer(buf, nombreArchivo + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return;
  }

  const columnas = Object.keys(filas[0]);

  // ── Fila de título ──────────────────────────────────────
  ws.mergeCells(1, 1, 1, columnas.length);
  const celdaTitulo = ws.getCell('A1');
  celdaTitulo.value = titulo;
  celdaTitulo.font  = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  celdaTitulo.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
  celdaTitulo.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // Fila de fecha de generación
  ws.mergeCells(2, 1, 2, columnas.length);
  const celdaFecha = ws.getCell('A2');
  celdaFecha.value = `Generado: ${new Date().toLocaleString('es-CO')}  |  Total registros: ${filas.length}`;
  celdaFecha.font  = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
  celdaFecha.alignment = { horizontal: 'right' };

  // ── Encabezados ─────────────────────────────────────────
  const filaEncabezado = ws.addRow(columnas);
  filaEncabezado.eachCell(celda => {
    celda.font  = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    celda.border = {
      bottom: { style: 'thin', color: { argb: 'FF0D9488' } },
    };
  });
  ws.getRow(3).height = 22;

  // ── Datos ───────────────────────────────────────────────
  const colorImpar = 'FFF8FAFC';
  const colorPar   = 'FFE2E8F0';

  filas.forEach((fila, idx) => {
    const valores = columnas.map(c => fila[c] ?? '');
    const r = ws.addRow(valores);
    r.eachCell(celda => {
      celda.font      = { name: 'Calibri', size: 9 };
      celda.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? colorImpar : colorPar } };
      celda.alignment = { vertical: 'middle', wrapText: false };
      celda.border    = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } };
    });
    r.height = 16;
  });

  // ── Ancho de columnas automático ────────────────────────
  columnas.forEach((col, i) => {
    const maxLen = Math.max(
      col.length,
      ...filas.map(f => String(f[col] ?? '').length)
    );
    ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 10), 40);
  });

  // ── Descarga ────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  descargarBuffer(buffer, nombreArchivo + '.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// ── PDF con jsPDF ────────────────────────────────────────

export async function exportarPDF(filas, nombreArchivo, titulo) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Paleta de colores coherente con el design system
  const PRIMARY   = [13, 148, 136];   // #0D9488 teal
  const DARK      = [30, 41, 59];     // #1E293B slate-800
  const LIGHT_ROW = [248, 250, 252];  // #F8FAFC
  const ALT_ROW   = [226, 232, 240];  // #E2E8F0

  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;

  // ── Cabecera del documento ──────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, 14, 11);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const fechaGen = `Generado: ${new Date().toLocaleString('es-CO')}  |  Registros: ${filas.length}`;
  doc.text(fechaGen, pageW - 14, 11, { align: 'right' });

  y = 24;

  if (!filas || filas.length === 0) {
    doc.setTextColor(...DARK);
    doc.setFontSize(10);
    doc.text('Sin datos para el período seleccionado.', 14, y);
    descargarBlob(doc.output('blob'), nombreArchivo + '.pdf', 'application/pdf');
    return;
  }

  const columnas = Object.keys(filas[0]);

  // Dividir en grupos de columnas si hay más de 12 (evitar desbordamiento horizontal)
  const COLS_POR_PAGINA = 12;
  const grupos = [];
  for (let i = 0; i < columnas.length; i += COLS_POR_PAGINA) {
    grupos.push(columnas.slice(i, i + COLS_POR_PAGINA));
  }

  grupos.forEach((grupo, gi) => {
    if (gi > 0) {
      doc.addPage();
      // Mini-cabecera en páginas adicionales
      doc.setFillColor(...PRIMARY);
      doc.rect(0, 0, pageW, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${titulo} (cont. ${gi + 1}/${grupos.length})`, 14, 8);
      y = 16;
    }

    const head = [grupo];
    const body = filas.map(f => grupo.map(c => String(f[c] ?? '')));

    autoTable(doc, {
      startY: y,
      head,
      body,
      styles: {
        fontSize: 7,
        cellPadding: 2,
        font: 'helvetica',
        overflow: 'linebreak',
        valign: 'middle',
      },
      headStyles: {
        fillColor: DARK,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: ALT_ROW,
      },
      bodyStyles: {
        fillColor: LIGHT_ROW,
        textColor: DARK,
      },
      columnStyles: {},
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => {
        // Pie de página
        const pNum = doc.internal.getCurrentPageInfo().pageNumber;
        const pTot = doc.internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Página ${pNum} de ${pTot}  —  Healthy Servicios de Catering`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 6,
          { align: 'center' }
        );
      },
    });

    y = doc.lastAutoTable.finalY + 6;
  });

  descargarBlob(doc.output('blob'), nombreArchivo + '.pdf', 'application/pdf');
}

// ── Helpers de descarga ──────────────────────────────────

function descargarBuffer(buffer, nombre, mime) {
  const blob = new Blob([buffer], { type: mime });
  descargarBlob(blob, nombre, mime);
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
