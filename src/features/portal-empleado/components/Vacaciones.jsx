// src/features/portal-empleado/components/Vacaciones.jsx
// Vista empleado: solicitar y ver historial de vacaciones
import React, { useState } from "react";
import {
  Umbrella, Plus, X, Loader2, AlertCircle, CheckCircle,
  Clock, XCircle, Calendar,
} from "lucide-react";
import { useVacaciones, useDiasDisponibles, useCrearSolicitudVacaciones } from "../hooks/useVacaciones";
import { calcularDiasCalendario } from "../services/vacacionesService";

// ── Pill de estado ────────────────────────────────────────────────────────────

const ESTADO_CONFIG = {
  pendiente:  { label: "Pendiente",  cls: "bg-warning/10 text-warning",  icon: Clock },
  aprobado:   { label: "Aprobado",   cls: "bg-success/10 text-success",  icon: CheckCircle },
  rechazado:  { label: "Rechazado",  cls: "bg-error/10 text-error",      icon: XCircle },
  disfrutado: { label: "Disfrutado", cls: "bg-primary/10 text-primary",  icon: CheckCircle },
  en_curso:   { label: "En curso",   cls: "bg-info/10 text-info",        icon: Clock },
  programado: { label: "Programado", cls: "bg-success/10 text-success",  icon: Calendar },
  compensado: { label: "Compensado", cls: "bg-muted/10 text-muted",      icon: CheckCircle },
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

// ── Formulario de solicitud ───────────────────────────────────────────────────

function FormularioSolicitud({ empleadoId, diasDisponibles, onCerrar }) {
  const [tipo, setTipo] = useState("ordinarias");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const crear = useCrearSolicitudVacaciones(empleadoId);
  const diasSolicitados = calcularDiasCalendario(fechaInicio, fechaFin);

  // Fecha mínima: 15 días a partir de hoy
  const hoy = new Date();
  const minFecha = new Date(hoy);
  minFecha.setDate(hoy.getDate() + 15);
  const minFechaStr = minFecha.toISOString().split("T")[0];

  const excedeDias = diasSolicitados > 30;
  const sinSaldo   = diasSolicitados > diasDisponibles;
  const invalido   = excedeDias || sinSaldo;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fechaInicio || !fechaFin || invalido) return;
    await crear.mutateAsync({
      tipo,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      dias_solicitados: diasSolicitados,
      observaciones,
    });
    onCerrar();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-primary">Nueva solicitud</h3>
        <button type="button" onClick={onCerrar} className="text-muted hover:text-primary">
          <X size={18} />
        </button>
      </div>

      <div>
        <label className="form-label">Tipo de vacaciones</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="form-input">
          <option value="ordinarias">Ordinarias</option>
          <option value="compensatorias">Compensatorias</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Fecha inicio</label>
          <input
            type="date"
            value={fechaInicio}
            min={minFechaStr}
            onChange={(e) => { setFechaInicio(e.target.value); setFechaFin(""); }}
            className="form-input"
            required
          />
        </div>
        <div>
          <label className="form-label">Fecha fin</label>
          <input
            type="date"
            value={fechaFin}
            min={fechaInicio || minFechaStr}
            onChange={(e) => setFechaFin(e.target.value)}
            className="form-input"
            required
            disabled={!fechaInicio}
          />
        </div>
      </div>

      {diasSolicitados > 0 && (
        <div className={`p-3 rounded-base text-sm border ${
          invalido
            ? "bg-error/5 border-error/30 text-error"
            : "bg-success/5 border-success/30 text-success"
        }`}>
          <p className="font-medium">Días solicitados: {diasSolicitados}</p>
          {excedeDias && <p className="text-xs mt-0.5">Máximo 30 días consecutivos por solicitud</p>}
          {sinSaldo && !excedeDias && (
            <p className="text-xs mt-0.5">Sin saldo suficiente (disponibles: {diasDisponibles} días)</p>
          )}
        </div>
      )}

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

      <div className="p-3 rounded-base bg-hover text-xs text-muted space-y-1">
        <p>• Mínimo 15 días de anticipación para solicitar</p>
        <p>• Máximo 30 días consecutivos por solicitud</p>
        <p>• Sujeto a aprobación del área de nómina</p>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCerrar} className="btn btn-outline btn-sm">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={crear.isPending || diasSolicitados <= 0 || invalido}
          className="btn btn-primary btn-sm flex items-center gap-2"
        >
          {crear.isPending ? <Loader2 size={14} className="animate-spin" /> : <Umbrella size={14} />}
          Enviar solicitud
        </button>
      </div>
    </form>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Vacaciones({ empleadoId, empleado }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const { data: vacaciones = [], isLoading } = useVacaciones(empleadoId);
  const { data: saldo } = useDiasDisponibles(empleadoId);

  const diasDisponibles = saldo?.diasDisponibles ?? 0;
  const diasCausados    = saldo?.diasCausados    ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Mis Vacaciones</h2>
          <p className="text-sm text-muted mt-0.5">Solicita y consulta el estado de tus vacaciones.</p>
        </div>
        {!mostrarForm && (
          <button
            onClick={() => setMostrarForm(true)}
            className="btn btn-primary btn-sm flex items-center gap-2"
          >
            <Plus size={15} />
            Solicitar
          </button>
        )}
      </div>

      {/* Saldo de días */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-primary">{diasDisponibles}</p>
          <p className="text-xs text-muted mt-1">Días disponibles</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-secondary">{saldo?.diasTomados ?? 0}</p>
          <p className="text-xs text-muted mt-1">Días disfrutados</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-muted">{diasCausados}</p>
          <p className="text-xs text-muted mt-1">Días causados</p>
        </div>
      </div>

      {/* Barra progreso */}
      {diasCausados > 0 && (
        <div>
          <div className="w-full h-2 bg-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(100, ((saldo?.diasTomados ?? 0) / diasCausados) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-1">
            {saldo?.diasTomados ?? 0} de {diasCausados} días causados utilizados
          </p>
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <div className="card p-5">
          <FormularioSolicitud
            empleadoId={empleadoId}
            diasDisponibles={diasDisponibles}
            onCerrar={() => setMostrarForm(false)}
          />
        </div>
      )}

      {/* Historial */}
      <div>
        <h3 className="font-medium text-primary text-sm mb-3">Historial de solicitudes</h3>
        {vacaciones.length === 0 ? (
          <div className="card p-8 text-center">
            <Umbrella size={32} className="mx-auto mb-3 text-muted" />
            <p className="text-muted text-sm">No tienes solicitudes de vacaciones registradas.</p>
          </div>
        ) : (
          <div className="card divide-y divide-base">
            {vacaciones.map((v) => (
              <div key={v.id} className="p-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-medium text-primary text-sm capitalize">
                    {v.tipo ?? "Ordinarias"}
                  </p>
                  <PillEstado estado={v.estado} />
                </div>
                <p className="text-xs text-muted">
                  {v.fecha_inicio} → {v.fecha_fin}
                  {v.dias_solicitados ? ` · ${v.dias_solicitados} días` : ""}
                </p>
                {v.observaciones && (
                  <p className="text-xs text-muted mt-1 italic">{v.observaciones}</p>
                )}
                {v.estado === "rechazado" && v.motivo_rechazo && (
                  <div className="flex items-start gap-1 mt-1.5 text-xs text-error">
                    <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                    <span>Motivo: {v.motivo_rechazo}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
