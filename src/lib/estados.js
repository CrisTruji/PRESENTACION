// src/lib/estados.js
// ============================================================
// ESTADOS NORMALIZADOS - FUENTE ÚNICA DE VERDAD
// ============================================================
// ⚠️ NUNCA uses strings directamente en el código
// ⚠️ SIEMPRE importa estas constantes

/* ============================================================
   ESTADOS DE SOLICITUD
   ============================================================ */
export const ESTADOS_SOLICITUD = {
  PENDIENTE: 'pendiente',
  EN_REVISION_AUXILIAR: 'en_revision_auxiliar',
  APROBADO_AUXILIAR: 'aprobado_auxiliar',
  DEVUELTA_JEFE_PLANTA: 'devuelta_jefe_planta',
  RECHAZADO_AUXILIAR: 'rechazado_auxiliar',
  APROBADO_COMPRAS: 'aprobado_compras',
  COMPRADO: 'comprado',
  DEVUELTO: 'devuelto',
  FINALIZADO: 'finalizado'
};

/* ============================================================
   ESTADOS DE ITEM
   ============================================================ */
export const ESTADOS_ITEM = {
  PENDIENTE: 'pendiente',
  APROBADO_AUXILIAR: 'aprobado_auxiliar',
  RECHAZADO_AUXILIAR: 'rechazado_auxiliar',
  APROBADO_COMPRAS: 'aprobado_compras',
  RECHAZADO_COMPRAS: 'rechazado_compras'
};

/* ============================================================
   FILTROS POR ROL
   ============================================================ */
export const ESTADOS_POR_ROL = {
  auxiliar_de_compras: [
    ESTADOS_SOLICITUD.PENDIENTE,
    ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR
  ],
  
  jefe_de_compras: [
    ESTADOS_SOLICITUD.APROBADO_AUXILIAR
  ],
  
  jefe_de_planta: [
    ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA,
    ESTADOS_SOLICITUD.RECHAZADO_AUXILIAR
  ],
  
  almacenista: [
    ESTADOS_SOLICITUD.COMPRADO
  ]
};

/* ============================================================
   LÓGICA DE TRANSICIÓN
   ============================================================ */

/**
 * Determina el próximo estado de una solicitud basándose en sus ítems
 * @param {Array} items - Array de objetos item con estado_item
 * @returns {string} - Próximo estado de la solicitud
 */
export function determinarProximoEstado(items) {
  const todosAprobados = items.every(
    item => item.estado_item === ESTADOS_ITEM.APROBADO_AUXILIAR
  );
  
  const algunoRechazado = items.some(
    item => item.estado_item === ESTADOS_ITEM.RECHAZADO_AUXILIAR
  );
  
  if (algunoRechazado) {
    return ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA;
  }
  
  if (todosAprobados) {
    return ESTADOS_SOLICITUD.APROBADO_AUXILIAR;
  }
  
  // Si aún hay pendientes, mantener en revisión
  return ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR;
}

/**
 * Valida si todos los ítems han sido revisados
 * @param {Array} items - Array de ítems
 * @returns {boolean}
 */
export function todosItemsRevisados(items) {
  return items.every(
    item => item.estado_item !== ESTADOS_ITEM.PENDIENTE
  );
}

/**
 * Valida si todos los rechazos tienen motivo
 * @param {Array} items - Array de ítems
 * @returns {boolean}
 */
export function rechazosConMotivo(items) {
  const rechazados = items.filter(
    item => item.estado_item === ESTADOS_ITEM.RECHAZADO_AUXILIAR
  );
  
  return rechazados.every(item => item.motivo_rechazo?.trim());
}

/* ============================================================
   ETIQUETAS PARA UI
   ============================================================ */

export const ETIQUETAS_ESTADO_SOLICITUD = {
  [ESTADOS_SOLICITUD.PENDIENTE]: 'Pendiente',
  [ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR]: 'En revisión',
  [ESTADOS_SOLICITUD.APROBADO_AUXILIAR]: 'Aprobado por auxiliar',
  [ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA]: 'Devuelta a planta',
  [ESTADOS_SOLICITUD.RECHAZADO_AUXILIAR]: 'Rechazada',
  [ESTADOS_SOLICITUD.APROBADO_COMPRAS]: 'Aprobado por compras',
  [ESTADOS_SOLICITUD.COMPRADO]: 'Comprado',
  [ESTADOS_SOLICITUD.DEVUELTO]: 'Devuelto',
  [ESTADOS_SOLICITUD.FINALIZADO]: 'Finalizado'
};

