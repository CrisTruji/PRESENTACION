import React, { useState } from "react";
import { useAuth } from "../context/auth";

export default function LoginScreen({ goToSignup }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    try {
      setError("");
      await signIn(email, password);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ padding: "30px" }}>
      <h2>Iniciar Sesión</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleLogin}>
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

        <button type="submit">Ingresar</button>
      </form>

      <p>
        ¿No tienes cuenta?{" "}
        <button onClick={goToSignup}>Crear cuenta</button>
      </p>
    </div>
  );
}
