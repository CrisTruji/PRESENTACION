// src/screens/planta/confirmacion.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, ClipboardList } from "lucide-react";

export default function ConfirmacionPlanta() {
  const navigate = useNavigate();

  return (
    <div className="min-h-content flex items-center justify-center p-compact">
      <div className="max-w-2xl mx-auto">
        {/* Card de confirmación */}
        <div className="card card-hover animate-fade-in">
          <div className="card-body text-center p-8">
            {/* Ícono de éxito */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>

            {/* Título */}
            <h1 className="section-title mb-3 text-2xl md:text-3xl">
              ¡Solicitud creada con éxito!
            </h1>

            {/* Descripción */}
            <p className="text-muted mb-6 max-w-md mx-auto">
              Tu solicitud ha sido registrada exitosamente en el sistema. 
              Puedes realizar un seguimiento de su estado en el listado de solicitudes.
            </p>

            {/* Información adicional */}
            <div className="mb-8 max-w-sm mx-auto">
              <div className="bg-hover rounded-base p-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  <span className="font-medium text-primary">
                    Próximos pasos:
                  </span>
                </div>
                <ul className="text-sm text-muted text-left space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-medium">•</span>
                    <span>La solicitud será revisada por el departamento correspondiente</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-medium">•</span>
                    <span>Recibirás notificaciones sobre cambios de estado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-medium">•</span>
                    <span>Puedes consultar el historial en cualquier momento</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                className="btn btn-primary flex items-center justify-center gap-2"
                onClick={() => navigate("/planta/solicitudes")}
              >
                <ClipboardList size={18} />
                Ir a Mis Solicitudes
                <ArrowRight size={18} />
              </button>

              <button
                className="btn btn-outline flex items-center justify-center gap-2"
                onClick={() => navigate("/planta/crear-solicitud")}
              >
                <Plus size={18} />
                Crear Nueva Solicitud
              </button>
            </div>

            {/* Enlace secundario */}
            <div className="mt-6">
              <button
                className="text-sm text-primary hover:text-primary-hover transition-colors"
                onClick={() => navigate("/planta/dashboard")}
              >
                ← Volver al Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Stats rápidas */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-base bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted">Tiempo promedio</p>
                  <p className="text-lg font-semibold">24-48 hrs</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-base bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted">Solicitudes exitosas</p>
                  <p className="text-lg font-semibold">98%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-base bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted">Soporte activo</p>
                  <p className="text-lg font-semibold">24/7</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componentes de íconos adicionales necesarios
import { Plus, Clock, AlertCircle } from "lucide-react";