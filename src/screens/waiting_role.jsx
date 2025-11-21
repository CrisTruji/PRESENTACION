// src/screens/waiting_role.jsx
import React from "react";

const wrap = {
  padding: 20,
  textAlign: "center",
};

export default function WaitingRoleScreen() {
  return (
    <div style={wrap}>
      <h2 style={{ color: "#ff6b00" }}>Tu cuenta está en revisión</h2>
      <p>
        Ya estás registrado, pero un administrador debe asignarte un rol para poder
        entrar en la aplicación.
      </p>
      <p>Por favor espera…</p>
    </div>
  );
}
