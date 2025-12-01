import React from "react";
import { useAuth } from "../context/auth";
import { useRouter } from "../router";

export default function FakeRoleSwitcher() {
  const { roleName, fakeSetRole } = useAuth();
  const { navigate } = useRouter();

  function changeRole(r) {
    fakeSetRole(r);

    if (r === "jefe_de_planta") navigate("crear_solicitud");
    if (r === "auxiliar_de_compras") navigate("solicitudes");
    if (r === "jefe_de_compras") navigate("solicitudes");
    if (r === "almacenista") navigate("facturas");
    if (r === "administrador") navigate("admin_dashboard");
  }

  return (
    <div style={{ padding: 12, background: "#eee", marginBottom: 12 }}>
      <strong>FAKE ROLE SWITCHER</strong>
      <p>Rol actual: {roleName}</p>

      <select onChange={(e) => changeRole(e.target.value)} value={roleName}>
        <option value="administrador">Administrador</option>
        <option value="jefe_de_planta">Jefe de planta</option>
        <option value="auxiliar_de_compras">Auxiliar de compras</option>
        <option value="jefe_de_compras">Jefe de compras</option>
        <option value="almacenista">Almacenista</option>
        <option value="usuario">Usuario normal</option>
      </select>
    </div>
  );
}
