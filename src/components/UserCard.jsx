import React from "react";

export default function UserCard({ user, onApprove, onReject }) {
  return (
    <div className="card p-3">
      <div className="mb-2">
        <div className="font-semibold text-primary truncate">
          {user.nombre || "Sin nombre"}
        </div>
        <div className="text-sm text-muted mt-0.5">
          {user.created_at ? new Date(user.created_at).toLocaleString() : "Fecha no disponible"}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="btn btn-primary flex-1 !py-1.5 text-sm"
          onClick={() => onApprove(user.id)}
        >
          Aceptar
        </button>
        <button
          className="btn flex-1 !py-1.5 text-sm"
          style={{
            backgroundColor: 'var(--color-error)',
            color: 'white',
            borderColor: 'var(--color-error)',
          }}
          onClick={() => onReject(user.id)}
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}