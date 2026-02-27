// src/features/auth/components/EmpleadoRegistroScreen.jsx
// Flujo de 3 pasos para que un empleado cree su cuenta usando su cédula
import React, { useState } from "react";
import {
  User, Key, CheckCircle, ArrowRight, ArrowLeft,
  Loader2, AlertCircle, Eye, EyeOff, Mail
} from "lucide-react";
import { verificarCedula, crearCuentaEmpleado } from "@/features/portal-empleado/services/portalEmpleadoService";
import { useAuth } from "@/features/auth";
import notify from "@/shared/lib/notifier";

const PASOS = [
  { num: 1, label: "Verifica tu cédula" },
  { num: 2, label: "Crea tu contraseña" },
  { num: 3, label: "¡Listo!" },
];

export default function EmpleadoRegistroScreen({ goToLogin }) {
  const { signIn } = useAuth();
  const [paso, setPaso] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Paso 1 – Cédula
  const [cedula, setCedula]           = useState("");
  const [datosEmpleado, setDatosEmpleado] = useState(null); // { nombres, apellidos, cargo, correo_sugerido }

  // Paso 2 – Cuenta
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [passConf, setPassConf] = useState("");
  const [showPass, setShowPass] = useState(false);

  // ── Paso 1: verificar cédula ───────────────────────────────────────────────
  async function handleVerificar(e) {
    e.preventDefault();
    if (!cedula.trim() || !/^\d{5,12}$/.test(cedula.trim())) {
      setError("Ingresa una cédula válida (solo números, 5–12 dígitos)");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await verificarCedula(cedula.trim());
      if (res.yaRegistrado) {
        setError("Esta cédula ya tiene cuenta. Inicia sesión directamente.");
        return;
      }
      if (!res.encontrado) {
        setError(res.error || "Cédula no encontrada en el sistema.");
        return;
      }
      setDatosEmpleado(res.empleado);
      setEmail(res.empleado.correo_sugerido || "");
      setPaso(2);
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  // ── Paso 2: crear cuenta ───────────────────────────────────────────────────
  async function handleCrearCuenta(e) {
    e.preventDefault();
    setError("");

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Ingresa un correo electrónico válido");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener mínimo 8 caracteres");
      return;
    }
    if (password !== passConf) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await crearCuentaEmpleado(cedula.trim(), email.trim().toLowerCase(), password);
      if (res.error) {
        setError(res.error);
        return;
      }
      setPaso(3);
    } catch {
      setError("Error al crear la cuenta. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  // ── Paso 3: auto-login ─────────────────────────────────────────────────────
  async function handleIrAlPortal() {
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch {
      notify.info("Cuenta creada. Inicia sesión con tus credenciales.");
      goToLogin();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-lg font-bold"
            style={{ background: "var(--color-primary)" }}
          >
            H
          </div>
          <h1 className="text-xl font-bold text-primary">Portal de Empleados</h1>
          <p className="text-muted text-sm">Healthy Servicios de Catering S.A.S.</p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {PASOS.map((p, i) => (
            <React.Fragment key={p.num}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    paso > p.num
                      ? "bg-[var(--color-success)] text-white"
                      : paso === p.num
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-border)] text-muted"
                  }`}
                >
                  {paso > p.num ? <CheckCircle size={14} /> : p.num}
                </div>
                <span className={`text-xs hidden sm:block ${paso === p.num ? "text-primary font-medium" : "text-muted"}`}>
                  {p.label}
                </span>
              </div>
              {i < PASOS.length - 1 && (
                <div className={`flex-1 h-px ${paso > p.num ? "bg-[var(--color-success)]" : "bg-[var(--color-border)]"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="card p-6">
          {/* ── PASO 1: Cédula ── */}
          {paso === 1 && (
            <form onSubmit={handleVerificar} className="space-y-4">
              <div className="text-center mb-2">
                <User size={28} className="mx-auto text-primary mb-2" />
                <h2 className="font-semibold text-primary">Verifica tu cédula</h2>
                <p className="text-xs text-muted mt-1">
                  Ingresa tu número de cédula para confirmar que estás registrado en el sistema.
                </p>
              </div>

              {error && (
                <div className="alert alert-error flex items-start gap-2 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="form-label">Número de cédula</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cedula}
                  onChange={(e) => { setCedula(e.target.value.replace(/\D/g, "")); setError(""); }}
                  className="form-input text-lg tracking-widest text-center"
                  placeholder="1234567890"
                  maxLength={12}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || cedula.length < 5}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? "Verificando..." : "Verificar cédula"}
              </button>

              <button type="button" onClick={goToLogin} className="btn btn-outline w-full text-sm">
                <ArrowLeft size={14} />
                Volver al inicio de sesión
              </button>
            </form>
          )}

          {/* ── PASO 2: Email + Contraseña ── */}
          {paso === 2 && datosEmpleado && (
            <form onSubmit={handleCrearCuenta} className="space-y-4">
              <div className="text-center mb-2">
                <Key size={28} className="mx-auto text-primary mb-2" />
                <h2 className="font-semibold text-primary">Crea tu contraseña</h2>
              </div>

              {/* Tarjeta con nombre del empleado encontrado */}
              <div className="p-3 rounded-base bg-primary/5 border border-primary/20 text-sm">
                <p className="font-semibold text-primary">{datosEmpleado.nombres} {datosEmpleado.apellidos}</p>
                <p className="text-muted text-xs">{datosEmpleado.cargo || "Empleado"}</p>
              </div>

              {error && (
                <div className="alert alert-error flex items-start gap-2 text-sm">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="form-label flex items-center gap-1">
                  <Mail size={13} /> Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="form-input"
                  placeholder="tu@correo.com"
                  required
                />
                <p className="text-xs text-muted mt-1">Usarás este correo para iniciar sesión.</p>
              </div>

              <div>
                <label className="form-label">Contraseña (mínimo 8 caracteres)</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    className="form-input pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">Confirmar contraseña</label>
                <input
                  type={showPass ? "text" : "password"}
                  value={passConf}
                  onChange={(e) => { setPassConf(e.target.value); setError(""); }}
                  className="form-input"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>

              <button type="button" onClick={() => { setPaso(1); setError(""); }} className="btn btn-outline w-full text-sm">
                <ArrowLeft size={14} />
                Atrás
              </button>
            </form>
          )}

          {/* ── PASO 3: Confirmación ── */}
          {paso === 3 && (
            <div className="space-y-4 text-center">
              <CheckCircle size={48} className="mx-auto text-success" />
              <h2 className="font-semibold text-primary text-lg">¡Cuenta creada!</h2>
              <p className="text-muted text-sm">
                Ya puedes acceder al Portal de Empleados de Healthy SC.<br />
                Podrás ver tu información, descargar desprendibles y más.
              </p>
              <div className="p-3 rounded-base bg-success/10 border border-success/20 text-sm text-left">
                <p className="font-medium text-success mb-1">Tu correo de acceso:</p>
                <p className="font-mono text-primary">{email}</p>
              </div>
              <button
                onClick={handleIrAlPortal}
                disabled={loading}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? "Ingresando..." : "Ir a mi portal"}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-4">
          Healthy Servicios de Catering S.A.S. · Portal Empleados
        </p>
      </div>
    </div>
  );
}
