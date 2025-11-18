import React, { useState } from "react";
import { useAuth } from "../context/auth";

export default function SignupScreen({ goToLogin }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    try {
      setError("");
      await signUp(email, password);
      alert("Cuenta creada. Revisa tu correo para confirmar.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ padding: "30px" }}>
      <h2>Crear Cuenta</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSignup}>
        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        /><br /><br />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        /><br /><br />

        <button type="submit">Registrarme</button>
      </form>

      <p>
        ¿Ya tienes cuenta?{" "}
        <button onClick={goToLogin}>Iniciar sesión</button>
      </p>
    </div>
  );
}
