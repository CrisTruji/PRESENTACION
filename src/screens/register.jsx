// src/screens/register.jsx
import React, { useState } from "react";
import { useAuth } from "../context/auth";

export default function RegisterScreen({ goToLogin }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [err, setErr] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    try {
      setErr("");
      await signUp(email, password, nombre);
      alert("Cuenta creada. Espera asignación de rol por administrador.");
    } catch (error) {
      setErr(error.message || "Error registrando usuario");
    }
  }

  return (
    <div className="auth-card">
      <h2 style={{ color: "#ff6b00" }}>Crear cuenta</h2>
      {err && <p style={{ color: "red" }}>{err}</p>}
      <form onSubmit={handleSignup}>
        <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="auth-btn" type="submit">Registrarme</button>
          <button type="button" className="auth-btn secondary" onClick={goToLogin}>Iniciar sesión</button>
        </div>
      </form>
    </div>
  );
}
