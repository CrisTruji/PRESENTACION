// src/features/portal-empleado/components/Desprendibles.jsx
// Sprint 3 - Placeholder
import React from "react";
import { FileText, Clock } from "lucide-react";

export default function Desprendibles({ empleadoId }) {
  return (
    <div className="card p-12 text-center">
      <FileText size={40} className="mx-auto mb-4 text-muted" />
      <h3 className="font-semibold text-primary mb-2">Desprendibles de Pago</h3>
      <p className="text-muted text-sm flex items-center justify-center gap-2">
        <Clock size={14} />
        Próximamente — Sprint 3
      </p>
    </div>
  );
}
