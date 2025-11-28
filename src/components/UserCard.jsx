import React from "react";

export default function UserCard({ user, onApprove, onReject }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 10,
      background: "#fff",
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
    }}>
      <div style={{ fontWeight: 600, color: "#1f2937" }}>{user.nombre || "Sin nombre"}</div>
      <div style={{ color: "#6b7280", marginBottom: 12 }}>{user.created_at ? new Date(user.created_at).toLocaleString() : ""}</div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onApprove(user.id)} style={{ padding: "8px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8 }}>Aceptar</button>
        <button onClick={() => onReject(user.id)} style={{ padding: "8px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8 }}>Rechazar</button>
      </div>
    </div>
  );
}
