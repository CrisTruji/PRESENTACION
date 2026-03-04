// ============================================================
// GeneradorInformes.jsx
// Vista de generación de informes — flujo de 3 pasos:
//   1. Elegir categoría
//   2. Configurar filtros
//   3. Vista previa + exportar
// Solo visible para el rol administrador.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import {
  FileText, ShoppingCart, Package, Users, BarChart2,
  ChevronRight, ChevronLeft, Download, FileSpreadsheet,
  Loader2, AlertCircle, Eye, SlidersHorizontal, Check,
  Calendar, Filter,
} from 'lucide-react';
import {
  queryFacturas,
  querySolicitudes,
  queryMovimientos,
  queryEmpleados,
  queryPresupuesto,
  getProveedoresLista,
  getProductosNivel5Lista,
} from '../services/informesService';
import { exportarExcel, exportarPDF } from '../services/exportador';

// ── Definición de las 5 categorías ───────────────────────

const CATEGORIAS = [
  {
    id: 'facturas',
    label: 'Compras y Facturas',
    descripcion: 'Facturas recibidas con detalle de productos, precios, proveedor y quien recibió cada compra.',
    icono: <FileText size={32} />,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.1)',
  },
  {
    id: 'solicitudes',
    label: 'Solicitudes — Flujo completo',
    descripcion: 'Ciclo completo de cada solicitud: quién la creó, quién la aprobó en cada etapa y cuándo.',
    icono: <ShoppingCart size={32} />,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
  },
  {
    id: 'movimientos',
    label: 'Inventario y Stock',
    descripcion: 'Cada entrada y salida de stock: cantidades, costos, stock antes/después y factura origen.',
    icono: <Package size={32} />,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
  },
  {
    id: 'empleados',
    label: 'Empleados',
    descripcion: 'Datos personales, contrato, EPS, AFP, tallas de dotación e información de SST de cada empleado.',
    icono: <Users size={32} />,
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.1)',
  },
  {
    id: 'presupuesto',
    label: 'Presupuesto y Costos',
    descripcion: 'Comparativo presupuestado vs gasto real por mes y desglose por categorías de gasto.',
    icono: <BarChart2 size={32} />,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
  },
];

// ── Valor inicial de filtros por categoría ────────────────

const FILTROS_INICIALES = {
  facturas:    { fechaDesde: '', fechaHasta: '', proveedor_id: '', estadoRecepcion: '' },
  solicitudes: { fechaDesde: '', fechaHasta: '', estado: '', proveedor_id: '' },
  movimientos: { fechaDesde: '', fechaHasta: '', tipoMovimiento: '', producto_id: '' },
  empleados:   { estadoEmpleado: '', tipoContrato: '', tipoEmpleado: '' },
  presupuesto: { mesDesde: '', mesHasta: '' },
};

// Fecha de hoy y hace 30 días como defaults
const hoy = new Date().toISOString().split('T')[0];
const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const mesActual = hoy.slice(0, 7);
const mesPasado = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  .toISOString().slice(0, 7);

// ── Componente principal ──────────────────────────────────

