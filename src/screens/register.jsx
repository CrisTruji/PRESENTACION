// src/screens/register.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/auth";
import { listRoles } from "../lib/roles";

export default function RegisterScreen({ goToLogin }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [roleId, setRoleId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function loadRoles() {
      const r = await listRoles();
      setRoles(r);
      if (r.length) setRoleId(r[0].id);
    }
    loadRoles();
  }, []);

  async function handleSignup(e) {
    e.preventDefault();
    try {
      setErr("");
      await signUp(email, password, nombre, roleId);
      alert("Cuenta creada. Revisa tu correo (si usas magic link) o espera confirmación.");
      goToLogin?.();
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

      <label style={{ display: "block", marginTop: 8 }}>Seleccionar rol</label>

<pre style={{ background: "#eee", padding: 10 }}>
  {JSON.stringify(roles, null, 2)}
</pre>

<select value={roleId || ""} onChange={(e) => setRoleId(Number(e.target.value))}>
  {roles.map((r) => (
    <option key={r.id} value={r.id}>{r.nombre}</option>
  ))}
</select>

        <div style={{ marginTop: 12 }}>
          <button className="auth-btn" type="submit">Registrarme</button>
          <button type="button" className="auth-btn secondary" onClick={goToLogin}>Iniciar sesión</button>
        </div>
      </form>
    </div>
  );
}
