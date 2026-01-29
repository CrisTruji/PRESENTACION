import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth.jsx";
import { listRoles } from "../../lib/roles.js";
import notify from "../../utils/notifier";
import {
  User,
  Mail,
  Lock,
  Shield,
  CheckCircle,
  ArrowLeft,
  Users,
  Package,
  FileText,
  Building,
  AlertCircle,
  Check,
  UserPlus,
  LogIn,
  AlertTriangle,
  HelpCircle,
  Info
} from "lucide-react";

export default function RegisterScreen({ goToLogin }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: ""
  });

  useEffect(() => {
    async function loadRoles() {
      try {
        const r = await listRoles();
        setRoles(r);
      } catch (error) {
        notify.error("Error cargando roles del sistema");
      }
    }
    loadRoles();
  }, []);

  // Validar fortaleza de contraseña
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, feedback: "" });
      return;
    }

    let score = 0;
    let feedback = [];

    if (password.length >= 8) score += 1;
    else feedback.push("Mínimo 8 caracteres");

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("Al menos una mayúscula");

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("Al menos una minúscula");

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push("Al menos un número");

    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else feedback.push("Al menos un carácter especial");

    setPasswordStrength({
      score,
      feedback: feedback.join(", ")
    });
  }, [password]);

  async function handleSignup(e) {
    e.preventDefault();
    
    if (!acceptTerms) {
      notify.error("Debes aceptar los términos y condiciones");
      return;
    }

    if (passwordStrength.score < 3) {
      notify.error("La contraseña no cumple con los requisitos mínimos de seguridad");
      return;
    }

    try {
      setIsLoading(true);
      await signUp(email, password, nombre);
      
      notify.success("Cuenta creada exitosamente. Revisa tu correo para confirmar.");
      
      setTimeout(() => {
        goToLogin?.();
      }, 3000);
      
    } catch (error) {
      notify.error(error.message || "Error registrando usuario");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-compact">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Sección izquierda - Formulario */}
        <div className="card card-hover p-6 md:p-8 flex flex-col justify-center">
          {/* Botón de volver */}
          <button
            onClick={goToLogin}
            className="btn btn-outline self-start mb-6 flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={16} />
            Volver al login
          </button>

          {/* Header del formulario */}
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-card bg-primary/10 flex items-center justify-center">
              <UserPlus size={28} className="text-primary" />
            </div>
            <h2 className="section-title text-center">Crear cuenta nueva</h2>
            <p className="section-subtitle text-center">
              Completa tus datos para comenzar
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Grid compacto para nombre y email */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <User size={14} />
                  Nombre completo
                </label>
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="form-input"
                  required
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label className="form-label flex items-center gap-2">
                  <Mail size={14} />
                  Correo electrónico
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@clinica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Contraseña con indicador de fortaleza */}
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <Lock size={14} />
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              
              {/* Indicador de fortaleza de contraseña */}
              {password && (
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-muted">Seguridad:</span>
                    <span className={`text-xs font-semibold ${
                      passwordStrength.score >= 4 ? 'text-success' :
                      passwordStrength.score >= 3 ? 'text-warning' :
                      'text-error'
                    }`}>
                      {passwordStrength.score >= 4 ? 'Fuerte' :
                       passwordStrength.score >= 3 ? 'Media' :
                       'Débil'}
                    </span>
                  </div>
                  <div className="w-full bg-base h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        passwordStrength.score >= 4 ? 'bg-success' :
                        passwordStrength.score >= 3 ? 'bg-warning' :
                        'bg-error'
                      }`}
                      style={{ width: `${passwordStrength.score * 20}%` }}
                    />
                  </div>
                  {passwordStrength.feedback && (
                    <p className="text-xs text-muted mt-2">
                      {passwordStrength.feedback}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Roles disponibles (solo información) */}
            <div className="form-group">
              <label className="form-label flex items-center gap-2">
                <Users size={14} />
                Roles disponibles en el sistema
              </label>
              <div className="p-3 bg-hover rounded-base border border-base">
                <div className="flex flex-wrap gap-2">
                  {roles.slice(0, 4).map((role) => (
                    <span
                      key={role.id}
                      className="badge badge-primary text-xs"
                    >
                      {role.nombre}
                    </span>
                  ))}
                  {roles.length > 4 && (
                    <span className="badge text-xs">
                      +{roles.length - 4} más
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-2">
                  * Los roles serán asignados por el administrador después de la verificación
                </p>
              </div>
            </div>

            {/* Términos y condiciones */}
            <div className="form-group">
              <div className="flex items-start gap-3 p-3 bg-surface rounded-base border border-base">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-base border-base text-primary focus:ring-primary/20 focus:ring-2"
                  required
                  disabled={isLoading}
                />
                <label htmlFor="terms" className="text-sm text-muted flex-1">
                  Acepto los{" "}
                  <button
                    type="button"
                    onClick={() => notify.info("Términos y condiciones del sistema")}
                    className="text-primary hover:text-primary-hover font-medium"
                  >
                    términos y condiciones
                  </button>{" "}
                  y autorizo el tratamiento de mis datos según la{" "}
                  <button
                    type="button"
                    onClick={() => notify.info("Política de privacidad")}
                    className="text-primary hover:text-primary-hover font-medium"
                  >
                    política de privacidad
                  </button>
                </label>
              </div>
            </div>

            {/* Botón de registro */}
            <button
              type="submit"
              disabled={isLoading || !acceptTerms || passwordStrength.score < 3}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="spinner-sm"></div>
                  <span>Creando cuenta...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>Crear cuenta</span>
                </>
              )}
            </button>

            {/* Divisor */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-base"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-surface text-muted">¿Ya tienes cuenta?</span>
              </div>
            </div>

            {/* Botón para ir a login */}
            <button
              type="button"
              onClick={goToLogin}
              disabled={isLoading}
              className="btn btn-outline w-full flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              Iniciar sesión
            </button>
          </form>

          {/* Información de seguridad */}
          <div className="mt-8 pt-6 border-t border-base">
            <div className="alert alert-success">
              <div className="flex items-start gap-2">
                <Shield size={16} className="text-success" />
                <div>
                  <p className="text-xs text-success font-medium mb-1">Seguridad del sistema</p>
                  <p className="text-xs text-success">
                    Todos los datos están encriptados y protegidos según estándares médicos.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-muted mt-4">
              ¿Problemas?{" "}
              <button
                type="button"
                onClick={() => notify.info("Contacta al administrador del sistema: admin@clinica.com")}
                className="text-primary hover:text-primary-hover font-medium"
              >
                Contacta al administrador
              </button>
            </p>
          </div>

          {/* Información de versión */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted">
              Clinical Fresh v2.1 • Sistema de gestión médica
            </p>
          </div>
        </div>

        {/* Sección derecha - Información */}
        <div className="hidden lg:flex flex-col">
          <div className="card card-hover flex-1 flex flex-col justify-center p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="stats-icon">
                <Users size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-primary">Sistema Multirol</h3>
                <p className="text-sm text-muted mt-1">Gestión por perfiles especializados</p>
              </div>
            </div>
            
            <p className="text-muted mb-8">
              Plataforma diseñada para diferentes perfiles profesionales del sector salud con permisos específicos y workflow optimizado.
            </p>
            
            {/* Lista de perfiles */}
            <div className="mb-8">
              <h4 className="font-semibold text-base mb-4 flex items-center gap-2">
                <Users size={16} />
                Perfiles disponibles
              </h4>
              <div className="space-y-3">
                {roles.slice(0, 5).map((role) => (
                  <div key={role.id} className="flex items-center gap-3 p-3 rounded-base hover:bg-hover transition-colors">
                    <div className="w-10 h-10 rounded-base bg-primary/10 flex items-center justify-center">
                      <Users size={18} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{role.nombre}</h5>
                      <p className="text-xs text-muted mt-1">
                        {role.descripcion || "Perfil especializado del sistema"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Beneficios */}
            <div className="bg-hover rounded-base p-5">
              <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-success" />
                Beneficios del sistema
              </h4>
              <div className="space-y-2">
                {[
                  { icon: FileText, text: "Gestión centralizada de solicitudes" },
                  { icon: Package, text: "Control de inventario en tiempo real" },
                  { icon: Building, text: "Integración con proveedores médicos" },
                  { icon: Shield, text: "Cumplimiento de normativas sanitarias" }
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <Check size={14} className="text-success" />
                      <span className="text-sm">{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Información adicional */}
            <div className="mt-8 pt-6 border-t border-base">
              <div className="flex items-start gap-3">
                <Info size={18} className="text-muted" />
                <div>
                  <p className="text-sm font-medium text-muted mb-1">Proceso de verificación</p>
                  <p className="text-xs text-muted">
                    Después del registro, tu cuenta será verificada por el administrador. 
                    Recibirás un correo con las instrucciones para acceder al sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}