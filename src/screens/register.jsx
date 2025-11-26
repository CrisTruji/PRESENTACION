import React, { useState } from "react";
import { useAuth } from "../context/auth.jsx";

export default function RegisterScreen({ goToLogin }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    
    try {
      if (!nombre.trim() || !email.trim() || !password.trim()) {
        setErr("Todos los campos son requeridos");
        return;
      }

      if (password.length < 6) {
        setErr("La contraseña debe tener al menos 6 caracteres");
        return;
      }

      await signUp(email, password, nombre);
      alert("✅ Cuenta creada exitosamente. Ya puedes iniciar sesión.");
      goToLogin?.();
    } catch (error) {
      console.error("Error completo:", error);
      
      if (error.message?.includes("User already registered")) {
        setErr("Este correo ya está registrado");
      } else if (error.message?.includes("Email not confirmed")) {
        setErr("Confirma tu email antes de iniciar sesión");
      } else {
        setErr(error.message || "Error registrando usuario");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h2 style={{ color: "#ff6b00" }}>Crear cuenta</h2>
      {err && <p style={{ color: "red" }}>{err}</p>}

      <form onSubmit={handleSignup}>
        <input 
          placeholder="Nombre completo" 
          value={nombre} 
          onChange={(e) => setNombre(e.target.value)}
          disabled={loading}
        />
        <input 
          placeholder="Correo electrónico" 
          type="email"
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <input 
          placeholder="Contraseña (mínimo 6 caracteres)" 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <div style={{ marginTop: 12 }}>
          <button 
            className="auth-btn" 
            type="submit"
            disabled={loading}
          >
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
          <button 
            type="button" 
            className="auth-btn secondary" 
            onClick={goToLogin}
            disabled={loading}
          >
            Iniciar sesión
          </button>
        </div>
      </form>
    </div>
  );
}