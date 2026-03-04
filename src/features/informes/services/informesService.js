// ============================================================
// informesService.js
// Todas las queries de datos para los 5 tipos de informe.
// Cada función recibe los filtros que el usuario configuró
// y devuelve filas planas listas para mostrar en tabla
// y exportar a Excel/PDF sin transformaciones adicionales.
// ============================================================

import { supabase } from '@/shared/api';

// ── Helpers internos ─────────────────────────────────────

function fmtFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtFechaSolo(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtCOP(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n);
}

// ─────────────────────────────────────────────────────────
// 1. COMPRAS Y FACTURAS
//    Una fila por item de factura (producto comprado).
//    Incluye: factura, proveedor, quién recibió, fechas,
//    producto, presentación, cantidad, precio, subtotal.
//    NOTA: recibido_por es un UUID sin FK directa a profiles,
//    se resuelve con una query secundaria de perfiles.
// ─────────────────────────────────────────────────────────
export async function queryFacturas(filtros) {
  const { fechaDesde, fechaHasta, proveedor_id, estadoRecepcion } = filtros;

  let q = supabase
    .from('facturas')
    .select(`
      id,
      numero_factura,
      fecha_factura,
      fecha_recepcion,
      valor_total,
      estado_recepcion,
      estado_procesamiento,
      recibido_por,
      created_by,
      proveedores ( id, nombre, nit ),
      factura_items (
        id,
        cantidad_recibida,
        precio_unitario,
        observacion_recepcion,
        presentacion:presentacion_id ( id, nombre, contenido_unidad, unidad_contenido ),
        producto:producto_arbol_id ( id, codigo, nombre, unidad_stock )
      )
    `)
    .order('fecha_factura', { ascending: false });

  if (fechaDesde) q = q.gte('fecha_factura', fechaDesde);
  if (fechaHasta) q = q.lte('fecha_factura', fechaHasta);
  if (proveedor_id) q = q.eq('proveedor_id', proveedor_id);
  if (estadoRecepcion) q = q.eq('estado_recepcion', estadoRecepcion);

  const { data, error } = await q;
  if (error) throw error;

  // Resolver nombres de usuarios (recibido_por / created_by) en una sola query
  const uids = [...new Set(
    (data || []).flatMap(f => [f.recibido_por, f.created_by]).filter(Boolean)
  )];
  const mapaPerfiles = {};
  if (uids.length > 0) {
    const { data: perfiles } = await supabase
      .from('profiles')
      .select('id, nombre')
      .in('id', uids);
    for (const p of perfiles || []) mapaPerfiles[p.id] = p.nombre;
  }

  // Aplanar: una fila por item de factura
  const filas = [];
  for (const f of data || []) {
    const nombreRecibio = mapaPerfiles[f.recibido_por] || f.recibido_por || '—';
    const items = f.factura_items || [];
    if (items.length === 0) {
      filas.push({
        'N° Factura':       f.numero_factura,
        'Proveedor':        f.proveedores?.nombre || '—',
        'NIT Proveedor':    f.proveedores?.nit || '—',
        'Fecha Factura':    fmtFechaSolo(f.fecha_factura),
        'Fecha Recepción':  fmtFechaSolo(f.fecha_recepcion),
        'Recibido por':     nombreRecibio,
        'Estado Recepción': f.estado_recepcion || '—',
        'Producto':         '(sin items)',
        'Presentación':     '—',
        'Cantidad':         '—',
        'Precio Unitario':  '—',
        'Subtotal':         '—',
        'Total Factura':    fmtCOP(f.valor_total),
      });
    } else {
      for (const item of items) {
        const subtotal = (item.cantidad_recibida || 0) * (item.precio_unitario || 0);
        filas.push({
          'N° Factura':       f.numero_factura,
          'Proveedor':        f.proveedores?.nombre || '—',
          'NIT Proveedor':    f.proveedores?.nit || '—',
          'Fecha Factura':    fmtFechaSolo(f.fecha_factura),
          'Fecha Recepción':  fmtFechaSolo(f.fecha_recepcion),
          'Recibido por':     nombreRecibio,
          'Estado Recepción': f.estado_recepcion || '—',
          'Producto':         item.producto?.nombre || item.presentacion?.nombre || '—',
          'Cód. Producto':    item.producto?.codigo || '—',
          'Presentación':     item.presentacion?.nombre || '—',
          'Contenido':        item.presentacion
                                ? `${item.presentacion.contenido_unidad} ${item.presentacion.unidad_contenido}`
                                : '—',
          'Cantidad Recibida':item.cantidad_recibida ?? '—',
          'Precio Unitario':  fmtCOP(item.precio_unitario),
          'Subtotal':         fmtCOP(subtotal),
          'Total Factura':    fmtCOP(f.valor_total),
          'Observación Item': item.observacion_recepcion || '',
        });
      }
    }
  }
  return filas;
}

