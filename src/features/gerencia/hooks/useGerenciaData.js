// ========================================
// useGerenciaData — Datos para el dashboard gerencial
// Reutiliza las mismas tablas que los módulos existentes.
// NO duplica lógica: usa las mismas queries que useAdminKPIs
// y usePresupuesto pero con staleTime más largo (gerente no
// necesita datos en tiempo real al segundo).
// ========================================

import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/shared/api';

// ── Helpers ───────────────────────────────────────────────

function getMesISO(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${m}`;
}

function rangoMes(mesISO) {
  const [anio, mes] = mesISO.split('-').map(Number);
  const inicio = new Date(anio, mes - 1, 1).toISOString();
  const fin    = new Date(anio, mes, 0, 23, 59, 59).toISOString();
  return { inicio, fin };
}

const STALE = 10 * 60 * 1000; // 10 min — datos gerenciales no cambian al segundo

// ── Hook principal ────────────────────────────────────────

export function useGerenciaData() {
  // Los últimos 6 meses para tendencias
  const meses = Array.from({ length: 6 }, (_, i) => getMesISO(-(5 - i)));

  const results = useQueries({
    queries: [

      // ── 1. Gasto real de los últimos 6 meses (tabla facturas) ──────────
      {
        queryKey: ['gerencia-gastos-6m'],
        queryFn: async () => {
          const { inicio } = rangoMes(meses[0]);
          const { data } = await supabase
            .from('facturas')
            .select('total, fecha_factura, categoria')
            .gte('fecha_factura', inicio.split('T')[0])
            .order('fecha_factura');
          return data || [];
        },
        staleTime: STALE,
      },

      // ── 2. Presupuesto de los últimos 6 meses ─────────────────────────
      {
        queryKey: ['gerencia-presupuestos-6m'],
        queryFn: async () => {
          const { data } = await supabase
            .from('presupuestos')
            .select('mes, presupuestado')
            .in('mes', meses);
          return data || [];
        },
        staleTime: STALE,
      },

      // ── 3. Estado del inventario (distribución por estado de stock) ────
      {
        queryKey: ['gerencia-inventario-estado'],
        queryFn: async () => {
          const { data } = await supabase
            .from('arbol_materia_prima')
            .select('stock_actual, stock_minimo, stock_maximo, costo_promedio, nombre, tipo_rama')
            .eq('nivel_actual', 5)
            .eq('activo', true)
            .eq('maneja_stock', true);
          return (data || []).map(p => {
            const s = p.stock_actual || 0;
            let estado = 'normal';
            if (s === 0)                                    estado = 'agotado';
            else if (p.stock_minimo && s < p.stock_minimo) estado = 'bajo';
            else if (p.stock_maximo && s > p.stock_maximo) estado = 'exceso';
            return { ...p, estado, valor: s * (p.costo_promedio || 0) };
          });
        },
        staleTime: STALE,
      },

      // ── 4. Top 8 ingredientes más costosos (variación último vs penúltimo mes) ──
      {
        queryKey: ['gerencia-costos-ingredientes'],
        queryFn: async () => {
          const mesActual  = getMesISO(0);
          const mesAnterior = getMesISO(-1);
          const { inicio: inicioA, fin: finA }   = rangoMes(mesActual);
          const { inicio: inicioB, fin: finB }   = rangoMes(mesAnterior);

          const [{ data: movA }, { data: movB }] = await Promise.all([
            supabase
              .from('movimientos_inventario')
              .select('producto_id, cantidad_unidad_base, costo_unitario')
              .eq('tipo_movimiento', 'entrada')
              .gte('created_at', inicioA).lte('created_at', finA),
            supabase
              .from('movimientos_inventario')
              .select('producto_id, cantidad_unidad_base, costo_unitario')
              .eq('tipo_movimiento', 'entrada')
              .gte('created_at', inicioB).lte('created_at', finB),
          ]);

          // Agrupar por producto → costo promedio ponderado
          function agrupar(movs) {
            const m = {};
            for (const mov of movs || []) {
              if (!mov.producto_id) continue;
              if (!m[mov.producto_id]) m[mov.producto_id] = { cant: 0, gasto: 0 };
              const c = parseFloat(mov.cantidad_unidad_base) || 0;
              const p = parseFloat(mov.costo_unitario) || 0;
              m[mov.producto_id].cant  += c;
              m[mov.producto_id].gasto += c * p;
            }
            return m;
          }

          const mapaA = agrupar(movA);
          const mapaB = agrupar(movB);

          // Nombres de productos
          const ids = [...new Set([...Object.keys(mapaA), ...Object.keys(mapaB)])];
          if (!ids.length) return [];

          const { data: prods } = await supabase
            .from('arbol_materia_prima')
            .select('id, nombre, costo_promedio, unidad_stock')
            .in('id', ids);

          return (prods || []).map(p => {
            const entA = mapaA[p.id];
            const entB = mapaB[p.id];
            const costoA = entA ? entA.gasto / entA.cant : p.costo_promedio || 0;
            const costoB = entB ? entB.gasto / entB.cant : p.costo_promedio || 0;
            const gastoA = entA?.gasto || 0;
            const var_pct = costoB > 0 ? ((costoA - costoB) / costoB) * 100 : null;
            return {
              id: p.id,
              nombre: p.nombre,
              unidad: p.unidad_stock,
              costoActual: costoA,
              costoAnterior: costoB,
              gastoMes: gastoA,
              var_pct,
            };
          })
          .filter(p => p.gastoMes > 0)
          .sort((a, b) => b.gastoMes - a.gastoMes)
          .slice(0, 8);
        },
        staleTime: STALE,
      },

      // ── 5. Solicitudes por estado (embudo operativo) ───────────────────
      {
        queryKey: ['gerencia-solicitudes-estado'],
        queryFn: async () => {
          const { data } = await supabase
            .from('solicitudes')
            .select('estado');
          const conteo = {};
          for (const s of data || []) {
            conteo[s.estado] = (conteo[s.estado] || 0) + 1;
          }
          return conteo;
        },
        staleTime: STALE,
      },

    ],
  });

  const [gastosQ, presupuestosQ, inventarioQ, costosQ, solicitudesQ] = results;
  const isLoading = results.some(r => r.isLoading);

  // ── Procesar: gasto real agrupado por mes ─────────────────────────────
  const gastosPorMes = meses.map(mes => {
    const [anio, m] = mes.split('-').map(Number);
    const facturas = (gastosQ.data || []).filter(f => {
      const d = new Date(f.fecha_factura);
      return d.getFullYear() === anio && (d.getMonth() + 1) === m;
    });
    const total = facturas.reduce((s, f) => s + (parseFloat(f.total) || 0), 0);
    const presup = (presupuestosQ.data || []).find(p => p.mes === mes);
    return {
      mes,
      label: new Date(anio, m - 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }),
      gasto: Math.round(total),
      presupuesto: Math.round(parseFloat(presup?.presupuestado || 0)),
    };
  });

  // ── Procesar: distribución inventario ────────────────────────────────
  const inventario = inventarioQ.data || [];
  const distInventario = {
    normal:  inventario.filter(p => p.estado === 'normal').length,
    bajo:    inventario.filter(p => p.estado === 'bajo').length,
    agotado: inventario.filter(p => p.estado === 'agotado').length,
    exceso:  inventario.filter(p => p.estado === 'exceso').length,
    valorTotal: Math.round(inventario.reduce((s, p) => s + p.valor, 0)),
  };

  // ── Alertas automáticas ───────────────────────────────────────────────
  const mesActual = gastosPorMes[gastosPorMes.length - 1] || {};
  const pctPresupuesto = mesActual.presupuesto > 0
    ? Math.round((mesActual.gasto / mesActual.presupuesto) * 100)
    : null;

  const costos = costosQ.data || [];
  const ingredientesAlza = costos.filter(c => c.var_pct != null && c.var_pct > 10).length;

  const alertas = [];
  if (pctPresupuesto != null && pctPresupuesto >= 80)
    alertas.push({ tipo: 'warning', texto: `El presupuesto de este mes está al ${pctPresupuesto}% de uso` });
  if (distInventario.agotado > 0)
    alertas.push({ tipo: 'error', texto: `${distInventario.agotado} producto${distInventario.agotado > 1 ? 's' : ''} agotado${distInventario.agotado > 1 ? 's' : ''}` });
  if (distInventario.bajo > 0)
    alertas.push({ tipo: 'warning', texto: `${distInventario.bajo} producto${distInventario.bajo > 1 ? 's' : ''} con stock bajo del mínimo` });
  if (ingredientesAlza > 0)
    alertas.push({ tipo: 'info', texto: `${ingredientesAlza} ingrediente${ingredientesAlza > 1 ? 's' : ''} subió${ingredientesAlza > 1 ? 'ron' : ''} más del 10% este mes` });

  return {
    isLoading,
    meses,
    gastosPorMes,
    distInventario,
    costos,
    solicitudes: solicitudesQ.data || {},
    alertas,
    pctPresupuesto,
    mesActual,
  };
}
