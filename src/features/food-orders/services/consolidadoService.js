// ========================================
// CONSOLIDADO SERVICE
// Consolidacion de pedidos + vistas + stock
// ========================================

import { supabase } from '@/shared/api';

export const consolidadoService = {

  // ========================================
  // CONSOLIDAR
  // ========================================

  async consolidar(fecha, servicio, forzar = false) {
    const { data, error } = await supabase
      .rpc('consolidar_pedidos_servicio', {
        p_fecha: fecha,
        p_servicio: servicio,
        p_forzar: forzar,
      });

    return { data, error };
  },

  // ========================================
  // LECTURA
  // ========================================

  async getConsolidadoPorFecha(fecha, servicio) {
    const { data, error } = await supabase
      .from('consolidados_produccion')
      .select(`
        *,
        consolidado_items (
          *,
          arbol_recetas (id, codigo, nombre, costo_porcion, rendimiento),
          componentes_plato (codigo, nombre)
        )
      `)
      .eq('fecha', fecha)
      .eq('servicio', servicio)
      .maybeSingle();

    return { data, error };
  },

  async getConsolidado(consolidadoId) {
    const { data, error } = await supabase
      .from('consolidados_produccion')
      .select(`
        *,
        consolidado_items (
          *,
          arbol_recetas (id, codigo, nombre, costo_porcion, rendimiento),
          componentes_plato (codigo, nombre)
        )
      `)
      .eq('id', consolidadoId)
      .single();

    return { data, error };
  },

  // ========================================
  // VISTAS
  // ========================================

  async getVistaRecetas(consolidadoId) {
    const { data, error } = await supabase
      .from('consolidado_items')
      .select(`
        *,
        arbol_recetas (
          id, codigo, nombre, costo_porcion, rendimiento,
          receta_ingredientes (
            id, cantidad_requerida, unidad_medida,
            arbol_materia_prima (id, nombre, codigo, costo_promedio, unidad_stock)
          )
        ),
        componentes_plato (codigo, nombre, orden),
        menu_componentes (
          id,
          gramajes_componente_menu (
            gramaje, unidad_medida, excluir,
            tipos_dieta (id, codigo, nombre)
          )
        )
      `)
      .eq('consolidado_id', consolidadoId)
      .order('created_at', { ascending: true });

    // Sort in JS by componente orden
    if (data) {
      data.sort((a, b) => {
        const oa = a.componentes_plato?.orden ?? 99;
        const ob = b.componentes_plato?.orden ?? 99;
        return oa - ob;
      });
    }

    return { data, error };
  },

  async getIngredientesTotales(consolidadoId) {
    // Try the server-side RPC first (fix_sprint_c.sql must be applied)
    const { data, error } = await supabase
      .rpc('get_ingredientes_totales', { p_consolidado_id: consolidadoId });

    // If RPC exists and succeeded, return its result
    if (!error) return { data, error };

    // Fallback: if RPC doesn't exist (PGRST202 / 404) or fails,
    // calculate ingredients in JS from consolidado_items + receta_ingredientes
    console.warn('get_ingredientes_totales RPC not found, using JS fallback. Apply fix_sprint_c.sql.');

    const { data: items, error: itemsError } = await supabase
      .from('consolidado_items')
      .select('receta_id, cantidad_total, arbol_recetas(rendimiento)')
      .eq('consolidado_id', consolidadoId);

    if (itemsError || !items || items.length === 0) {
      return { data: [], error: itemsError };
    }

    // Collect all unique receta_ids
    const recetaIds = [...new Set(items.map(i => i.receta_id))];

    const { data: ingredientes, error: ingError } = await supabase
      .from('receta_ingredientes')
      .select('receta_id, cantidad_requerida, unidad_medida, arbol_materia_prima(id, codigo, nombre, unidad_medida, stock_actual, stock_minimo)')
      .in('receta_id', recetaIds)
      .eq('activo', true);

    if (ingError || !ingredientes) return { data: [], error: ingError };

    // Aggregate by materia_prima
    const mpMap = {};
    for (const ing of ingredientes) {
      const mp = ing.arbol_materia_prima;
      if (!mp) continue;
      const item = items.find(i => i.receta_id === ing.receta_id);
      const rendimiento = item?.arbol_recetas?.rendimiento || 1;
      const cantidadTotal = item?.cantidad_total || 0;
      const requerido = ing.cantidad_requerida * (cantidadTotal / rendimiento);

      if (!mpMap[mp.id]) {
        mpMap[mp.id] = {
          materia_prima_id: mp.id,
          nombre: mp.nombre,
          codigo: mp.codigo,
          unidad_medida: mp.unidad_medida,
          stock_actual: mp.stock_actual || 0,
          stock_minimo: mp.stock_minimo || 0,
          total_requerido: 0,
        };
      }
      mpMap[mp.id].total_requerido += requerido;
    }

    const resultado = Object.values(mpMap).map(mp => {
      const diferencia = parseFloat((mp.stock_actual - mp.total_requerido).toFixed(2));
      return {
        ...mp,
        total_requerido: parseFloat(mp.total_requerido.toFixed(2)),
        diferencia,
        estado_stock: diferencia >= 0 ? 'SUFICIENTE' : 'INSUFICIENTE',
      };
    });

    resultado.sort((a, b) => {
      if (a.estado_stock !== b.estado_stock) return a.estado_stock === 'INSUFICIENTE' ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    });

    return { data: resultado, error: null };
  },

  // ========================================
  // ACCIONES DEL SUPERVISOR
  // ========================================

  async sustituirReceta(consolidadoId, recetaOriginalId, recetaNuevaId, motivo, supervisorId) {
    // Registrar cambio
    const { error: cambioError } = await supabase
      .from('cambios_menu_supervisor')
      .insert({
        consolidado_id: consolidadoId,
        receta_original_id: recetaOriginalId,
        receta_nueva_id: recetaNuevaId,
        motivo,
        supervisor_id: supervisorId,
      });

    if (cambioError) return { data: null, error: cambioError };

    // Actualizar item del consolidado
    const { data, error } = await supabase
      .from('consolidado_items')
      .update({ receta_id: recetaNuevaId })
      .eq('consolidado_id', consolidadoId)
      .eq('receta_id', recetaOriginalId)
      .select();

    return { data, error };
  },

  async aprobarConsolidado(consolidadoId, supervisorId) {
    const { data, error } = await supabase
      .from('consolidados_produccion')
      .update({
        estado: 'aprobado',
        supervisor_id: supervisorId,
        fecha_aprobacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', consolidadoId)
      .select()
      .single();

    return { data, error };
  },

  async marcarPreparado(consolidadoId) {
    // Descontar stock de materias primas antes de marcar como preparado
    const { error: rpcError } = await supabase
      .rpc('descontar_stock_consolidado', { p_consolidado_id: consolidadoId });

    // Si el descuento de stock falla, no marcar como completado
    if (rpcError) {
      console.error('Error al descontar stock:', rpcError);
      return { data: null, error: rpcError };
    }

    const { data, error } = await supabase
      .from('consolidados_produccion')
      .update({
        estado: 'completado',
        fecha_preparacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', consolidadoId)
      .select()
      .single();

    return { data, error };
  },

  // ========================================
  // CAMBIOS REALIZADOS
  // ========================================

  async getCambiosRealizados(consolidadoId) {
    const { data, error } = await supabase
      .from('cambios_menu_supervisor')
      .select(`
        *,
        arbol_recetas!cambios_menu_supervisor_receta_original_id_fkey (nombre),
        arbol_recetas!cambios_menu_supervisor_receta_nueva_id_fkey (nombre)
      `)
      .eq('consolidado_id', consolidadoId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  // ========================================
  // BÚSQUEDA DE ALTERNATIVAS (para modal de sustitución)
  // ========================================

  async buscarRecetasAlternativas(termino = '', componenteId = null) {
    // Buscar recetas del mismo componente (nivel 3 en arbol_recetas)
    let query = supabase
      .from('arbol_recetas')
      .select(`
        id, codigo, nombre, costo_porcion, rendimiento,
        receta_ingredientes (
          cantidad_requerida, activo,
          arbol_materia_prima (
            id, nombre, stock_actual, unidad_medida
          )
        )
      `)
      .eq('activo', true)
      .in('nivel_actual', [2, 3])
      .eq('receta_ingredientes.activo', true);

    if (termino && termino.length >= 2) {
      query = query.ilike('nombre', `%${termino}%`);
    }

    if (componenteId) {
      // Filtrar por recetas asociadas a ese componente en menu_componentes
      const { data: recetasComp } = await supabase
        .from('menu_componentes')
        .select('receta_id')
        .eq('componente_id', componenteId)
        .eq('activo', true);

      const ids = (recetasComp || []).map((r) => r.receta_id).filter(Boolean);
      if (ids.length > 0) {
        query = query.in('id', ids);
      }
    }

    const { data, error } = await query.order('nombre').limit(20);

    if (error || !data) return { data: [], error };

    // Calcular viabilidad de stock para cada receta
    const resultado = data.map((receta) => {
      const ingredientes = receta.receta_ingredientes || [];
      let stockOk = true;
      const detalle = ingredientes.map((ing) => {
        const mp = ing.arbol_materia_prima;
        if (!mp) return null;
        const stockSuficiente = (mp.stock_actual || 0) >= ing.cantidad_requerida;
        if (!stockSuficiente) stockOk = false;
        return {
          nombre: mp.nombre,
          stock_actual: mp.stock_actual || 0,
          requerido: ing.cantidad_requerida,
          unidad_medida: mp.unidad_medida,
          suficiente: stockSuficiente,
        };
      }).filter(Boolean);

      return {
        id: receta.id,
        codigo: receta.codigo,
        nombre: receta.nombre,
        costo_porcion: receta.costo_porcion,
        stock_ok: stockOk,
        ingredientes: detalle,
      };
    });

    // Ordenar: primero las que tienen stock OK
    resultado.sort((a, b) => {
      if (a.stock_ok && !b.stock_ok) return -1;
      if (!a.stock_ok && b.stock_ok) return 1;
      return a.nombre.localeCompare(b.nombre);
    });

    return { data: resultado, error: null };
  },

  // ========================================
  // OPERACIONES (para selector de unidad)
  // ========================================

  async getOperaciones() {
    const { data, error } = await supabase
      .from('operaciones')
      .select('id, codigo, nombre')
      .eq('activo', true)
      .order('nombre');
    return { data, error };
  },

  // ========================================
  // CICLO ACTIVO POR OPERACIÓN (para modal ciclo completo)
  // ========================================

  async getCicloActivoPorOperacion(operacionId) {
    const { data, error } = await supabase
      .from('ciclos_menu')
      .select('id, nombre, estado, fecha_inicio, dia_actual_ciclo')
      .eq('operacion_id', operacionId)
      .eq('activo', true)
      .eq('estado', 'activo')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return { data, error };
  },

  // ========================================
  // HORARIOS POR UNIDAD (servicios_unidad)
  // ========================================

  async getServiciosUnidad(operacionId = null) {
    let query = supabase
      .from('servicios_unidad')
      .select('*, operaciones(id, codigo, nombre)')
      .eq('activo', true)
      .order('servicio');

    if (operacionId) {
      query = query.eq('operacion_id', operacionId);
    }

    const { data, error } = await query;
    return { data, error };
  },
};

// ========================================
// HOJA DE PRODUCCIÓN (PDF)
// Importación dinámica de jsPDF — mismo patrón que CierreCostosMensual.jsx
// ========================================

export async function generarHojaProduccion(consolidadoId, fecha, servicio) {
  const [recetasRes, ingredientesRes] = await Promise.all([
    consolidadoService.getVistaRecetas(consolidadoId),
    consolidadoService.getIngredientesTotales(consolidadoId),
  ]);

  const recetas      = recetasRes.data      || [];
  const ingredientes = ingredientesRes.data || [];

  const { jsPDF }             = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();

  // Paleta coherente con el design system
  const PRIMARY  = [13, 148, 136];   // teal-600
  const DARK     = [30, 41, 59];     // slate-800
  const GRAY     = [100, 116, 139];  // slate-500
  const LIGHT    = [248, 250, 252];  // slate-50
  const ALT      = [226, 232, 240];  // slate-200
  const RED      = [220, 38, 38];    // red-600

  // Capitalizar servicio (desayuno → Desayuno, cena_ligera → Cena Ligera)
  const servicioLabel = servicio
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const titulo = `HOJA DE PRODUCCIÓN — ${servicioLabel}`;

  // ── Encabezado ────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, 14, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${fecha}  ·  Generado: ${new Date().toLocaleString('es-CO')}`, 14, 19);

  let y = 28;

  // ── Sección 1: Recetas a producir ────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('1. RECETAS A PRODUCIR', 14, y);
  y += 4;

  const recetasBody = recetas.map((item) => [
    item.componentes_plato?.nombre || '—',
    item.arbol_recetas?.nombre     || '—',
    item.arbol_recetas?.codigo     || '—',
    String(item.cantidad_total     || 0),
  ]);

  const totalPorciones = recetas.reduce((s, r) => s + (r.cantidad_total || 0), 0);

  autoTable(doc, {
    startY: y,
    head: [['Componente', 'Receta', 'Código', 'Cantidad']],
    body: recetasBody.length ? recetasBody : [['Sin recetas registradas', '', '', '']],
    foot: [['', 'TOTAL PORCIONES', '', String(totalPorciones)]],
    styles:            { fontSize: 8, cellPadding: 2, font: 'helvetica' },
    headStyles:        { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles:{ fillColor: ALT },
    bodyStyles:        { fillColor: LIGHT, textColor: DARK },
    footStyles:        { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: DARK },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26 },
      3: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Pie de página
      const pNum = doc.internal.getCurrentPageInfo().pageNumber;
      const pTot = doc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(
        `${titulo}  ·  Fecha ${fecha}  ·  Página ${pNum}/${pTot}`,
        pageW / 2,
        pageH - 6,
        { align: 'center' }
      );
    },
  });

  // ── Sección 2: Ingredientes requeridos ───────────────────────
  y = doc.lastAutoTable.finalY + 8;
  if (y > 240) { doc.addPage(); y = 14; }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('2. INGREDIENTES REQUERIDOS', 14, y);
  y += 4;

  const ingredientesBody = ingredientes.map((ing) => [
    ing.nombre           || '—',
    ing.codigo           || '—',
    String(ing.total_requerido || 0),
    ing.unidad_medida    || '—',
    String(ing.stock_actual    || 0),
    ing.estado_stock     || '—',
  ]);

  const insuficientes = ingredientes.filter((i) => i.estado_stock === 'INSUFICIENTE').length;

  autoTable(doc, {
    startY: y,
    head: [['Ingrediente', 'Código', 'Requerido', 'Unidad', 'Stock', 'Estado']],
    body: ingredientesBody.length ? ingredientesBody : [['Sin ingredientes', '', '', '', '', '']],
    foot: insuficientes > 0
      ? [['⚠ ' + insuficientes + ' ingrediente(s) con stock insuficiente', '', '', '', '', '']]
      : [['✓ Stock suficiente para todos los ingredientes', '', '', '', '', '']],
    styles:            { fontSize: 8, cellPadding: 2, font: 'helvetica' },
    headStyles:        { fillColor: GRAY, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles:{ fillColor: ALT },
    bodyStyles:        { fillColor: LIGHT, textColor: DARK },
    footStyles: {
      fillColor: insuficientes > 0 ? [254, 242, 242] : [240, 253, 250],
      fontStyle: 'bold',
      textColor: insuficientes > 0 ? RED : PRIMARY,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 22 },
      2: { cellWidth: 22, halign: 'right' },
      3: { cellWidth: 18 },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 24, halign: 'center' },
    },
    didParseCell: (data) => {
      // Colorear celda de estado
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'INSUFICIENTE') {
          data.cell.styles.textColor  = RED;
          data.cell.styles.fontStyle  = 'bold';
        } else {
          data.cell.styles.textColor  = PRIMARY;
        }
      }
    },
    didDrawPage: (data) => {
      const pNum = doc.internal.getCurrentPageInfo().pageNumber;
      const pTot = doc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(
        `${titulo}  ·  Fecha ${fecha}  ·  Página ${pNum}/${pTot}`,
        pageW / 2,
        pageH - 6,
        { align: 'center' }
      );
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`hoja-produccion-${fecha}-${servicio}.pdf`);
}
