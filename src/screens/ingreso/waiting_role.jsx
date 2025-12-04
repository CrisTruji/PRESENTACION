import React, { useEffect } from "react";

export default function WaitingRoleScreen() {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4">
      <div className="relative max-w-sm w-full">
        {/* Tarjeta principal */}
        <div className="bg-slate-900/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl shadow-black/40 border border-slate-800/50">
          
          {/* Logo y título */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 rounded-2xl flex items-center justify-center mb-4 border border-slate-700/50">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                <span className="text-xl">🛡️</span>
              </div>
            </div>
            <h1 className="text-xl font-semibold text-white">Control de Accesos</h1>
            <p className="text-sm text-slate-400 mt-1">Sistema de Gestión</p>
          </div>

          {/* Estado y mensaje */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-3">
              <span className="bg-gradient-to-r from-primary-400 to-white bg-clip-text text-transparent">
                Verificación en Curso
              </span>
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Estamos configurando tu perfil y permisos de acceso. 
              Esto tomará solo unos momentos.
            </p>
          </div>

          {/* Loader circular mejorado */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              {/* Círculo de fondo sutil */}
              <div className="w-20 h-20 rounded-full bg-slate-800/50"></div>
              
              {/* Círculo animado principal - más limpio */}
              <div className="absolute inset-0 w-20 h-20 rounded-full border-[3px] border-transparent 
                            border-t-primary-500 animate-spin-slow"></div>
              
              {/* Círculo interior secundario */}
              <div className="absolute inset-3 w-14 h-14 rounded-full border-[2px] border-transparent 
                            border-b-secondary-500 animate-spin-slow-reverse opacity-70"></div>
              
              {/* Punto central animado */}
              <div className="absolute inset-7 w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse-slow"></div>
              </div>
            </div>
          </div>

          {/* Indicador de estado */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-slate-400">Registro completado</span>
            </div>
            <div className="text-slate-600">•</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-secondary-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-white">Verificando permisos</span>
            </div>
            <div className="text-slate-600">•</div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
              <span className="text-xs text-slate-500">Acceso pendiente</span>
            </div>
          </div>

          {/* Información de contacto */}
          <div className="border-t border-slate-800/50 pt-6 text-center">
            <p className="text-xs text-slate-500">
              Si el proceso tarda más de lo esperado
            </p>
            <p className="text-sm text-primary-300 mt-1 font-medium">
              contacto@empresa.com
            </p>
          </div>
        </div>

        {/* Mensaje sutil en el fondo */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-700">
            Sistema seguro • Procesando solicitud
          </p>
        </div>
      </div>
    </div>
  );
}