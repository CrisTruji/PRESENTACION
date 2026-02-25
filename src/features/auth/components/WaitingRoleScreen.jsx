import React, { useEffect } from "react";
import {
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  UserCheck,
  Mail,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  CircleDashed
} from "lucide-react";

export default function WaitingRoleScreen() {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-app/95 backdrop-blur-sm flex items-center justify-center p-compact z-50">
      <div className="relative max-w-md w-full">
        {/* Tarjeta principal */}
        <div className="card card-hover p-8 shadow-card">
          
          {/* Logo y título */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-card bg-primary/10 flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-base bg-primary/20 flex items-center justify-center">
                <Shield size={32} className="text-primary" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-primary">Clinical Fresh System</h1>
            <p className="text-sm text-muted mt-1">Control de accesos</p>
          </div>

          {/* Estado y mensaje */}
          <div className="text-center mb-8">
            <h2 className="section-title">
              Verificación en curso
            </h2>
            <p className="text-muted mt-2">
              Estamos configurando tu perfil y permisos de acceso según los estándares del sector salud.
            </p>
          </div>

          {/* Loader con iconos vectoriales */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              {/* Círculo de fondo sutil */}
              <div className="w-24 h-24 rounded-full bg-primary/5"></div>
              
              {/* Círculo animado principal */}
              <div className="absolute inset-0 w-24 h-24 rounded-full border-3 border-transparent 
                            border-t-primary animate-spin-slow"></div>
              
              {/* Icono central animado */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <UserCheck size={32} className="text-primary animate-pulse-slow" />
                  <div className="absolute -top-1 -right-1">
                    <Loader2 size={16} className="text-primary animate-spin" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Indicador de estado con iconos vectoriales */}
          <div className="mb-8">
            <div className="space-y-4">
              {[
                {
                  icon: CheckCircle,
                  status: 'completado',
                  label: 'Registro completado',
                  description: 'Tus datos han sido registrados exitosamente'
                },
                {
                  icon: ShieldCheck,
                  status: 'procesando',
                  label: 'Verificando permisos',
                  description: 'Validando tu rol en el sistema'
                },
                {
                  icon: Clock,
                  status: 'pendiente',
                  label: 'Configuración de acceso',
                  description: 'Asignando permisos específicos'
                }
              ].map((step, index) => {
                const Icon = step.icon;
                return (
                  <div 
                    key={index} 
                    className={`flex items-start gap-3 p-3 rounded-base transition-colors ${
                      step.status === 'procesando' ? 'bg-primary/5' : 'bg-surface'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-base flex items-center justify-center ${
                      step.status === 'completado' ? 'bg-success/10' :
                      step.status === 'procesando' ? 'bg-primary/10' :
                      'bg-surface'
                    }`}>
                      <Icon size={18} className={
                        step.status === 'completado' ? 'text-success' :
                        step.status === 'procesando' ? 'text-primary' :
                        'text-muted'
                      } />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${
                          step.status === 'procesando' ? 'text-primary' : 'text-muted'
                        }`}>
                          {step.label}
                        </span>
                        {step.status === 'procesando' && (
                          <Loader2 size={14} className="text-primary animate-spin" />
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {step.description}
                      </p>
                    </div>
                    {step.status === 'completado' && (
                      <CheckCircle size={16} className="text-success flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progreso estimado */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-muted">Progreso estimado</span>
              <span className="text-xs font-semibold text-primary">70%</span>
            </div>
            <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-1000 animate-pulse-slow"
                style={{ width: '70%' }}
              />
            </div>
            <p className="text-xs text-muted text-center mt-2">
              Tiempo estimado: 1-2 minutos
            </p>
          </div>

          {/* Información de contacto */}
          <div className="border-t border-base pt-6">
            <div className="alert alert-success">
              <div className="flex items-start gap-2">
                <Mail size={16} className="text-success" />
                <div>
                  <p className="text-xs text-success font-medium mb-1">¿Necesitas ayuda?</p>
                  <p className="text-xs text-success">
                    Si el proceso tarda más de lo esperado, contacta al administrador:
                    <button 
                      onClick={() => window.open('mailto:admin@clinicalfresh.com', '_blank')}
                      className="ml-1 text-success font-medium hover:text-success/80"
                    >
                      admin@clinicalfresh.com
                    </button>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mt-4">
              <div className="flex items-center gap-1">
                <Lock size={12} className="text-success" />
                <span className="text-xs text-muted">Conexión segura</span>
              </div>
              <span className="text-xs text-muted">•</span>
              <div className="flex items-center gap-1">
                <Shield size={12} className="text-primary" />
                <span className="text-xs text-muted">Certificado SSL</span>
              </div>
              <span className="text-xs text-muted">•</span>
              <div className="flex items-center gap-1">
                <Clock size={12} className="text-warning" />
                <span className="text-xs text-muted">Proceso activo</span>
              </div>
            </div>
          </div>

          {/* Mensaje sutil en el fondo */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted">
              Clinical Fresh v2.1 • Sistema de gestión médica
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}