// src/screens/admin/Nomina.jsx
// Vista de nómina mensual del administrador
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/shared/api";
import notify from "@/shared/lib/notifier";
import {
  Users,
  DollarSign,
  Calendar,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
  Loader2,
  Download,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  Briefcase,
} from "lucide-react";

// ─── Constantes y Helpers ────────────────────────────────────────────────────

// Parámetros legales Colombia (actualizables en configuración)
const SMMLV_2025 = 1_423_500;
const AUXILIO_TRANSPORTE_2025 = 200_000;
const TOPE_AUXILIO_TRANSPORTE = SMMLV_2025 * 2; // 2 SMMLV

// Porcentajes de deducción empleado
const PCT_SALUD_EMPLEADO = 0.04;     // 4%
const PCT_PENSION_EMPLEADO = 0.04;   // 4%

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatCOP(valor) {
  if (valor == null || isNaN(valor)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

// Calcula los conceptos de nómina de un empleado
function calcularNomina(emp) {
  const salario = emp.salario_base || 0;

  // Auxilio de transporte (solo si salario <= 2 SMMLV)
  const auxilioTransporte = salario <= TOPE_AUXILIO_TRANSPORTE ? AUXILIO_TRANSPORTE_2025 : 0;

  // Devengado
  const devengado = salario + auxilioTransporte;

  // Deducciones a cargo del empleado
  const salud = Math.round(salario * PCT_SALUD_EMPLEADO);
  const pension = Math.round(salario * PCT_PENSION_EMPLEADO);
  const totalDeducciones = salud + pension;

  // Neto a pagar
  const neto = devengado - totalDeducciones;

  return {
    salario_base: salario,
    auxilio_transporte: auxilioTransporte,
    devengado,
    salud,
    pension,
    total_deducciones: totalDeducciones,
    neto,
  };
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function Nomina() {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());

  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroArea, setFiltroArea] = useState("todas");
  const [areas, setAreas] = useState([]);
  const [ordenCampo, setOrdenCampo] = useState("apellidos");
  const [ordenDir, setOrdenDir] = useState("asc");
  const [modalEmp, setModalEmp] = useState(null);    // empleado seleccionado para detalle

  // ── Cargar empleados activos con datos de TH ───────────────────────────────
  async function cargarEmpleados() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("empleados")
        .select(`
          id,
          nombres,
          apellidos,
          documento_identidad,
          cargo,
          area,
          activo,
          empleados_talento_humano (
            salario,
            eps,
            afp,
            tipo_contrato,
            fecha_ingreso,
            caja_compensacion
          )
        `)
        .eq("activo", true)
        .order("apellidos", { ascending: true });

      if (error) throw error;

      // Añadir cálculos de nómina a cada empleado
      const conCalculo = (data || []).map((emp) => {
        const th = emp.empleados_talento_humano?.[0] || {};
        const calculo = calcularNomina({ salario_base: th.salario });
        return {
          ...emp,
          th,
          nomina: calculo,
        };
      });

      setEmpleados(conCalculo);

      // Extraer áreas únicas
      const areasUnicas = [...new Set(conCalculo.map((e) => e.area).filter(Boolean))].sort();
      setAreas(areasUnicas);

      notify.success(`${conCalculo.length} empleados cargados para ${MESES[mes]} ${anio}`);
    } catch (err) {
      console.error(err);
      notify.error("Error al cargar empleados para nómina");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarEmpleados();
  }, []);

  // ── Filtrar y ordenar ──────────────────────────────────────────────────────
  const empFiltrados = empleados
    .filter((e) => {
      const t = busqueda.toLowerCase();
      if (t && !(
        e.nombres?.toLowerCase().includes(t) ||
        e.apellidos?.toLowerCase().includes(t) ||
        e.documento_identidad?.includes(t) ||
        e.cargo?.toLowerCase().includes(t)
      )) return false;
      if (filtroArea !== "todas" && e.area !== filtroArea) return false;
      return true;
    })
    .sort((a, b) => {
      let va, vb;
      if (ordenCampo === "neto") { va = a.nomina.neto; vb = b.nomina.neto; }
      else if (ordenCampo === "salario_base") { va = a.nomina.salario_base; vb = b.nomina.salario_base; }
      else { va = (a[ordenCampo] || "").toLowerCase(); vb = (b[ordenCampo] || "").toLowerCase(); }
      if (ordenDir === "asc") return va > vb ? 1 : -1;
      return va < vb ? 1 : -1;
    });

  // ── Totales globales ───────────────────────────────────────────────────────
  const totales = empFiltrados.reduce(
    (acc, e) => {
      acc.salarios += e.nomina.salario_base;
      acc.aux_transporte += e.nomina.auxilio_transporte;
      acc.devengado += e.nomina.devengado;
      acc.salud += e.nomina.salud;
      acc.pension += e.nomina.pension;
      acc.deducciones += e.nomina.total_deducciones;
      acc.neto += e.nomina.neto;
      return acc;
    },
    { salarios: 0, aux_transporte: 0, devengado: 0, salud: 0, pension: 0, deducciones: 0, neto: 0 }
  );

  function toggleOrden(campo) {
    if (ordenCampo === campo) setOrdenDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setOrdenCampo(campo); setOrdenDir("asc"); }
  }

  const nombreCompleto = (e) => `${e.apellidos}, ${e.nombres}`;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-content bg-app">
      <div className="page-container">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="section-header">
              <h1 className="section-title flex items-center gap-2">
                <DollarSign size={22} className="text-primary" />
                Nómina
              </h1>
              <p className="section-subtitle">
                Liquidación mensual de personal activo
              </p>
            </div>
            <button
              onClick={cargarEmpleados}
              disabled={loading}
              className="btn btn-outline flex items-center gap-2 text-sm !py-1.5"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Actualizar
            </button>
          </div>
        </div>

        {/* ── Selector de período + parámetros ── */}
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <Calendar size={18} /> Período de Nómina
            </h3>
          </div>
          <div className="card-body">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="form-label">Mes</label>
                <select
                  className="form-input"
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                >
                  {MESES.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Año</label>
                <select
                  className="form-input w-28"
                  value={anio}
                  onChange={(e) => setAnio(Number(e.target.value))}
                >
                  {[hoy.getFullYear(), hoy.getFullYear() - 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-muted p-3 rounded-base bg-app border border-base">
                <p className="font-medium text-secondary mb-1">Parámetros aplicados:</p>
                <p>SMMLV 2025: <span className="font-semibold">{formatCOP(SMMLV_2025)}</span></p>
                <p>Auxilio transporte: <span className="font-semibold">{formatCOP(AUXILIO_TRANSPORTE_2025)}</span></p>
                <p>Salud empleado: <span className="font-semibold">4%</span> | Pensión: <span className="font-semibold">4%</span></p>
              </div>
              <button
                onClick={cargarEmpleados}
                className="btn btn-primary"
              >
                Generar nómina
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI cards ── */}
        {!loading && empleados.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="stats-card">
              <div className="stats-icon"><Users size={22} /></div>
              <div className="stats-content">
                <div className="stats-value">{empFiltrados.length}</div>
                <div className="stats-label">Empleados en nómina</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon"><DollarSign size={22} /></div>
              <div className="stats-content">
                <div className="stats-value text-base">{formatCOP(totales.devengado)}</div>
                <div className="stats-label">Total devengado</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon" style={{ background: "rgba(251,113,133,0.1)", color: "var(--color-error)" }}>
                <TrendingDown size={22} />
              </div>
              <div className="stats-content">
                <div className="stats-value text-base text-error">{formatCOP(totales.deducciones)}</div>
                <div className="stats-label">Total deducciones</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon" style={{ background: "rgba(16,185,129,0.1)", color: "var(--color-success)" }}>
                <CheckCircle size={22} />
              </div>
              <div className="stats-content">
                <div className="stats-value text-base text-success">{formatCOP(totales.neto)}</div>
                <div className="stats-label">Total neto a pagar</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className="card p-12 text-center">
            <Loader2 size={36} className="animate-spin mx-auto mb-3 text-primary" />
            <p className="text-muted">Cargando empleados y calculando nómina...</p>
          </div>
        )}

        {/* ── Tabla de nómina ── */}
        {!loading && empleados.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-primary">
                    Detalle de Nómina — {MESES[mes]} {anio}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">{empFiltrados.length} empleados</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Búsqueda */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      placeholder="Buscar empleado..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="form-input pl-8 text-sm !py-1.5 w-44"
                    />
                  </div>
                  {/* Filtro área */}
                  <select
                    className="form-input text-sm !py-1.5"
                    value={filtroArea}
                    onChange={(e) => setFiltroArea(e.target.value)}
                  >
                    <option value="todas">Todas las áreas</option>
                    {areas.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th
                      className="table-header-cell cursor-pointer hover:text-primary"
                      onClick={() => toggleOrden("apellidos")}
                    >
                      <span className="flex items-center gap-1">
                        Empleado
                        {ordenCampo === "apellidos" && (ordenDir === "asc" ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                      </span>
                    </th>
                    <th className="table-header-cell">Cargo / Área</th>
                    <th
                      className="table-header-cell text-right cursor-pointer hover:text-primary"
                      onClick={() => toggleOrden("salario_base")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Salario base
                        {ordenCampo === "salario_base" && (ordenDir === "asc" ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                      </span>
                    </th>
                    <th className="table-header-cell text-right">Aux. Transporte</th>
                    <th className="table-header-cell text-right font-semibold">Devengado</th>
                    <th className="table-header-cell text-right text-error">Salud (4%)</th>
                    <th className="table-header-cell text-right text-error">Pensión (4%)</th>
                    <th className="table-header-cell text-right text-error">Total Deduc.</th>
                    <th
                      className="table-header-cell text-right font-semibold cursor-pointer hover:text-primary"
                      onClick={() => toggleOrden("neto")}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Neto a Pagar
                        {ordenCampo === "neto" && (ordenDir === "asc" ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                      </span>
                    </th>
                    <th className="table-header-cell text-center">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {empFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="table-cell text-center py-10 text-muted">
                        No hay empleados que coincidan con los filtros
                      </td>
                    </tr>
                  ) : (
                    empFiltrados.map((emp) => (
                      <tr key={emp.id} className="table-row">
                        {/* Empleado */}
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="user-avatar !w-8 !h-8 text-xs">
                              {emp.apellidos?.[0]}{emp.nombres?.[0]}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{nombreCompleto(emp)}</div>
                              <div className="text-xs text-muted font-mono">{emp.documento_identidad}</div>
                            </div>
                          </div>
                        </td>
                        {/* Cargo / Área */}
                        <td className="table-cell">
                          <div className="text-sm">{emp.cargo || "—"}</div>
                          {emp.area && (
                            <span className="badge badge-primary text-xs mt-1">{emp.area}</span>
                          )}
                        </td>
                        {/* Salario base */}
                        <td className="table-cell text-right font-semibold">
                          {emp.nomina.salario_base > 0 ? formatCOP(emp.nomina.salario_base) : (
                            <span className="badge badge-warning">Sin salario</span>
                          )}
                        </td>
                        {/* Auxilio transporte */}
                        <td className="table-cell text-right">
                          {emp.nomina.auxilio_transporte > 0 ? (
                            <span className="text-success">{formatCOP(emp.nomina.auxilio_transporte)}</span>
                          ) : (
                            <span className="text-xs text-muted">No aplica</span>
                          )}
                        </td>
                        {/* Devengado */}
                        <td className="table-cell text-right">
                          <span className="font-bold">{formatCOP(emp.nomina.devengado)}</span>
                        </td>
                        {/* Salud */}
                        <td className="table-cell text-right text-error text-sm">
                          ({formatCOP(emp.nomina.salud)})
                        </td>
                        {/* Pensión */}
                        <td className="table-cell text-right text-error text-sm">
                          ({formatCOP(emp.nomina.pension)})
                        </td>
                        {/* Total deducciones */}
                        <td className="table-cell text-right">
                          <span className="text-error font-semibold">({formatCOP(emp.nomina.total_deducciones)})</span>
                        </td>
                        {/* Neto */}
                        <td className="table-cell text-right">
                          <span className="font-bold text-success text-base">{formatCOP(emp.nomina.neto)}</span>
                        </td>
                        {/* Detalle */}
                        <td className="table-cell text-center">
                          <button
                            onClick={() => setModalEmp(emp)}
                            className="btn btn-icon btn-outline"
                            title="Ver desprendible"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* ── Fila de totales ── */}
                {empFiltrados.length > 0 && (
                  <tfoot>
                    <tr className="bg-app border-t-2 border-base">
                      <td colSpan={2} className="table-cell font-bold text-sm">
                        TOTALES ({empFiltrados.length} empleados)
                      </td>
                      <td className="table-cell text-right font-bold">{formatCOP(totales.salarios)}</td>
                      <td className="table-cell text-right font-bold text-success">{formatCOP(totales.aux_transporte)}</td>
                      <td className="table-cell text-right font-bold">{formatCOP(totales.devengado)}</td>
                      <td className="table-cell text-right font-bold text-error">({formatCOP(totales.salud)})</td>
                      <td className="table-cell text-right font-bold text-error">({formatCOP(totales.pension)})</td>
                      <td className="table-cell text-right font-bold text-error">({formatCOP(totales.deducciones)})</td>
                      <td className="table-cell text-right font-bold text-success text-base">{formatCOP(totales.neto)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Footer */}
            <div className="card-footer">
              <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-muted">
                <span>
                  Los cálculos se basan en los salarios registrados en Talento Humano.
                  Ajustar en el perfil del empleado si hay diferencias.
                </span>
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-warning" />
                  <span>Vista informativa — sin parafiscales ni horas extras</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && empleados.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-card bg-app flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Sin empleados activos</h3>
            <p className="text-muted text-sm">
              No hay empleados activos registrados en el sistema.<br />
              Verifica el módulo de Talento Humano.
            </p>
          </div>
        )}

        {/* ── Modal Desprendible ── */}
        {modalEmp && (
          <ModalDesprendible
            emp={modalEmp}
            mes={mes}
            anio={anio}
            onClose={() => setModalEmp(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Modal: Desprendible de Pago ─────────────────────────────────────────────

function ModalDesprendible({ emp, mes, anio, onClose }) {
  const { nomina, th } = emp;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-card shadow-card w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Encabezado */}
        <div className="card-header flex items-center justify-between">
          <div>
            <h3 className="font-bold text-primary">Desprendible de Pago</h3>
            <p className="text-xs text-muted">{MESES[mes]} {anio}</p>
          </div>
          <button onClick={onClose} className="btn btn-icon btn-outline">
            <X size={18} />
          </button>
        </div>

        <div className="card-body space-y-5">

          {/* Datos del empleado */}
          <div className="p-4 rounded-base bg-app border border-base">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
              Información del Empleado
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-muted text-xs">Nombre completo</p>
                <p className="font-semibold">{emp.apellidos}, {emp.nombres}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Documento</p>
                <p className="font-mono">{emp.documento_identidad}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Cargo</p>
                <p>{emp.cargo || "—"}</p>
              </div>
              <div>
                <p className="text-muted text-xs">Área</p>
                <p>{emp.area || "—"}</p>
              </div>
              <div>
                <p className="text-muted text-xs">EPS</p>
                <p>{th?.eps || "—"}</p>
              </div>
              <div>
                <p className="text-muted text-xs">AFP</p>
                <p>{th?.afp || "—"}</p>
              </div>
              {th?.fecha_ingreso && (
                <div>
                  <p className="text-muted text-xs">Fecha de ingreso</p>
                  <p>{new Date(th.fecha_ingreso).toLocaleDateString("es-CO")}</p>
                </div>
              )}
              {th?.tipo_contrato && (
                <div>
                  <p className="text-muted text-xs">Tipo de contrato</p>
                  <p>{th.tipo_contrato}</p>
                </div>
              )}
            </div>
          </div>

          {/* Ingresos */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-success mb-2">
              Ingresos
            </p>
            <div className="space-y-1">
              <FilaConcepto
                label="Salario básico"
                valor={nomina.salario_base}
                tipo="ingreso"
              />
              {nomina.auxilio_transporte > 0 && (
                <FilaConcepto
                  label="Auxilio de transporte"
                  sublabel="(≤ 2 SMMLV)"
                  valor={nomina.auxilio_transporte}
                  tipo="ingreso"
                />
              )}
              <div className="flex justify-between items-center pt-2 border-t border-base font-bold">
                <span className="text-sm">Total Devengado</span>
                <span className="text-success">{formatCOP(nomina.devengado)}</span>
              </div>
            </div>
          </div>

          {/* Deducciones */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-error mb-2">
              Deducciones
            </p>
            <div className="space-y-1">
              <FilaConcepto
                label="Salud"
                sublabel="(4% a cargo empleado)"
                valor={nomina.salud}
                tipo="deduccion"
              />
              <FilaConcepto
                label="Pensión"
                sublabel="(4% a cargo empleado)"
                valor={nomina.pension}
                tipo="deduccion"
              />
              <div className="flex justify-between items-center pt-2 border-t border-base font-bold">
                <span className="text-sm">Total Deducciones</span>
                <span className="text-error">({formatCOP(nomina.total_deducciones)})</span>
              </div>
            </div>
          </div>

          {/* Neto */}
          <div className="p-4 rounded-base bg-primary/10 border border-primary/30 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold">Neto a Pagar</p>
              <p className="text-xs text-muted">{MESES[mes]} {anio}</p>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCOP(nomina.neto)}</p>
          </div>

          {/* Nota */}
          <p className="text-xs text-muted">
            Este desprendible es informativo. No incluye parafiscales del empleador
            (SENA 2%, ICBF 3%, Caja de Compensación 4%), primas, cesantías, ni intereses.
            Los valores se calculan con base en la información registrada en Talento Humano.
          </p>
        </div>

        <div className="card-footer flex gap-3 justify-end">
          <button onClick={onClose} className="btn btn-outline">Cerrar</button>
          <button
            onClick={() => {
              notify.info("Exportación a PDF disponible próximamente");
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Download size={16} />
            Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componente: Fila de concepto en el desprendible ─────────────────────

function FilaConcepto({ label, sublabel, valor, tipo }) {
  return (
    <div className="flex justify-between items-center py-1">
      <div>
        <span className="text-sm">{label}</span>
        {sublabel && <span className="text-xs text-muted ml-1">{sublabel}</span>}
      </div>
      <span className={`font-semibold text-sm ${tipo === "deduccion" ? "text-error" : "text-success"}`}>
        {tipo === "deduccion" ? `(${formatCOP(valor)})` : formatCOP(valor)}
      </span>
    </div>
  );
}
