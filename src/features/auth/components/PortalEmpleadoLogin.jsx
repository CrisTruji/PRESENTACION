// src/features/auth/components/PortalEmpleadoLogin.jsx
// Pantalla principal de ingreso para empleados (default al abrir la app)
import React, { useState } from "react";
import {
  Mail, Key, LogIn, UserPlus, Building2,
  Loader2, HelpCircle, Users
} from "lucide-react";
import { useAuth } from "@/features/auth";
import notify from "@/shared/lib/notifier";

export default function PortalEmpleadoLogin({ goToRegistro, goToLoginCorporativo }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      setIsLoading(true);
      await signIn(email, password);
    } catch (error) {
      notify.error(error.message || "Correo o contraseña incorrectos");
    } finally {
      setIsLoading(false);
    }
  }

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
              Usa el correo y contraseña que registraste
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <Mail size={13} />
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="tu@correo.com"
                required
                disabled={isLoading}
                autoComplete="username"
                autoFocus
              />
            </div>

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
                    notify.info(
                      "Contacta a Talento Humano para restablecer tu contraseña"
                    )
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
              disabled={isLoading}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Ingresando...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Ingresar al portal</span>
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
