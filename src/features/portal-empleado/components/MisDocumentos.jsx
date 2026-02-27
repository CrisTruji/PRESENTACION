// src/features/portal-empleado/components/MisDocumentos.jsx
// Sprint 5 - Placeholder
import React from "react";
import { FolderOpen, Clock } from "lucide-react";

export default function MisDocumentos({ empleadoId }) {
  return (
    <div className="card p-12 text-center">
      <FolderOpen size={40} className="mx-auto mb-4 text-muted" />
      <h3 className="font-semibold text-primary mb-2">Mis Documentos</h3>
      <p className="text-muted text-sm flex items-center justify-center gap-2">
        <Clock size={14} />
        Próximamente — Sprint 5
      </p>
    </div>
  );
}
