// src/features/auth/components/PortalEmpleadoLogin.jsx
// Pantalla principal de ingreso para empleados (default al abrir la app)
// Acepta cédula (solo números) O correo electrónico
import React, { useState } from "react";
import {
  Key, LogIn, UserPlus, Building2,
  Loader2, HelpCircle, Users, CreditCard
} from "lucide-react";
import { useAuth } from "@/features/auth";
import { getEmailPorCedula } from "@/features/portal-empleado/services/portalEmpleadoService";
import notify from "@/shared/lib/notifier";

// Si el input es solo dígitos → es cédula. Si tiene @ → es correo.
function esCedula(valor) {
  return /^\d+$/.test(valor.trim());
}

export default function PortalEmpleadoLogin({ goToRegistro, goToLoginCorporativo }) {
  const { signIn } = useAuth();
  const [identificador, setIdentificador] = useState(""); // cédula o correo
  const [password, setPassword]           = useState("");
  const [isLoading, setIsLoading]         = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    const valor = identificador.trim();
    if (!valor) return;

    setIsLoading(true);
    try {
      let emailParaLogin = valor;

      // Si es cédula (solo números) → consultar correo Y marcar portal_mode
      // Si es correo → accede al rol corporativo (sin portal_mode)
      if (esCedula(valor)) {
        const res = await getEmailPorCedula(valor);
        if (res.error) {
          notify.error(res.error);
          return;
        }
        emailParaLogin = res.correo;
        // Cédula siempre abre el portal de empleado
        sessionStorage.setItem("portal_mode", "1");
      }

      await signIn(emailParaLogin, password);
    } catch (error) {
      sessionStorage.removeItem("portal_mode"); // Limpiar si el login falla
      notify.error(error.message || "Credenciales incorrectas. Verifica e intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  const esCedulaActual = esCedula(identificador) && identificador.length > 0;

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-5">

        {/* Branding */}
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-md"
            style={{ background: "var(--color-primary)" }}
          >
            H
          </div>
          <h1 className="text-2xl font-bold text-primary">Portal de Empleados</h1>
          <p className="text-sm text-muted mt-1">Healthy Servicios de Catering S.A.S.</p>
        </div>

        {/* Card de login */}
        <div className="card p-6 md:p-8">
          <div className="text-center mb-6">
            <Users size={26} className="mx-auto text-primary mb-2" />
            <h2 className="font-semibold text-primary">Ingresa a tu portal</h2>
            <p className="text-xs text-muted mt-1">
              Cédula → accedes a tu información personal
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Campo cédula o correo */}
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                {esCedulaActual
                  ? <CreditCard size={13} className="text-primary" />
                  : <span className="text-xs font-medium">@</span>
                }
                {esCedulaActual ? "Cédula" : "Cédula o correo electrónico"}
              </label>
              <input
                type="text"
                inputMode="text"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                className="form-input"
                placeholder="Ej: 1029142426  ó  tu@correo.com"
                required
                disabled={isLoading}
                autoComplete="username"
                autoFocus
              />
              {esCedulaActual ? (
                <p className="text-xs text-primary mt-1">
                  ✓ Ingresarás a tu portal personal de empleado
                </p>
              ) : identificador.includes("@") ? (
                <p className="text-xs text-muted mt-1">
                  ℹ️ Ingresarás según tu rol en el sistema
                </p>
              ) : null}
            </div>

            {/* Contraseña */}
            <div className="form-group">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label flex items-center gap-1.5">
                  <Key size={13} />
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-xs text-primary hover:text-primary-hover font-medium"
                  onClick={() =>
                    notify.info("Contacta a Talento Humano para restablecer tu contraseña")
                  }
                >
                  <HelpCircle size={12} className="inline mr-1" />
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !identificador.trim() || !password}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{esCedulaActual ? "Buscando cuenta..." : "Ingresando..."}</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>{esCedulaActual ? "Ingresar al portal" : "Ingresar"}</span>
                </>
              )}
            </button>
          </form>

          {/* Separador */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-base" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-surface text-muted">¿Primera vez aquí?</span>
            </div>
          </div>

          {/* Crear acceso */}
          <button
            onClick={goToRegistro}
            disabled={isLoading}
            className="btn btn-outline w-full flex items-center justify-center gap-2"
            style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
          >
            <UserPlus size={16} />
            Crear mi acceso al portal
          </button>
        </div>

        {/* Acceso corporativo — discreto al final */}
        <div className="text-center pb-4">
          <button
            onClick={goToLoginCorporativo}
            className="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1.5 mx-auto"
          >
            <Building2 size={13} />
            Soy Administrativo · Acceso corporativo
          </button>
        </div>
      </div>
    </div>
  );
}
