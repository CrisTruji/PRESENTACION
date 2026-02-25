import React from "react";
import { useAuth } from "@/features/auth";
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

  return <div></div>;
}
