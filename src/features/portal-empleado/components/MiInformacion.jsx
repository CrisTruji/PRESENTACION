// src/features/portal-empleado/components/MiInformacion.jsx
// Vista de información personal del empleado - puede editar correo, teléfono, dirección
import React, { useState, useEffect } from "react";
import {
  User, Briefcase, MapPin, Phone, Mail, Calendar, Shield,
  Edit, Save, X, Loader2, Heart, Award
} from "lucide-react";
import { useUpdateDatosPersonales } from "../hooks/useEmpleadoPerfil";
import notify from "@/shared/lib/notifier";

function CampoInfo({ label, valor, icon: Icon }) {
  return (
    <div>
      <p className="text-xs text-muted flex items-center gap-1 mb-0.5">
        {Icon && <Icon size={11} />}
        {label}
      </p>
      <p className="text-sm font-medium text-primary">{valor || <span className="text-muted italic">No registrado</span>}</p>
    </div>
  );
}

export default function MiInformacion({ empleado }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm]         = useState({ correo: "", telefono: "", direccion: "" });
  const mutation                = useUpdateDatosPersonales();

  const th  = empleado?.empleados_talento_humano;
  const sst = empleado?.empleados_sst;

  useEffect(() => {
    if (empleado) {
      setForm({
        correo:    empleado.correo    ?? "",
        telefono:  empleado.telefono  ?? "",
        direccion: empleado.direccion ?? "",
      });
    }
  }, [empleado]);

  function handleCancel() {
    setForm({
      correo:    empleado.correo    ?? "",
      telefono:  empleado.telefono  ?? "",
      direccion: empleado.direccion ?? "",
    });
    setEditando(false);
  }

  async function handleGuardar() {
    if (form.correo && !/^\S+@\S+\.\S+$/.test(form.correo)) {
      notify.error("Formato de correo inválido");
      return;
    }
    mutation.mutate(
      { empleadoId: empleado.id, datos: form },
      { onSuccess: () => setEditando(false) }
    );
  }

  const fechaIngreso = th?.fecha_ingreso
    ? new Date(th.fecha_ingreso).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })
    : empleado?.fecha_ingreso
      ? new Date(empleado.fecha_ingreso).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })
      : null;

  return (
    <div className="space-y-6">
      {/* ── Header con Avatar ── */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ background: "var(--color-primary)" }}
          >
            {empleado?.nombres?.[0]}{empleado?.apellidos?.[0]}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-primary">
              {empleado?.nombres} {empleado?.apellidos}
            </h1>
            <p className="text-muted text-sm">{empleado?.cargo || "Sin cargo registrado"}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {empleado?.tipo_vinculacion && (
                <span className="badge badge-primary text-xs">{empleado.tipo_vinculacion}</span>
              )}
              {th?.tipo_contrato && (
                <span className="badge badge-outline text-xs">{th.tipo_contrato}</span>
              )}
              <span className={`badge text-xs ${empleado?.activo === 'true' || empleado?.activo === true ? "badge-success" : "badge-error"}`}>
                {empleado?.activo === 'true' || empleado?.activo === true ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
          {!editando && (
            <button
              onClick={() => setEditando(true)}
              className="btn btn-outline flex items-center gap-2 text-sm"
            >
              <Edit size={15} />
              Editar datos
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Datos Personales ── */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-primary flex items-center gap-2">
              <User size={16} />
              Datos Personales
            </h2>
          </div>
          <div className="card-body space-y-4">
            <CampoInfo label="Cédula / Documento" valor={empleado?.documento_identidad} />
            <CampoInfo label="Ciudad" valor={empleado?.ciudad} icon={MapPin} />
            <CampoInfo label="RH (Tipo de Sangre)" valor={empleado?.rh} icon={Heart} />

            {/* Campos editables */}
            {editando ? (
              <div className="space-y-3 pt-2 border-t border-base">
                <p className="text-xs text-muted font-semibold uppercase tracking-wider">Puedes editar:</p>
                <div>
                  <label className="form-label">Correo electrónico</label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
                    className="form-input"
                    placeholder="tu@correo.com"
                  />
                </div>
                <div>
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                    className="form-input"
                    placeholder="300 000 0000"
                  />
                </div>
                <div>
                  <label className="form-label">Dirección</label>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                    className="form-input"
                    placeholder="Calle 123 # 45-67"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleGuardar}
                    disabled={mutation.isPending}
                    className="btn btn-primary flex items-center gap-2 text-sm"
                  >
                    {mutation.isPending
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Save size={14} />
                    }
                    Guardar
                  </button>
                  <button onClick={handleCancel} className="btn btn-outline text-sm">
                    <X size={14} />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <CampoInfo label="Correo electrónico" valor={empleado?.correo} icon={Mail} />
                <CampoInfo label="Teléfono" valor={empleado?.telefono} icon={Phone} />
                <CampoInfo label="Dirección" valor={empleado?.direccion} icon={MapPin} />
              </>
            )}
          </div>
        </div>

        {/* ── Datos Laborales ── */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-primary flex items-center gap-2">
              <Briefcase size={16} />
              Información Laboral
            </h2>
          </div>
          <div className="card-body space-y-4">
            <CampoInfo label="Cargo" valor={empleado?.cargo} icon={Award} />
            <CampoInfo label="Tipo de vinculación" valor={empleado?.tipo_vinculacion} />
            <CampoInfo label="Tipo de contrato" valor={th?.tipo_contrato} />
            <CampoInfo label="Unidad / Sede" valor={empleado?.ciudad} icon={MapPin} />
            <CampoInfo label="Fecha de ingreso" valor={fechaIngreso} icon={Calendar} />
            {empleado?.fecha_retiro && (
              <CampoInfo
                label="Fecha de retiro"
                valor={new Date(empleado.fecha_retiro).toLocaleDateString("es-CO")}
                icon={Calendar}
              />
            )}
          </div>
        </div>

        {/* ── Seguridad Social ── */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-primary flex items-center gap-2">
              <Shield size={16} />
              Seguridad Social
            </h2>
          </div>
          <div className="card-body space-y-4">
            <CampoInfo label="EPS" valor={empleado?.eps || th?.eps} />
            <CampoInfo label="AFP / Pensión" valor={empleado?.afp || th?.afp} />
            <CampoInfo label="ARL" valor={empleado?.arl || sst?.arl} />
            <CampoInfo label="Caja de Compensación" valor={empleado?.caja_compensacion || sst?.caja_compensacion} />
          </div>
        </div>

        {/* ── SST ── */}
        {sst && (
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-primary flex items-center gap-2">
                <Shield size={16} />
                Salud y Seguridad (SST)
              </h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Examen médico", valor: sst.examenes_medicos },
                  { label: "Curso manipulación", valor: sst.curso_manipulacion },
                  { label: "Inducción", valor: sst.induccion },
                  { label: "COVID-19", valor: sst.covid },
                  { label: "Hepatitis A", valor: sst.hepatitis_a },
                  { label: "Tétano", valor: sst.tetano },
                ].map(({ label, valor }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-base last:border-0">
                    <span className="text-xs text-muted">{label}</span>
                    <span className={`badge text-xs ${valor ? "badge-success" : "badge-error"}`}>
                      {valor ? "Sí" : "No"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted text-center">
        Solo puedes editar correo, teléfono y dirección. Para cambios en cargo, contrato o salario, contacta a Talento Humano.
      </p>
    </div>
  );
}
