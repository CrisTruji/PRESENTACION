import React, { useState } from "react";
import { useAuth } from "../../context/auth.jsx";

export default function LoginScreen({ goToSignup }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      setErr("");
      setIsLoading(true);
      await signIn(email, password);
    } catch (error) {
      setErr(error.message || "Error iniciando sesión");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full grid lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Sección izquierda - Hero (COMPACTO) */}
        <div className="hidden lg:flex flex-col">
          <div className="bg-gradient-primary rounded-2xl p-8 text-white shadow-xl flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 glass rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <h1 className="text-2xl font-bold">Sistema de Gestión</h1>
            </div>
            
            <p className="text-base opacity-90 mb-8">
              Sistema integral para la gestión de solicitudes, compras y almacén.
            </p>
            
            <div className="space-y-3">
              {[
                "Gestión de solicitudes",
                "Control de inventario", 
                "Reportes en tiempo real"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sección derecha - Formulario (COMPACTO) */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-50 rounded-xl mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Bienvenido</h2>
            <p className="text-gray-600 text-sm mt-1">Inicia sesión en tu cuenta</p>
          </div>

          {err && (
            <div className="alert-error mb-4 p-3">
              <span className="text-lg">⚠️</span>
              <span className="text-sm">{err}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="form-group">
              <label className="form-label text-sm">
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input py-2.5 text-sm"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label text-sm">
                  Contraseña
                </label>
                <a href="#" className="text-xs text-primary-500 hover:text-primary-600 font-medium">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input py-2.5 text-sm"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="spinner-sm border-t-white w-4 h-4"></div>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>→</span>
                  <span>Iniciar sesión</span>
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-500">¿No tienes cuenta?</span>
              </div>
            </div>

            <button
              type="button"
              onClick={goToSignup}
              disabled={isLoading}
              className="btn-outline w-full py-2.5 text-sm"
            >
              Crear cuenta nueva
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-gray-100">
            <p className="text-center text-xs text-gray-500">
              Al continuar, aceptas nuestros{" "}
              <a href="#" className="text-primary-500 hover:text-primary-600 font-medium">
                Términos
              </a>{" "}
              y{" "}
              <a href="#" className="text-primary-500 hover:text-primary-600 font-medium">
                Privacidad
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}