export default function GeneradorInformes() {
  const [paso, setPaso]             = useState(1); // 1 | 2 | 3
  const [categoria, setCategoria]   = useState(null);
  const [filtros, setFiltros]       = useState({});
  const [filas, setFilas]           = useState([]);
  const [cargando, setCargando]     = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError]           = useState(null);

  // Listas para selectores
  const [proveedores, setProveedores]  = useState([]);
  const [productos, setProductos]      = useState([]);

  // Cargar listas de apoyo una sola vez
  useEffect(() => {
    getProveedoresLista().then(setProveedores).catch(() => {});
    getProductosNivel5Lista().then(setProductos).catch(() => {});
  }, []);

  // ── Navegación entre pasos ────────────────────────────

  function elegirCategoria(cat) {
    setCategoria(cat);
    setFilas([]);
    setError(null);
    // Defaults inteligentes según la categoría
    const defaults = { ...FILTROS_INICIALES[cat.id] };
    if (cat.id === 'facturas' || cat.id === 'solicitudes' || cat.id === 'movimientos') {
      defaults.fechaDesde = hace30;
      defaults.fechaHasta = hoy;
    }
    if (cat.id === 'presupuesto') {
      defaults.mesDesde = mesPasado;
      defaults.mesHasta = mesActual;
    }
    setFiltros(defaults);
    setPaso(2);
  }

  function volver() {
    if (paso === 2) { setPaso(1); setCategoria(null); }
    if (paso === 3) { setPaso(2); }
  }

  // ── Consulta de datos ────────────────────────────────

  const consultarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    setFilas([]);
    try {
      let resultado = [];
      switch (categoria.id) {
        case 'facturas':    resultado = await queryFacturas(filtros);    break;
        case 'solicitudes': resultado = await querySolicitudes(filtros); break;
        case 'movimientos': resultado = await queryMovimientos(filtros); break;
        case 'empleados':   resultado = await queryEmpleados(filtros);   break;
        case 'presupuesto': resultado = await queryPresupuesto(filtros); break;
      }
      setFilas(resultado);
      setPaso(3);
    } catch (e) {
      console.error(e);
      setError('Error consultando los datos: ' + (e.message || 'intenta de nuevo'));
    } finally {
      setCargando(false);
    }
  }, [categoria, filtros]);

  // ── Exportación ──────────────────────────────────────

  async function handleExportar(formato) {
    if (!filas.length) return;
    setExportando(true);
    try {
      const fecha   = new Date().toISOString().slice(0, 10);
      const nombre  = `Informe_${categoria.label.replace(/\s+/g, '_')}_${fecha}`;
      const titulo  = `${categoria.label} — Healthy Servicios de Catering — ${fecha}`;
      if (formato === 'excel') await exportarExcel(filas, nombre, titulo);
      else                     await exportarPDF(filas, nombre, titulo);
    } catch (e) {
      setError('Error generando el archivo: ' + (e.message || 'intenta de nuevo'));
    } finally {
      setExportando(false);
    }
  }

  // ── Render ────────────────────────────────────────────

  return (
    <div className="min-h-content bg-app">
      <div className="page-container" style={{ maxWidth: 1100 }}>

        {/* ── Header ── */}
        <div className="section-header mb-6">
          <div className="flex items-center gap-3 mb-1">
            <FileText size={22} className="text-primary" />
            <h1 className="section-title">Generador de Informes</h1>
          </div>
          <p className="section-subtitle">
            Exporta cualquier dato del sistema en Excel o PDF con los filtros que necesites.
          </p>
        </div>

        {/* ── Indicador de pasos ── */}
        <PasoIndicador paso={paso} categoria={categoria} />

        {/* ── Contenido por paso ── */}
        {paso === 1 && (
          <PasoCategorias onElegir={elegirCategoria} />
        )}

        {paso === 2 && categoria && (
          <PasoFiltros
            categoria={categoria}
            filtros={filtros}
            onChange={setFiltros}
            proveedores={proveedores}
            productos={productos}
            onVolver={volver}
            onConsultar={consultarDatos}
            cargando={cargando}
            error={error}
          />
        )}

        {paso === 3 && categoria && (
          <PasoPrevia
            categoria={categoria}
            filas={filas}
            onVolver={volver}
            onExportar={handleExportar}
            exportando={exportando}
            error={error}
          />
        )}

      </div>
    </div>
  );
}

// ── Paso 0 — Indicador visual de progreso ────────────────

