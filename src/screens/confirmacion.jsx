// src/screens/confirmacion.jsx
import React from "react";
import { CheckCircle } from "lucide-react";

export default function Confirmacion() {
  return (
    <div className="min-h-content bg-app flex items-center justify-center">
      <div className="page-container">
        <div className="card p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          
          <h2 className="text-2xl font-semibold text-primary mb-3">
            Confirmación
          </h2>
          
          <p className="text-muted mb-6">
            Operación realizada con éxito.
          </p>
          
          <div className="text-xs text-muted mt-4">
            Puedes continuar con otras tareas del sistema.
          </div>
        </div>
      </div>
    </div>
  );
}