import React, { useState } from "react";
import { useAuth } from "@/features/auth";
import {
  BarChart3,
  Lock,
  Mail,
  Key,
  Shield,
  Package,
  FileText,
  UserPlus,
  HelpCircle,
  LogIn
} from "lucide-react";
import notify from "@/shared/lib/notifier";

export default function LoginScreen({ goToSignup }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      setIsLoading(true);
      await signIn(email, password);
      // La notificación de éxito será manejada por el contexto de auth
    } catch (error) {
      notify.error(error.message || "Error iniciando sesión");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-compact">
      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Sección izquierda - Hero */}
        <div className="hidden lg:flex flex-col">
          <div className="card card-hover flex-1 flex flex-col justify-center p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="stats-icon">
                <BarChart3 size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">Clinical Fresh System</h1>
                <p className="text-sm text-muted mt-1">Sistema de gestión integral</p>
              </div>
            </div>
            
            <p className="text-muted mb-8">
              Plataforma profesional para la gestión de solicitudes, compras y almacén del sector salud.
            </p>
            
            <div className="space-y-4">
              {[
                { 
                  icon: FileText, 
                  title: "Gestión de solicitudes", 
                  desc: "Proceso completo de solicitud a aprobación" 
                },
                { 
                  icon: Package, 
                  title: "Control de inventario", 
                  desc: "Seguimiento en tiempo real de stock" 
                },
                { 
                  icon: Shield, 
                  title: "Seguridad garantizada", 
                  desc: "Protección de datos médicos sensibles" 
                },
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-base hover:bg-hover transition-colors">
                    <div className="w-10 h-10 rounded-base bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted mt-1">{feature.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats al pie */}
            <div className="mt-8 pt-6 border-t border-base">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">99.9%</div>
                  <div className="text-xs text-muted">Disponibilidad</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">24/7</div>
                  <div className="text-xs text-muted">Soporte</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">AES-256</div>
                  <div className="text-xs text-muted">Encriptación</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección derecha - Formulario */}
        <div className="card card-hover p-6 md:p-8 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-card bg-primary/10 flex items-center justify-center">
              <Lock size={28} className="text-primary" />
            </div>
            <h2 className="section-title">Bienvenido de vuelta</h2>
            <p className="section-subtitle">Inicia sesión para acceder a tu cuenta</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label flex items-center gap-2">
                  <Key size={14} />
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-xs text-primary hover:text-primary-hover font-medium"
                  onClick={() => notify.info("Contacta al administrador del sistema para restablecer tu contraseña")}
                >
                  <HelpCircle size={12} className="inline mr-1" />
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
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
                  <div className="spinner-sm"></div>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Iniciar sesión</span>
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-base"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-surface text-muted">¿Primera vez en el sistema?</span>
              </div>
            </div>

            <button
              type="button"
              onClick={goToSignup}
              disabled={isLoading}
              className="btn btn-outline w-full flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              Crear cuenta nueva
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-base">
            <div className="alert alert-success">
              <div className="flex items-start gap-2">
                <Shield size={16} className="text-success" />
                <div>
                  <p className="text-xs text-success font-medium mb-1">Sistema seguro</p>
                  <p className="text-xs text-success">
                    Tu información está protegida con encriptación de grado médico. 
                    <button 
                      onClick={() => notify.info("Sistema certificado HIPAA compatible")}
                      className="ml-1 text-success font-medium hover:text-success/80"
                    >
                      Más información
                    </button>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <button
                onClick={() => notify.info("Términos y condiciones del servicio")}
                className="text-xs text-muted hover:text-primary transition-colors"
              >
                Términos del servicio
              </button>
              <span className="text-xs text-muted">•</span>
              <button
                onClick={() => notify.info("Política de privacidad y manejo de datos")}
                className="text-xs text-muted hover:text-primary transition-colors"
              >
                Política de privacidad
              </button>
              <span className="text-xs text-muted">•</span>
              <button
                onClick={() => notify.info("Certificaciones y compliance del sistema")}
                className="text-xs text-muted hover:text-primary transition-colors"
              >
                Compliance
              </button>
            </div>
          </div>

          {/* Información de versión */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted">
              Clinical Fresh v2.1 • Diseñado para el sector salud
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}