function PasoIndicador({ paso, categoria }) {
  const pasos = [
    { n: 1, label: 'Tipo de informe' },
    { n: 2, label: 'Filtros'         },
    { n: 3, label: 'Vista previa'    },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {pasos.map((p, i) => (
        <div key={p.n} className="flex items-center" style={{ flex: i < pasos.length - 1 ? 1 : 'unset' }}>
          <div className="flex flex-col items-center">
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: paso > p.n ? 'var(--color-primary)' : paso === p.n ? 'var(--color-primary)' : 'var(--color-border)',
              color: paso >= p.n ? '#fff' : 'var(--color-text-muted)',
              fontWeight: 700, fontSize: '0.9rem',
              transition: 'all 0.3s',
            }}>
              {paso > p.n ? <Check size={16} /> : p.n}
            </div>
            <span style={{
              fontSize: '0.7rem', marginTop: 4, fontWeight: paso === p.n ? 600 : 400,
              color: paso >= p.n ? 'var(--color-primary)' : 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
            }}>
              {p.label}
              {p.n === 1 && paso > 1 && categoria && (
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                  {' — '}{categoria.label}
                </span>
              )}
            </span>
          </div>
          {i < pasos.length - 1 && (
            <div style={{
              flex: 1, height: 2, margin: '0 8px', marginBottom: 18,
              background: paso > p.n ? 'var(--color-primary)' : 'var(--color-border)',
              transition: 'background 0.3s',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Paso 1 — Selección de categoría ──────────────────────

function PasoCategorias({ onElegir }) {
  return (
    <div>
      <p className="text-sm text-muted mb-5 font-medium">
        Elige qué información quieres exportar:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIAS.map(cat => (
          <button
            key={cat.id}
            onClick={() => onElegir(cat)}
            className="card text-left p-6 cursor-pointer"
            style={{ transition: 'box-shadow 0.2s, transform 0.15s', border: '1px solid var(--color-border)' }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = cat.color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.transform = '';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: cat.bg, color: cat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              {cat.icono}
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {cat.label}
              </h3>
              <ChevronRight size={16} style={{ color: cat.color, flexShrink: 0 }} />
            </div>
            <p className="text-xs text-muted leading-relaxed">{cat.descripcion}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Paso 2 — Filtros ──────────────────────────────────────

function PasoFiltros({ categoria, filtros, onChange, proveedores, productos, onVolver, onConsultar, cargando, error }) {
  const set = (campo) => (e) => onChange(prev => ({ ...prev, [campo]: e.target.value }));

  const campoFecha = (label, campo) => (
    <div>
      <label className="form-label flex items-center gap-1">
        <Calendar size={13} className="text-muted" />
        {label}
      </label>
      <input
        type="date"
        value={filtros[campo] || ''}
        onChange={set(campo)}
        className="form-input"
        max={hoy}
      />
    </div>
  );

  const campoMes = (label, campo) => (
    <div>
      <label className="form-label flex items-center gap-1">
        <Calendar size={13} className="text-muted" />
        {label}
      </label>
      <input
        type="month"
        value={filtros[campo] || ''}
        onChange={set(campo)}
        className="form-input"
      />
    </div>
  );

  const campoSelect = (label, campo, opciones) => (
    <div>
      <label className="form-label flex items-center gap-1">
        <Filter size={13} className="text-muted" />
        {label} <span className="text-muted font-normal">(opcional)</span>
      </label>
      <select value={filtros[campo] || ''} onChange={set(campo)} className="form-input">
        <option value="">Todos</option>
        {opciones.map(op => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
    </div>
  );

  const renderFiltros = () => {
    switch (categoria.id) {
      case 'facturas':
        return (
          <>
            {campoFecha('Fecha factura desde', 'fechaDesde')}
            {campoFecha('Fecha factura hasta', 'fechaHasta')}
            {campoSelect('Proveedor', 'proveedor_id',
              proveedores.map(p => ({ value: p.id, label: p.nombre }))
            )}
            {campoSelect('Estado de recepción', 'estadoRecepcion', [
              { value: 'recibido_completo', label: 'Recibido completo' },
              { value: 'recibido_parcial',  label: 'Recibido parcial'  },
            ])}
          </>
        );

      case 'solicitudes':
        return (
          <>
            {campoFecha('Fecha solicitud desde', 'fechaDesde')}
            {campoFecha('Fecha solicitud hasta', 'fechaHasta')}
            {campoSelect('Proveedor', 'proveedor_id',
              proveedores.map(p => ({ value: p.id, label: p.nombre }))
            )}
            {campoSelect('Estado final', 'estado', [
              { value: 'pendiente',          label: 'Pendiente'           },
              { value: 'revision_aux',       label: 'En revisión aux.'    },
              { value: 'aprobado_auxiliar',  label: 'Aprobado por aux.'   },
              { value: 'en_compra',          label: 'En compra'           },
              { value: 'comprado',           label: 'Comprado'            },
              { value: 'recibido_completo',  label: 'Recibido completo'   },
              { value: 'recibido_parcial',   label: 'Recibido parcial'    },
              { value: 'rechazado',          label: 'Rechazado'           },
              { value: 'rechazado_auxiliar', label: 'Rechazado por aux.'  },
            ])}
          </>
        );

      case 'movimientos':
        return (
          <>
            {campoFecha('Fecha desde', 'fechaDesde')}
            {campoFecha('Fecha hasta', 'fechaHasta')}
            {campoSelect('Tipo de movimiento', 'tipoMovimiento', [
              { value: 'entrada', label: '↑ Entradas (compras)' },
              { value: 'salida',  label: '↓ Salidas (consumo)'  },
            ])}
            {campoSelect('Producto específico', 'producto_id',
              productos.map(p => ({ value: p.id, label: `${p.codigo ? p.codigo + ' — ' : ''}${p.nombre}` }))
            )}
          </>
        );

      case 'empleados':
        return (
          <>
            {campoSelect('Estado del empleado', 'estadoEmpleado', [
              { value: 'activo',   label: 'Activos'   },
              { value: 'inactivo', label: 'Inactivos' },
            ])}
            {campoSelect('Tipo de empleado', 'tipoEmpleado', [
              { value: 'Producción',    label: 'Producción'    },
              { value: 'Administración',label: 'Administración'},
            ])}
            {campoSelect('Tipo de contrato', 'tipoContrato', [
              { value: 'Indefinido',           label: 'Indefinido'            },
              { value: 'Fijo',                 label: 'Fijo'                  },
              { value: 'Obra o Labor',          label: 'Obra o Labor'          },
              { value: 'Contrato aprendizaje', label: 'Contrato aprendizaje'  },
              { value: 'Contratistas',          label: 'Contratistas'          },
            ])}
          </>
        );

      case 'presupuesto':
        return (
          <>
            {campoMes('Mes desde', 'mesDesde')}
            {campoMes('Mes hasta', 'mesHasta')}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="card">
      {/* Cabecera de la categoría elegida */}
      <div className="card-header">
        <div className="flex items-center gap-4">
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: categoria.bg, color: categoria.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {categoria.icono}
          </div>
          <div>
            <h2 className="font-semibold text-primary">{categoria.label}</h2>
            <p className="text-xs text-muted mt-0.5">{categoria.descripcion}</p>
          </div>
        </div>
      </div>

      <div className="card-body">
        <div className="flex items-center gap-2 mb-5">
          <SlidersHorizontal size={16} className="text-primary" />
          <h3 className="font-semibold text-sm">Configura los filtros</h3>
          <span className="text-xs text-muted">— Los filtros sin valor incluirán todos los registros</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {renderFiltros()}
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error/10 border border-error/30 text-sm text-error mb-4">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>

      <div className="card-footer flex items-center justify-between">
        <button onClick={onVolver} className="btn btn-outline flex items-center gap-2">
          <ChevronLeft size={16} />
          Cambiar tipo
        </button>
        <button
          onClick={onConsultar}
          disabled={cargando}
          className="btn btn-primary flex items-center gap-2"
          style={{ background: categoria.color, borderColor: categoria.color }}
        >
          {cargando
            ? <><Loader2 size={16} className="animate-spin" /> Consultando...</>
            : <><Eye size={16} /> Ver vista previa</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Paso 3 — Vista previa y exportación ──────────────────

function PasoPrevia({ categoria, filas, onVolver, onExportar, exportando, error }) {
  const [paginaActual, setPaginaActual] = useState(1);
  const POR_PAGINA = 15;

  const totalPaginas = Math.ceil(filas.length / POR_PAGINA);
  const filasPagina  = filas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const columnas     = filas.length > 0 ? Object.keys(filas[0]) : [];

  // Columnas a mostrar en la preview (máximo 8 para no saturar)
  const COL_PREVIEW = 8;
  const colsVis     = columnas.slice(0, COL_PREVIEW);
  const hayMasCols  = columnas.length > COL_PREVIEW;

  return (
    <div className="space-y-4">
      {/* Cabecera con resumen */}
      <div className="card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: categoria.bg, color: categoria.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {categoria.icono}
            </div>
            <div>
              <h2 className="font-semibold">{categoria.label}</h2>
              <p className="text-xs text-muted mt-0.5">
                {filas.length === 0
                  ? 'No se encontraron registros con esos filtros'
                  : `${filas.length} registro${filas.length !== 1 ? 's' : ''} encontrado${filas.length !== 1 ? 's' : ''} · ${columnas.length} columnas`
                }
              </p>
            </div>
          </div>

          {filas.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onExportar('excel')}
                disabled={exportando}
                className="btn btn-outline flex items-center gap-2"
                style={{ borderColor: '#22c55e', color: '#22c55e' }}
              >
                {exportando
                  ? <Loader2 size={15} className="animate-spin" />
                  : <FileSpreadsheet size={15} />
                }
                Excel
              </button>
              <button
                onClick={() => onExportar('pdf')}
                disabled={exportando}
                className="btn btn-primary flex items-center gap-2"
                style={{ background: categoria.color, borderColor: categoria.color }}
              >
                {exportando
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Download size={15} />
                }
                PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error/10 border border-error/30 text-sm text-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Tabla de vista previa */}
      {filas.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={48} className="mx-auto mb-4 text-muted" style={{ opacity: 0.3 }} />
          <p className="font-semibold text-primary mb-1">Sin resultados</p>
          <p className="text-sm text-muted mb-5">No hay datos para los filtros seleccionados. Prueba ampliando el rango de fechas.</p>
          <button onClick={onVolver} className="btn btn-outline">
            <ChevronLeft size={15} className="mr-1" /> Ajustar filtros
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {hayMasCols && (
            <div className="px-5 py-2.5 bg-warning/10 border-b border-warning/30 text-xs text-warning font-medium flex items-center gap-2">
              <AlertCircle size={13} />
              Vista previa muestra las primeras {COL_PREVIEW} de {columnas.length} columnas.
              El archivo exportado incluye todas.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="table" style={{ minWidth: 600 }}>
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell text-center" style={{ width: 40 }}>#</th>
                  {colsVis.map(col => (
                    <th key={col} className="table-header-cell">{col}</th>
                  ))}
                  {hayMasCols && (
                    <th className="table-header-cell text-muted text-center">
                      +{columnas.length - COL_PREVIEW} más
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filasPagina.map((fila, i) => (
                  <tr key={i} className="table-row">
                    <td className="table-cell text-center text-muted text-xs">
                      {(paginaActual - 1) * POR_PAGINA + i + 1}
                    </td>
                    {colsVis.map(col => (
                      <td key={col} className="table-cell text-xs">
                        <span title={String(fila[col] ?? '')}>
                          {truncar(String(fila[col] ?? ''), 40)}
                        </span>
                      </td>
                    ))}
                    {hayMasCols && (
                      <td className="table-cell text-center text-muted text-xs">…</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="card-footer flex items-center justify-between">
              <p className="text-xs text-muted">
                Página {paginaActual} de {totalPaginas} · {filas.length} registros
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="btn btn-outline text-xs !py-1 !px-3"
                >
                  <ChevronLeft size={13} />
                </button>
                {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                  const num = Math.max(1, Math.min(paginaActual - 2, totalPaginas - 4)) + i;
                  return (
                    <button
                      key={num}
                      onClick={() => setPaginaActual(num)}
                      className={`btn text-xs !py-1 !px-3 ${paginaActual === num ? 'btn-primary' : 'btn-outline'}`}
                      style={paginaActual === num ? { background: categoria.color, borderColor: categoria.color } : {}}
                    >
                      {num}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="btn btn-outline text-xs !py-1 !px-3"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botón volver */}
      <div className="flex justify-start">
        <button onClick={onVolver} className="btn btn-outline flex items-center gap-2">
          <ChevronLeft size={15} />
          Ajustar filtros
        </button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

function truncar(texto, max) {
  if (!texto) return '';
  return texto.length > max ? texto.slice(0, max) + '…' : texto;
}
