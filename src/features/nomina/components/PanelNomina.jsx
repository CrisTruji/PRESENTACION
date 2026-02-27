// src/features/nomina/components/PanelNomina.jsx
// Panel de gestión de desprendibles y vacaciones - Rol: nomina
// Sprint 3 completo — Sprint 1 placeholder funcional
import React from "react";
import { DollarSign, Clock } from "lucide-react";

export default function PanelNomina() {
  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        <div className="section-header mb-6">
          <h1 className="section-title flex items-center gap-2">
            <DollarSign size={22} className="text-primary" />
            Panel de Nómina
          </h1>
          <p className="section-subtitle">
            Gestión de desprendibles y aprobación de vacaciones
          </p>
        </div>
        <div className="card p-12 text-center">
          <DollarSign size={40} className="mx-auto mb-4 text-muted" />
          <h3 className="font-semibold text-primary mb-2">Panel Nómina</h3>
          <p className="text-muted text-sm flex items-center justify-center gap-2">
            <Clock size={14} />
            En construcción — Sprint 3
          </p>
          <p className="text-xs text-muted mt-3">
            Aquí podrás subir desprendibles en masa y aprobar/rechazar solicitudes de vacaciones.
          </p>
        </div>
      </div>
    </div>
  );
}
