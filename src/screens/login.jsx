// src/screens/login.jsx
import React, { useState } from "react";
import { useAuth } from "../context/auth";

export default function LoginScreen({ goToSignup }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    try {
      setErr("");
      await signIn(email, password);
    } catch (error) {
      setErr(error.message || "Error iniciando sesión");
    }
  }

  return (
    <div className="auth-card">
      <h2 style={{ color: "#ff6b00" }}>Iniciar sesión</h2>
      {err && <p style={{ color: "red" }}>{err}</p>}
      <form onSubmit={handleLogin}>
        <input placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="auth-btn" type="submit">Entrar</button>
          <button type="button" className="auth-btn secondary" onClick={goToSignup}>Crear cuenta</button>
        </div>
      </form>
    </div>
  );
}