export const ETIQUETAS_ESTADO_ITEM = {
  [ESTADOS_ITEM.PENDIENTE]: 'Pendiente',
  [ESTADOS_ITEM.APROBADO_AUXILIAR]: 'Aprobado',
  [ESTADOS_ITEM.RECHAZADO_AUXILIAR]: 'Rechazado',
  [ESTADOS_ITEM.APROBADO_COMPRAS]: 'Aprobado por compras',
  [ESTADOS_ITEM.RECHAZADO_COMPRAS]: 'Rechazado por compras'
};

/* ============================================================
   COLORES PARA UI (Tailwind CSS)
   ============================================================ */

export function getEstadoColor(estado, tipo = 'solicitud') {
  const colores = {
    solicitud: {
      [ESTADOS_SOLICITUD.PENDIENTE]: 'yellow',
      [ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR]: 'blue',
      [ESTADOS_SOLICITUD.APROBADO_AUXILIAR]: 'green',
      [ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA]: 'orange',
      [ESTADOS_SOLICITUD.RECHAZADO_AUXILIAR]: 'red',
      [ESTADOS_SOLICITUD.APROBADO_COMPRAS]: 'green',
      [ESTADOS_SOLICITUD.COMPRADO]: 'purple',
      [ESTADOS_SOLICITUD.DEVUELTO]: 'orange',
      [ESTADOS_SOLICITUD.FINALIZADO]: 'gray'
    },
    item: {
      [ESTADOS_ITEM.PENDIENTE]: 'yellow',
      [ESTADOS_ITEM.APROBADO_AUXILIAR]: 'green',
      [ESTADOS_ITEM.RECHAZADO_AUXILIAR]: 'red',
      [ESTADOS_ITEM.APROBADO_COMPRAS]: 'green',
      [ESTADOS_ITEM.RECHAZADO_COMPRAS]: 'red'
    }
  };
  
  return colores[tipo]?.[estado] || 'gray';
}

/**
 * Obtiene las clases de Tailwind para un estado
 * @param {string} estado - Estado a colorear
 * @param {string} tipo - 'solicitud' o 'item'
 * @returns {string} - Clases de Tailwind
 */
export function getEstadoClasses(estado, tipo = 'solicitud') {
  const color = getEstadoColor(estado, tipo);
  
  const classes = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  
  return classes[color] || classes.gray;
}

/**
 * Obtiene el ícono emoji para un estado
 * @param {string} estado - Estado
 * @param {string} tipo - 'solicitud' o 'item'
 * @returns {string} - Emoji
 */
export function getEstadoIcon(estado, tipo = 'solicitud') {
  const iconos = {
    solicitud: {
      [ESTADOS_SOLICITUD.PENDIENTE]: '',
      [ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR]: '',
      [ESTADOS_SOLICITUD.APROBADO_AUXILIAR]: '',
      [ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA]: '',
      [ESTADOS_SOLICITUD.RECHAZADO_AUXILIAR]: '',
      [ESTADOS_SOLICITUD.APROBADO_COMPRAS]: '',
      [ESTADOS_SOLICITUD.COMPRADO]: '',
      [ESTADOS_SOLICITUD.DEVUELTO]: '',
      [ESTADOS_SOLICITUD.FINALIZADO]: ''
    },
    item: {
      [ESTADOS_ITEM.PENDIENTE]: '',
      [ESTADOS_ITEM.APROBADO_AUXILIAR]: '',
      [ESTADOS_ITEM.RECHAZADO_AUXILIAR]: '',
      [ESTADOS_ITEM.APROBADO_COMPRAS]: '',
      [ESTADOS_ITEM.RECHAZADO_COMPRAS]: ''
    }
  };
  
  return iconos[tipo]?.[estado] || '';
}