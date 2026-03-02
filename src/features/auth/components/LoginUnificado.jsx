// src/features/auth/components/LoginUnificado.jsx
// Login unificado con dos paneles deslizables:
//   · Empleados → ingreso por cédula → portal de empleados
//   · Administrativo → ingreso por correo → sistema corporativo por rol
import React, { useState } from "react";
import {
  Users, Building2, CreditCard, Mail, Key, LogIn,
  UserPlus, HelpCircle, Loader2, BarChart3, Shield,
  FileText, Umbrella, Package, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/features/auth";
import { getEmailPorCedula } from "@/features/portal-empleado/services/portalEmpleadoService";
import notify from "@/shared/lib/notifier";

// ─── Utilidades ───────────────────────────────────────────────────────────────
function esCedula(v) { return /^\d+$/.test(v.trim()); }

// ─── Configuración visual de cada panel ───────────────────────────────────────
const PANELS = {
  empleado: {
    gradientFrom: "#064e3b",
    gradientMid:  "#065f46",
    gradientTo:   "#059669",
    accent:       "#10b981",
    accentDark:   "#047857",
    badge:        "Portal de Empleados",
    title:        "Tu información, siempre a mano",
    desc:         "Consulta tus desprendibles, solicita vacaciones y accede a todos tus documentos personales.",
    features: [
      { icon: FileText,   text: "Desprendibles de nómina"      },
      { icon: Umbrella,   text: "Solicitudes de vacaciones"     },
      { icon: Shield,     text: "Documentos e incapacidades"    },
    ],
    switchLabel: "¿Eres parte del equipo administrativo?",
    switchAction: "Ir al acceso corporativo",
    formTitle:   "Portal de Empleados",
    formSub:     "Ingresa con tu número de cédula",
  },
  corporativo: {
    gradientFrom: "#0f172a",
    gradientMid:  "#1e3a8a",
    gradientTo:   "#1d4ed8",
    accent:       "#3b82f6",
    accentDark:   "#1d4ed8",
    badge:        "Acceso Restringido",
    title:        "Sistema de Gestión Corporativa",
    desc:         "Plataforma exclusiva para personal autorizado. Gestión de inventario, compras y producción.",
    features: [
      { icon: BarChart3, text: "Panel administrativo"          },
      { icon: Package,   text: "Control de inventario"         },
      { icon: Shield,    text: "Seguridad y roles por área"    },
    ],
    switchLabel:  "¿Eres empleado del área operativa?",
    switchAction: "Ir al portal de empleados",
    formTitle:   "Acceso Corporativo",
    formSub:     "Ingresa con tu correo institucional autorizado",
  },
};

// ─── Formulario Empleados (cédula) ────────────────────────────────────────────
function FormEmpleado({ goToRegistro, visible }) {
  const { signIn } = useAuth();
  const [cedula,   setCedula]   = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!cedula.trim()) return;
    setLoading(true);
    try {
      const res = await getEmailPorCedula(cedula.trim());
      if (res.error) { notify.error(res.error); return; }
      sessionStorage.setItem("portal_mode", "1");
      await signIn(res.correo, password);
    } catch (err) {
      sessionStorage.removeItem("portal_mode");
      notify.error(err.message || "Credenciales incorrectas. Verifica e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cédula */}
      <div className="form-group">
        <label className="form-label flex items-center gap-1.5">
          <CreditCard size={13} className="text-emerald-500" />
          Número de cédula
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={cedula}
          onChange={e => setCedula(e.target.value.replace(/\D/g, ""))}
          className="form-input"
          placeholder="Ej: 1029142426"
          required
          disabled={loading}
          tabIndex={visible ? 0 : -1}
          autoComplete="username"
        />
      </div>

      {/* Contraseña */}
      <div className="form-group">
        <div className="flex justify-between items-center mb-1">
          <label className="form-label flex items-center gap-1.5">
            <Key size={13} /> Contraseña
          </label>
          <button
            type="button"
            tabIndex={visible ? 0 : -1}
            className="text-xs text-muted hover:text-primary transition-colors"
            onClick={() => notify.info("Contacta a Talento Humano para restablecer tu contraseña")}
          >
            <HelpCircle size={11} className="inline mr-1" />¿Olvidaste?
          </button>
        </div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="form-input"
          placeholder="••••••••"
          required
          disabled={loading}
          tabIndex={visible ? 0 : -1}
          autoComplete="current-password"
        />
      </div>

      {/* Botón ingresar */}
      <button
        type="submit"
        disabled={loading || !cedula.trim() || !password}
        tabIndex={visible ? 0 : -1}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /><span>Buscando cuenta…</span></>
          : <><LogIn size={15} /><span>Ingresar al portal</span></>
        }
      </button>

      {/* Separador */}
      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-base" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-surface text-muted">¿Primera vez aquí?</span>
        </div>
      </div>

      {/* Crear acceso */}
      <button
        type="button"
        onClick={goToRegistro}
        disabled={loading}
        tabIndex={visible ? 0 : -1}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors"
        style={{ borderColor: "#10b981", color: "#059669" }}
      >
        <UserPlus size={15} />
        Crear mi acceso al portal
      </button>
    </form>
  );
}

