// src/lib/permissions.js
// mapping simple: acción -> roles permitidos
export const permissions = {
  crear_solicitud: ["jefe de planta", "administrador"],
  rectificar_solicitud: ["auxiliar de compras", "administrador"],
  marcar_comprada: ["jefe de compras", "administrador"],
  registrar_factura: ["almacenista", "administrador"],
  aprobar_solicitud: ["administrador", "jefe de compras"],
  ver_todo: ["administrador"]
};

// helper
export function canRolePerform(roleName, action) {
  if (!roleName) return false;
  const allowed = permissions[action] || [];
  return allowed.includes(roleName);
}
