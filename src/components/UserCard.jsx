// src/components/UserCard.jsx
import React from "react";

export default function UserCard({ user, onApprove, onReject }) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: 16,
        borderRadius: 10,
        background: "#fff",
      }}
    >
      <h3>{user.nombre}</h3>
      <p>{user.email}</p>

      <button onClick={onApprove} style={{ marginRight: 10 }}>
        ✔ Aprobar
      </button>

      <button onClick={onReject}>✖ Rechazar</button>
    </div>
  );
}
