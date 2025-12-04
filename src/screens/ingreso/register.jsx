import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth.jsx";
import { listRoles } from "../../lib/roles.js";

export default function RegisterScreen({ goToLogin }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [roleId, setRoleId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [err, setErr] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadRoles() {
      const r = await listRoles();
      setRoles(r);
      if (r.length) setRoleId(String(r[0].id));
    }
    loadRoles();
  }, []);

  async function handleSignup(e) {
    e.preventDefault();
    try {
      setErr("");
      setIsLoading(true);
      await signUp(email, password, nombre);
      alert("Cuenta creada. Revisa tu correo o espera confirmación.");
      goToLogin?.();
    } catch (error) {
      setErr(error.message || "Error registrando usuario");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full grid lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Sección izquierda - Formulario (COMPACTO) */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col justify-center">
          <button
            onClick={goToLogin}
            className="flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium mb-6 group text-sm"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Volver al login</span>
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Crear cuenta</h2>
            <p className="text-gray-600 text-sm mt-1">Completa tus datos</p>
          </div>

          {err && (
            <div className="alert-error mb-4 p-3">
              <span className="text-lg">⚠️</span>
              <span className="text-sm">{err}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Grid compacto */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="nombre" className="form-label text-sm">
                  Nombre completo
                </label>
                <input
                  id="nombre"
                  type="text"
                  placeholder="Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="form-input py-2.5 text-sm"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label text-sm">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="tu@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input py-2.5 text-sm"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="form-group">
              <label htmlFor="password" className="form-label text-sm">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input py-2.5 text-sm"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 8 caracteres con mayúsculas, minúsculas y números
              </p>
            </div>

            {/* Select de rol */}
            <div className="form-group">
              <label htmlFor="role" className="form-label text-sm">
                Rol en el sistema
              </label>
              <div className="relative">
                <select
                  id="role"
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="form-select py-2.5 text-sm"
                  disabled={isLoading}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                * Solo para fines de demostración
              </p>
            </div>

            {/* Checkbox compacto */}
            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="terms"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                required
                disabled={isLoading}
              />
              <label htmlFor="terms" className="text-xs text-gray-700">
                Acepto los{" "}
                <a href="#" className="text-primary-500 hover:text-primary-600 font-medium">
                  Términos
                </a>{" "}
                y{" "}
                <a href="#" className="text-primary-500 hover:text-primary-600 font-medium">
                  Privacidad
                </a>
              </label>
            </div>

            {/* Botón de registro */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="spinner-sm border-t-white w-4 h-4"></div>
                  <span>Creando cuenta...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Crear cuenta</span>
                </>
              )}
            </button>

            {/* Divisor */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-500">¿Ya tienes cuenta?</span>
              </div>
            </div>

            {/* Botón para ir a login */}
            <button
              type="button"
              onClick={goToLogin}
              disabled={isLoading}
              className="btn-outline w-full py-2.5 text-sm"
            >
              Iniciar sesión
            </button>
          </form>

          {/* Footer compacto */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-center text-xs text-gray-500">
              ¿Problemas?{" "}
              <a href="#" className="text-primary-500 hover:text-primary-600 font-medium">
                Contacta al administrador
              </a>
            </p>
          </div>
        </div>

        {/* Sección derecha - Panel (COMPACTO) */}
        <div className="hidden lg:flex flex-col">
          <div className="bg-gradient-secondary rounded-2xl p-8 text-white shadow-xl flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 glass rounded-xl flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-2xl font-bold">Multirol</h3>
            </div>
            
            <p className="text-base opacity-90 mb-8">
              Sistema para diferentes perfiles de usuario con permisos específicos.
            </p>
            
            {/* Badges compactos */}
            <div className="flex flex-wrap gap-2 mb-6">
              {roles.slice(0, 3).map((role) => (
                <span
                  key={role.id}
                  className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full border border-white/30"
                >
                  {role.nombre}
                </span>
              ))}
            </div>

            {/* Lista de beneficios compacta */}
            <div className="glass-dark p-4 rounded-xl">
              <h4 className="font-semibold mb-3">Beneficios:</h4>
              <ul className="space-y-2 text-sm">
                {[
                  "Gestión centralizada",
                  "Inventario en tiempo real",
                  "Reportes automatizados",
                  "Integración con proveedores"
                ].map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-xs">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}