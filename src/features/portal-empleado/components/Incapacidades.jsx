// src/features/portal-empleado/components/Incapacidades.jsx
// Vista empleado: reportar incapacidades y ver historial
import React, { useState, useRef, useCallback } from "react";
import {
  Shield, Upload, X, Loader2, FileText, Download,
  CheckCircle, Clock, XCircle, AlertCircle, Plus,
} from "lucide-react";
import { useIncapacidades, useReportarIncapacidad, useIncapacidadDocUrl } from "../hooks/useIncapacidades";

const TIPOS_INCAPACIDAD = [
  { value: "enfermedad_general",    label: "Enfermedad general" },
  { value: "accidente_laboral",     label: "Accidente laboral" },
  { value: "accidente_transito",    label: "Accidente de tránsito" },
  { value: "maternidad_paternidad", label: "Maternidad / Paternidad" },
];

const ESTADO_CONFIG = {
  pendiente: { label: "Pendiente", cls: "bg-warning/10 text-warning",  icon: Clock },
  aprobado:  { label: "Aprobado",  cls: "bg-success/10 text-success",  icon: CheckCircle },
  rechazado: { label: "Rechazado", cls: "bg-error/10 text-error",      icon: XCircle },
  pagado:    { label: "Pagado",    cls: "bg-primary/10 text-primary",  icon: CheckCircle },
};

function PillEstado({ estado }) {
  const cfg = ESTADO_CONFIG[estado] ?? { label: estado, cls: "bg-muted/10 text-muted", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ── Formulario ────────────────────────────────────────────────────────────────

function FormularioIncapacidad({ empleadoId, onCerrar }) {
  const [tipo, setTipo] = useState("enfermedad_general");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [entidad, setEntidad] = useState("");
  const [radicado, setRadicado] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const reportar = useReportarIncapacidad(empleadoId);

  const setArchivoSeguro = useCallback((file) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      return;
    }
    setArchivo(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    setArchivoSeguro(file);
  }, [setArchivoSeguro]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fechaInicio || !fechaFin) return;

    await reportar.mutateAsync({
      datos: {
        tipo,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        diagnostico,
        entidad_emisora: entidad,
        numero_radicado: radicado,
        observaciones,
      },
      archivo,
    });
    onCerrar();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-primary">Nueva incapacidad</h3>
        <button type="button" onClick={onCerrar} className="text-muted hover:text-primary">
          <X size={18} />
        </button>
      </div>

      <div>
        <label className="form-label">Tipo de incapacidad</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="form-input">
          {TIPOS_INCAPACIDAD.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Fecha inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="form-input"
            required
          />
        </div>
        <div>
          <label className="form-label">Fecha fin</label>
          <input
            type="date"
            value={fechaFin}
            min={fechaInicio}
            onChange={(e) => setFechaFin(e.target.value)}
            className="form-input"
            required
          />
        </div>
      </div>

      <div>
        <label className="form-label">Diagnóstico (opcional)</label>
        <input
          type="text"
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
          className="form-input"
          placeholder="CIE-10 o descripción del diagnóstico"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Entidad que emite</label>
          <input
            type="text"
            value={entidad}
            onChange={(e) => setEntidad(e.target.value)}
            className="form-input"
            placeholder="EPS, ARL, médico..."
          />
        </div>
        <div>
          <label className="form-label">Número de radicado</label>
          <input
            type="text"
            value={radicado}
            onChange={(e) => setRadicado(e.target.value)}
            className="form-input"
            placeholder="Opcional"
          />
        </div>
      </div>

      {/* Zona drag & drop PDF */}
      <div>
        <label className="form-label">Documento soporte (PDF, máx 10MB)</label>
        {archivo ? (
          <div className="flex items-center gap-3 p-3 border border-base rounded-base bg-hover">
            <FileText size={18} className="text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary truncate">{archivo.name}</p>
              <p className="text-xs text-muted">{(archivo.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              type="button"
              onClick={() => setArchivo(null)}
              className="text-muted hover:text-error"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-base p-6 text-center cursor-pointer transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-base hover:border-primary/50 hover:bg-hover"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => setArchivoSeguro(e.target.files?.[0] ?? null)}
            />
            <Upload size={20} className="mx-auto mb-2 text-muted" />
            <p className="text-sm text-muted">Arrastra el PDF o haz clic para seleccionar</p>
            <p className="text-xs text-muted mt-1">Solo PDF · Máximo 10 MB</p>
          </div>
        )}
      </div>

      <div>
        <label className="form-label">Observaciones (opcional)</label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="form-input"
          rows={2}
          placeholder="Información adicional..."
        />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCerrar} className="btn btn-outline btn-sm">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={reportar.isPending || !fechaInicio || !fechaFin}
          className="btn btn-primary btn-sm flex items-center gap-2"
        >
          {reportar.isPending ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
          Registrar incapacidad
        </button>
      </div>
    </form>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Incapacidades({ empleadoId }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const { data: incapacidades = [], isLoading } = useIncapacidades(empleadoId);
  const descargarDoc = useIncapacidadDocUrl();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Mis Incapacidades</h2>
          <p className="text-sm text-muted mt-0.5">Registra y consulta tus incapacidades médicas.</p>
        </div>
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="btn btn-primary btn-sm flex items-center gap-2"
          >
            <Plus size={15} />
            Reportar
          </button>
        )}
      </div>

      {mostrarForm && (
        <div className="card p-5">
          <FormularioIncapacidad
            empleadoId={empleadoId}
            onCerrar={() => setMostrarForm(false)}
          />
        </div>
      )}

      {/* Historial */}
      <div>
        <h3 className="font-medium text-primary text-sm mb-3">Historial</h3>
        {incapacidades.length === 0 ? (
          <div className="card p-8 text-center">
            <Shield size={32} className="mx-auto mb-3 text-muted" />
            <p className="text-muted text-sm">No tienes incapacidades registradas.</p>
          </div>
        ) : (
          <div className="card divide-y divide-base">
            {incapacidades.map((inc) => {
              const tipoLabel =
                TIPOS_INCAPACIDAD.find((t) => t.value === inc.tipo)?.label ?? inc.tipo;
              return (
                <div key={inc.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-primary text-sm">{tipoLabel}</p>
                        <PillEstado estado={inc.estado} />
                      </div>
                      <p className="text-xs text-muted">
                        {inc.fecha_inicio} → {inc.fecha_fin}
                        {inc.dias_incapacidad ? ` · ${inc.dias_incapacidad} días` : ""}
                      </p>
                      {inc.diagnostico && (
                        <p className="text-xs text-muted mt-0.5">Diagnóstico: {inc.diagnostico}</p>
                      )}
                      {inc.entidad_emisora && (
                        <p className="text-xs text-muted">Entidad: {inc.entidad_emisora}</p>
                      )}
                    </div>

                    {inc.archivo_path && (
                      <button
                        onClick={() => descargarDoc.mutate(inc.archivo_path)}
                        disabled={descargarDoc.isPending}
                        className="btn btn-outline btn-sm flex-shrink-0 flex items-center gap-1.5"
                        title="Descargar documento"
                      >
                        {descargarDoc.isPending ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Download size={13} />
                        )}
                        Doc
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
