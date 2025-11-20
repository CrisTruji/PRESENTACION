// src/screens/waiting_role.jsx
import React from "react";

export default function WaitingRoleScreen() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <div style={{ background: "#fff", padding: 28, borderRadius: 12, boxShadow: "0 6px 20px rgba(0,0,0,0.06)", maxWidth: 600 }}>
        <h2>Cuenta en revisión</h2>
        <p>Un administrador está asignando tu rol. En cuanto te asignen un rol podrás acceder a la aplicación.</p>
      </div>
    </div>
  );
}