// ─────────────────────────────────────────────────────────
// 2. SOLICITUDES — FLUJO COMPLETO
//    Una fila por solicitud con todos los responsables
//    y el historial de cambios de estado embebido.
// ─────────────────────────────────────────────────────────
export async function querySolicitudes(filtros) {
  const { fechaDesde, fechaHasta, estado, proveedor_id } = filtros;

  let q = supabase
    .from('solicitudes')
    .select(`
      id,
      estado,
      fecha_solicitud,
      observaciones,
      email_creador,
      codigo_unidad,
      proveedores ( id, nombre, nit ),
      solicitud_items (
        id,
        cantidad_solicitada,
        unidad,
        estado_item,
        motivo_rechazo,
        producto:producto_arbol_id ( id, codigo, nombre ),
        presentacion:presentacion_id ( id, nombre, contenido_unidad, unidad_contenido )
      ),
      solicitud_historial (
        accion,
        nota,
        actor,
        created_at
      )
    `)
    .order('fecha_solicitud', { ascending: false });

  if (fechaDesde) q = q.gte('fecha_solicitud', fechaDesde);
  if (fechaHasta) q = q.lte('fecha_solicitud', fechaHasta);
  if (estado)     q = q.eq('estado', estado);
  if (proveedor_id) q = q.eq('proveedor_id', proveedor_id);

  const { data, error } = await q;
  if (error) throw error;

  // Recopilar todos los UIDs de actores del historial y resolverlos en una sola query
  const uidsActores = [...new Set(
    (data || []).flatMap(s =>
      (s.solicitud_historial || []).map(h => h.actor).filter(Boolean)
    )
  )];
  const mapaActores = {};
  if (uidsActores.length > 0) {
    const { data: perfiles } = await supabase
      .from('profiles')
      .select('id, nombre')
      .in('id', uidsActores);
    for (const p of perfiles || []) mapaActores[p.id] = p.nombre;
  }

  const filas = [];
  for (const s of data || []) {
    const historial = (s.solicitud_historial || [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Encontrar actor de cada etapa del flujo con nombre resuelto
    const etapa = (accion) => {
      const h = historial.find(h => h.accion === accion);
      if (!h) return '—';
      const nombre = mapaActores[h.actor] || h.actor || '—';
      return `${nombre} (${fmtFecha(h.created_at)})`;
    };

    const items = s.solicitud_items || [];
    if (items.length === 0) {
      filas.push(buildFilaSolicitud(s, null, etapa));
    } else {
      for (const item of items) {
        filas.push(buildFilaSolicitud(s, item, etapa));
      }
    }
  }
  return filas;
}

function buildFilaSolicitud(s, item, etapa) {
  return {
    'ID Solicitud':    s.id,
    'Fecha Solicitud': fmtFecha(s.fecha_solicitud),
    'Creado por':      s.email_creador || '—',
    'Unidad':          s.codigo_unidad || '—',
    'Proveedor':       s.proveedores?.nombre || '—',
    'NIT':             s.proveedores?.nit || '—',
    'Estado Final':    s.estado || '—',
    'Producto':        item?.producto?.nombre || item?.presentacion?.nombre || '(sin items)',
    'Cód. Producto':   item?.producto?.codigo || '—',
    'Presentación':    item?.presentacion?.nombre || '—',
    'Cantidad Sol.':   item?.cantidad_solicitada ?? '—',
    'Unidad Item':     item?.unidad || '—',
    'Estado Item':     item?.estado_item || '—',
    'Motivo Rechazo':  item?.motivo_rechazo || '',
    'Revisado aux.':   etapa('revision_aux'),
    'Aprobado aux.':   etapa('aprobado_auxiliar'),
    'Enviado compras': etapa('en_compra'),
    'Comprado':        etapa('comprado'),
    'Observaciones':   s.observaciones || '',
  };
}

// ─────────────────────────────────────────────────────────
// 3. INVENTARIO Y MOVIMIENTOS DE STOCK
//    Una fila por movimiento: entrada o salida,
//    stock antes/después, costo, quién lo generó, factura.
// ─────────────────────────────────────────────────────────
export async function queryMovimientos(filtros) {
  const { fechaDesde, fechaHasta, tipoMovimiento, producto_id } = filtros;

  let q = supabase
    .from('movimientos_inventario')
    .select(`
      id,
      tipo_movimiento,
      cantidad_presentacion,
      cantidad_unidad_base,
      costo_unitario,
      stock_anterior,
      stock_posterior,
      costo_promedio_anterior,
      costo_promedio_posterior,
      unidad,
      created_at,
      factura_id,
      producto:producto_id ( id, codigo, nombre, unidad_stock ),
      presentacion:presentacion_id ( id, nombre, contenido_unidad, unidad_contenido ),
      factura:factura_id ( numero_factura, proveedores ( nombre ) )
    `)
    .order('created_at', { ascending: false });

  if (fechaDesde) q = q.gte('created_at', fechaDesde + 'T00:00:00');
  if (fechaHasta) q = q.lte('created_at', fechaHasta + 'T23:59:59');
  if (tipoMovimiento) q = q.eq('tipo_movimiento', tipoMovimiento);
  if (producto_id)    q = q.eq('producto_id', producto_id);

  const { data, error } = await q;
  if (error) throw error;

  return (data || []).map(m => ({
    'Fecha y Hora':         fmtFecha(m.created_at),
    'Tipo Movimiento':      m.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida',
    'Producto':             m.producto?.nombre || '—',
    'Cód. Producto':        m.producto?.codigo || '—',
    'Presentación':         m.presentacion?.nombre || '—',
    'Cant. Presentación':   m.cantidad_presentacion ?? '—',
    'Cant. Unidad Base':    m.cantidad_unidad_base ?? '—',
    'Unidad':               m.unidad || m.producto?.unidad_stock || '—',
    'Stock Anterior':       m.stock_anterior ?? '—',
    'Stock Posterior':      m.stock_posterior ?? '—',
    'Costo Unitario':       fmtCOP(m.costo_unitario),
    'Costo Promedio Ant.':  fmtCOP(m.costo_promedio_anterior),
    'Costo Promedio Post.': fmtCOP(m.costo_promedio_posterior),
    'N° Factura Origen':    m.factura?.numero_factura || '—',
    'Proveedor Origen':     m.factura?.proveedores?.nombre || '—',
  }));
}

// ─────────────────────────────────────────────────────────
// 4. EMPLEADOS
//    Una fila por empleado con todos sus datos:
//    personales, laborales, contrato, SST, tallas.
// ─────────────────────────────────────────────────────────
export async function queryEmpleados(filtros) {
  const { estadoEmpleado, tipoContrato, tipoEmpleado } = filtros;

  let q = supabase
    .from('empleados')
    .select(`
      id,
      documento_identidad,
      nombres,
      apellidos,
      correo,
      telefono,
      direccion,
      cargo,
      tipo_vinculacion,
      tipo_empleado,
      fecha_ingreso,
      activo,
      codigo_unidad,
      empleados_talento_humano (
        tipo_contrato,
        salario,
        fecha_nacimiento,
        eps,
        afp,
        entidad_fa,
        talla_camisa,
        talla_pantalon,
        talla_zapatos,
        prorroga_1,
        prorroga_2,
        prorroga_3,
        prorroga_4,
        observaciones
      ),
      empleados_sst (
        examenes_medicos,
        fecha_examen,
        estado_examen,
        curso_manipulacion,
        induccion,
        reinduccion,
        covid,
        covid_dosis,
        hepatitis_a,
        tetano,
        arl,
        caja_compensacion
      )
    `)
    .order('apellidos', { ascending: true });

  if (estadoEmpleado === 'activo')   q = q.eq('activo', true);
  if (estadoEmpleado === 'inactivo') q = q.eq('activo', false);
  if (tipoEmpleado)                  q = q.eq('tipo_empleado', tipoEmpleado);

  const { data, error } = await q;
  if (error) throw error;

  let filas = (data || []).map(e => {
    const th  = Array.isArray(e.empleados_talento_humano)
      ? e.empleados_talento_humano[0]
      : e.empleados_talento_humano;
    const sst = Array.isArray(e.empleados_sst)
      ? e.empleados_sst[0]
      : e.empleados_sst;

    return {
      'Documento':        e.documento_identidad,
      'Nombres':          e.nombres,
      'Apellidos':        e.apellidos,
      'Correo':           e.correo || '—',
      'Teléfono':         e.telefono || '—',
      'Dirección':        e.direccion || '—',
      'Cargo':            e.cargo || '—',
      'Tipo Empleado':    e.tipo_empleado || '—',
      'Tipo Vinculación': e.tipo_vinculacion || '—',
      'Fecha Ingreso':    fmtFechaSolo(e.fecha_ingreso),
      'Estado':           e.activo ? 'Activo' : 'Inactivo',
      'Unidad':           e.codigo_unidad || '—',
      // Talento Humano
      'Tipo Contrato':    th?.tipo_contrato || '—',
      'Salario':          fmtCOP(th?.salario),
      'Fecha Nacimiento': fmtFechaSolo(th?.fecha_nacimiento),
      'EPS':              th?.eps || '—',
      'AFP':              th?.afp || '—',
      'Serv. Funerario':  th?.entidad_fa || '—',
      'Talla Camisa':     th?.talla_camisa || '—',
      'Talla Pantalón':   th?.talla_pantalon || '—',
      'Talla Zapatos':    th?.talla_zapatos || '—',
      'Prórroga 1':       fmtFechaSolo(th?.prorroga_1),
      'Prórroga 2':       fmtFechaSolo(th?.prorroga_2),
      'Prórroga 3':       fmtFechaSolo(th?.prorroga_3),
      'Prórroga 4':       fmtFechaSolo(th?.prorroga_4),
      'Obs. Contrato':    th?.observaciones || '',
      // SST
      'Exámenes Médicos': sst?.examenes_medicos ? 'Sí' : 'No',
      'Fecha Examen':     fmtFechaSolo(sst?.fecha_examen),
      'Estado Examen':    sst?.estado_examen || '—',
      'Curso Manipulación': sst?.curso_manipulacion ? 'Sí' : 'No',
      'Inducción':        sst?.induccion ? 'Sí' : 'No',
      'Reinducción':      sst?.reinduccion ? 'Sí' : 'No',
      'COVID':            sst?.covid ? 'Sí' : 'No',
      'Dosis COVID':      sst?.covid_dosis || '—',
      'Hepatitis A':      sst?.hepatitis_a ? 'Sí' : 'No',
      'Tétano':           sst?.tetano ? 'Sí' : 'No',
      'ARL':              sst?.arl || '—',
      'Caja Compensación':sst?.caja_compensacion || '—',
    };
  });

  // Filtro por tipo contrato (lo hacemos en cliente porque viene en relación)
  if (tipoContrato) {
    filas = filas.filter(f => f['Tipo Contrato'] === tipoContrato);
  }

  return filas;
}

// ─────────────────────────────────────────────────────────
// 5. PRESUPUESTO Y COSTOS
//    Filas del presupuesto mensual comparado con gasto real
//    más variación de precios de ingredientes por período.
// ─────────────────────────────────────────────────────────
export async function queryPresupuesto(filtros) {
  const { mesDesde, mesHasta } = filtros;

  // Generar lista de meses en el rango para iterar
  const meses = [];
  const [anioD, mesD] = mesDesde.split('-').map(Number);
  const [anioH, mesH] = mesHasta.split('-').map(Number);
  let a = anioD, m = mesD;
  while (a < anioH || (a === anioH && m <= mesH)) {
    meses.push(`${a}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; a++; }
    if (meses.length > 36) break; // tope de seguridad
  }

  // Query de presupuestos (sin presupuesto_items, columna monto no existe)
  const { data: presupuestos, error: errP } = await supabase
    .from('presupuestos')
    .select('mes, presupuestado, notas')
    .in('mes', meses.map(m => m + '-01'))
    .order('mes');
  if (errP) throw errP;

  // Gasto real: facturas agrupadas por mes
  const { data: facturas, error: errF } = await supabase
    .from('facturas')
    .select('fecha_factura, valor_total')
    .gte('fecha_factura', mesDesde + '-01')
    .lte('fecha_factura', mesHasta + '-31')
    .not('valor_total', 'is', null);
  if (errF) throw errF;

  // Gasto real por categoría: usar el RPC del módulo de presupuesto para cada mes
  // Hacemos las llamadas en paralelo (máximo 12 meses = máximo 12 RPCs)
  const gastoPorMes = {};
  const gastoCategoriaPorMes = {};

  await Promise.all(meses.map(async (mes) => {
    const mesInicio = mes + '-01';
    const { data: gastoData } = await supabase
      .rpc('calcular_gasto_real_mes', { p_mes: mesInicio });
    const categorias = gastoData || [];
    const totalMes = categorias.reduce((s, g) => s + parseFloat(g.gasto_total || 0), 0);
    gastoPorMes[mes] = totalMes;
    gastoCategoriaPorMes[mes] = categorias;
  }));

  // Mapa de presupuestos por mes
  const mapaPresupuesto = {};
  for (const p of presupuestos || []) {
    const mes = p.mes?.slice(0, 7);
    if (mes) mapaPresupuesto[mes] = p;
  }

  const filas = [];
  for (const mes of meses) {
    const p        = mapaPresupuesto[mes];
    const gastoReal = gastoPorMes[mes] || 0;
    const presup    = parseFloat(p?.presupuestado || 0);
    const diferencia = presup - gastoReal;
    const pct = presup > 0 ? ((gastoReal / presup) * 100).toFixed(1) : null;

    filas.push({
      'Mes':           mes,
      'Presupuestado': fmtCOP(presup),
      'Gasto Real':    fmtCOP(gastoReal),
      'Diferencia':    fmtCOP(diferencia),
      '% Utilizado':   pct != null ? `${pct}%` : '—',
      'Estado':        presup > 0
                         ? (gastoReal > presup ? 'Excedido'
                           : parseFloat(pct) >= 80 ? 'En alerta' : 'Normal')
                         : 'Sin presupuesto',
      'Notas':         p?.notas || '',
      'Tipo fila':     'Resumen mes',
    });

    // Desglose por categoría del gasto real (viene del RPC)
    for (const cat of gastoCategoriaPorMes[mes] || []) {
      if (!cat.gasto_total) continue;
      filas.push({
        'Mes':           `  ${mes}`,
        'Presupuestado': '—',
        'Gasto Real':    fmtCOP(parseFloat(cat.gasto_total || 0)),
        'Diferencia':    '—',
        '% Utilizado':   gastoReal > 0
                           ? `${((parseFloat(cat.gasto_total) / gastoReal) * 100).toFixed(1)}% del mes`
                           : '—',
        'Estado':        cat.categoria || 'Sin categoría',
        'Notas':         `${cat.cantidad_facturas ?? 0} factura(s)`,
        'Tipo fila':     'Categoría',
      });
    }
  }

  return filas;
}

// ─────────────────────────────────────────────────────────
// Función auxiliar: obtener listas para los selectores
// de filtros (proveedores, productos) en tiempo de carga.
// ─────────────────────────────────────────────────────────
export async function getProveedoresLista() {
  const { data } = await supabase
    .from('proveedores')
    .select('id, nombre')
    .order('nombre');
  return data || [];
}

export async function getProductosNivel5Lista() {
  const { data } = await supabase
    .from('arbol_materia_prima')
    .select('id, nombre, codigo')
    .eq('nivel_actual', 5)
    .eq('activo', true)
    .order('nombre');
  return data || [];
}
