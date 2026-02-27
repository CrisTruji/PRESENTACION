// src/features/portal-empleado/components/Vacaciones.jsx
// Sprint 4 - Placeholder
import React from "react";
import { Umbrella, Clock } from "lucide-react";

export default function Vacaciones({ empleadoId, empleado }) {
  return (
    <div className="card p-12 text-center">
      <Umbrella size={40} className="mx-auto mb-4 text-muted" />
      <h3 className="font-semibold text-primary mb-2">Solicitud de Vacaciones</h3>
      <p className="text-muted text-sm flex items-center justify-center gap-2">
        <Clock size={14} />
        Próximamente — Sprint 4
      </p>
    </div>
  );
}