// ─── Formulario Corporativo (correo) ──────────────────────────────────────────
function FormCorporativo({ goToRegistroAdmin, visible }) {
  const { signIn } = useAuth();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      notify.error(err.message || "Credenciales incorrectas. Verifica e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Correo */}
      <div className="form-group">
        <label className="form-label flex items-center gap-1.5">
          <Mail size={13} className="text-blue-500" />
          Correo corporativo
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="form-input"
          placeholder="usuario@empresa.com"
          required
          disabled={loading}
          tabIndex={visible ? 0 : -1}
          autoComplete="username"
        />
      </div>

      {/* Contraseña */}
      <div className="form-group">
        <div className="flex justify-between items-center mb-1">
          <label className="form-label flex items-center gap-1.5">
            <Key size={13} /> Contraseña
          </label>
          <button
            type="button"
            tabIndex={visible ? 0 : -1}
            className="text-xs text-muted hover:text-primary transition-colors"
            onClick={() => notify.info("Contacta al administrador para restablecer tu contraseña")}
          >
            <HelpCircle size={11} className="inline mr-1" />¿Olvidaste?
          </button>
        </div>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="form-input"
          placeholder="••••••••"
          required
          disabled={loading}
          tabIndex={visible ? 0 : -1}
          autoComplete="current-password"
        />
      </div>

      {/* Botón ingresar */}
      <button
        type="submit"
        disabled={loading || !email.trim() || !password}
        tabIndex={visible ? 0 : -1}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)" }}
      >
        {loading
          ? <><Loader2 size={15} className="animate-spin" /><span>Iniciando sesión…</span></>
          : <><LogIn size={15} /><span>Iniciar sesión</span></>
        }
      </button>

      {/* Separador */}
      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-base" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-surface text-muted">¿Primera vez en el sistema?</span>
        </div>
      </div>

      {/* Solicitar acceso */}
      <button
        type="button"
        onClick={goToRegistroAdmin}
        disabled={loading}
        tabIndex={visible ? 0 : -1}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium border transition-colors"
        style={{ borderColor: "#3b82f6", color: "#1d4ed8" }}
      >
        <UserPlus size={15} />
        Solicitar acceso corporativo
      </button>
    </form>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function LoginUnificado({ goToRegistro, goToRegistroAdmin }) {
  const [panel, setPanel] = useState("empleado");
  const isEmp = panel === "empleado";
  const cfg   = PANELS[panel];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">

      {/* ── Panel izquierdo decorativo (solo desktop) ──────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between lg:w-5/12 xl:w-[42%] relative overflow-hidden p-10 transition-all duration-700 ease-in-out">

        {/* Gradiente de fondo — crossfade entre los dos temas */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: `linear-gradient(145deg, ${PANELS.empleado.gradientFrom} 0%, ${PANELS.empleado.gradientMid} 50%, ${PANELS.empleado.gradientTo} 100%)`,
            opacity: isEmp ? 1 : 0,
          }}
        />
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: `linear-gradient(145deg, ${PANELS.corporativo.gradientFrom} 0%, ${PANELS.corporativo.gradientMid} 50%, ${PANELS.corporativo.gradientTo} 100%)`,
            opacity: isEmp ? 0 : 1,
          }}
        />

        {/* Círculos decorativos */}
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-[0.08]"
          style={{ background: "white" }}
        />
        <div
          className="absolute -bottom-24 -left-16 w-96 h-96 rounded-full opacity-[0.06]"
          style={{ background: "white" }}
        />
        <div
          className="absolute top-1/2 right-8 w-32 h-32 rounded-full opacity-[0.05]"
          style={{ background: "white", transform: "translateY(-50%)" }}
        />

        {/* ── Logo ── */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm shadow-lg">
            <span className="text-white font-bold text-lg leading-none">H</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Healthy SC</p>
            <p className="text-white/50 text-xs">Servicios de Catering</p>
          </div>
        </div>

        {/* ── Contenido central (fade al cambiar) ── */}
        <div
          className="relative z-10 space-y-6 transition-all duration-500"
          key={panel}
          style={{ animation: "fadeSlideUp 0.45s ease-out" }}
        >
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white/90 backdrop-blur-sm border border-white/10">
            {isEmp ? <Users size={11} /> : <Building2 size={11} />}
            {cfg.badge}
          </span>

          {/* Título */}
          <div>
            <h1 className="text-3xl font-bold text-white leading-tight mb-3">
              {cfg.title}
            </h1>
            <p className="text-white/65 text-sm leading-relaxed">{cfg.desc}</p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {cfg.features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/15 flex-shrink-0 border border-white/10">
                    <Icon size={14} className="text-white/90" />
                  </div>
                  <span className="text-white/75 text-sm">{f.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Switch de panel (desde el panel izquierdo) ── */}
        <div className="relative z-10">
          <p className="text-white/40 text-xs mb-2">{cfg.switchLabel}</p>
          <button
            onClick={() => setPanel(isEmp ? "corporativo" : "empleado")}
            className="group flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors"
          >
            <span>{cfg.switchAction}</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* ── Panel derecho: formularios ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-app p-6 sm:p-10 lg:p-14 min-h-screen lg:min-h-0">

        {/* Logo mobile */}
        <div className="lg:hidden mb-8 text-center">
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-xl shadow-md transition-all duration-700"
            style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accentDark})` }}
          >
            H
          </div>
          <p className="text-sm font-semibold text-primary">Healthy SC</p>
          <p className="text-xs text-muted">Servicios de Catering S.A.S.</p>
        </div>

        <div className="w-full max-w-[420px]">

          {/* ── Tab selector deslizante ── */}
          <div className="relative flex bg-surface border border-base rounded-xl p-1 mb-7 shadow-sm">
            {/* Pill deslizante */}
            <div
              className="absolute top-1 bottom-1 rounded-[10px] shadow-sm"
              style={{
                width: "calc(50% - 4px)",
                left: isEmp ? "4px" : "calc(50%)",
                transition: "left 0.35s cubic-bezier(0.4,0,0.2,1), background 0.35s ease",
                background: isEmp
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              }}
            />
            <button
              onClick={() => setPanel("empleado")}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors duration-300 ${
                isEmp ? "text-white" : "text-secondary"
              }`}
            >
              <Users size={15} />
              <span>Empleados</span>
            </button>
            <button
              onClick={() => setPanel("corporativo")}
              className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors duration-300 ${
                !isEmp ? "text-white" : "text-secondary"
              }`}
            >
              <Building2 size={15} />
              <span>Administrativo</span>
            </button>
          </div>

          {/* ── Encabezado del formulario ── */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-primary leading-tight">{cfg.formTitle}</h2>
            <p className="text-sm text-muted mt-1">{cfg.formSub}</p>
          </div>

          {/* ── Contenedor deslizable ── */}
          <div className="overflow-hidden">
            <div
              className="flex"
              style={{
                width: "200%",
                transform: isEmp ? "translateX(0)" : "translateX(-50%)",
                transition: "transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <div className="w-1/2 pr-3 box-border">
                <FormEmpleado goToRegistro={goToRegistro} visible={isEmp} />
              </div>
              <div className="w-1/2 pl-3 box-border">
                <FormCorporativo goToRegistroAdmin={goToRegistroAdmin} visible={!isEmp} />
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="mt-8 pt-5 border-t border-base text-center">
            <p className="text-xs text-muted">
              © {new Date().getFullYear()} Healthy Servicios de Catering S.A.S.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
