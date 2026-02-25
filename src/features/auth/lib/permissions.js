// src/lib/permissions.js
// mapping simple: acción -> roles permitidos
export const permissions = {
  crear_solicitud: ["jefe de planta", "administrador"],
  rectificar_solicitud: ["auxiliar de compras", "administrador"],
  marcar_comprada: ["jefe de compras", "administrador"],
  registrar_factura: ["almacenista", "administrador"],
  aprobar_solicitud: ["administrador", "jefe de compras"],
  ver_todo: ["administrador"],

  // Sprint 7 - Ciclos de Menu / Pedidos / Consolidado
  gestionar_ciclos_menu: ["chef", "administrador"],
  crear_pedido_servicio: ["coordinador_unidad", "administrador"],
  consolidar_pedidos: ["supervisor_produccion", "administrador"],
  aprobar_consolidado: ["supervisor_produccion", "administrador"],
  sustituir_receta: ["supervisor_produccion", "chef", "administrador"],
  aprobar_cambio_menu: ["supervisor_produccion", "chef", "administrador"],
};

// helper
export function canRolePerform(roleName, action) {
  if (!roleName) return false;
  const allowed = permissions[action] || [];
  return allowed.includes(roleName);
}
