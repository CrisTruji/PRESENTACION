// ========================================
// TIPOS Y CONSTANTES - Sistema de Menus V2
// Servicios, estados, labels compartidos
// ========================================

export const SERVICIOS = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'nueves', label: 'Nueves' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'onces', label: 'Onces' },
  { value: 'cena', label: 'Cena' },
  { value: 'cena_ligera', label: 'Cena Ligera' },
];

export const ESTADOS_CICLO = {
  BORRADOR: 'borrador',
  ACTIVO: 'activo',
  PAUSADO: 'pausado',
  FINALIZADO: 'finalizado',
};

export const ESTADOS_PEDIDO = {
  BORRADOR: 'borrador',
  ENVIADO: 'enviado',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
  CONSOLIDADO: 'consolidado',
};

export const ESTADOS_CONSOLIDADO = {
  EN_REVISION: 'en_revision',
  APROBADO: 'aprobado',
  EN_PREPARACION: 'en_preparacion',
  COMPLETADO: 'completado',
};

export const ESTADOS_SOLICITUD_CAMBIO = {
  PENDIENTE: 'pendiente',
  APROBADA: 'aprobada',
  RECHAZADA: 'rechazada',
};

// Labels para UI
export const ETIQUETAS_ESTADO_CICLO = {
  [ESTADOS_CICLO.BORRADOR]: 'Borrador',
  [ESTADOS_CICLO.ACTIVO]: 'Activo',
  [ESTADOS_CICLO.PAUSADO]: 'Pausado',
  [ESTADOS_CICLO.FINALIZADO]: 'Finalizado',
};

export const ETIQUETAS_ESTADO_PEDIDO = {
  [ESTADOS_PEDIDO.BORRADOR]: 'Borrador',
  [ESTADOS_PEDIDO.ENVIADO]: 'Enviado',
  [ESTADOS_PEDIDO.APROBADO]: 'Aprobado',
  [ESTADOS_PEDIDO.RECHAZADO]: 'Rechazado',
  [ESTADOS_PEDIDO.CONSOLIDADO]: 'Consolidado',
};

export const ETIQUETAS_ESTADO_CONSOLIDADO = {
  [ESTADOS_CONSOLIDADO.EN_REVISION]: 'En Revision',
  [ESTADOS_CONSOLIDADO.APROBADO]: 'Aprobado',
  [ESTADOS_CONSOLIDADO.EN_PREPARACION]: 'En Preparacion',
  [ESTADOS_CONSOLIDADO.COMPLETADO]: 'Completado',
};

// Colores para estados
export const COLORES_ESTADO_CICLO = {
  [ESTADOS_CICLO.BORRADOR]: 'gray',
  [ESTADOS_CICLO.ACTIVO]: 'green',
  [ESTADOS_CICLO.PAUSADO]: 'yellow',
  [ESTADOS_CICLO.FINALIZADO]: 'blue',
};

export const COLORES_ESTADO_PEDIDO = {
  [ESTADOS_PEDIDO.BORRADOR]: 'gray',
  [ESTADOS_PEDIDO.ENVIADO]: 'blue',
  [ESTADOS_PEDIDO.APROBADO]: 'green',
  [ESTADOS_PEDIDO.RECHAZADO]: 'red',
  [ESTADOS_PEDIDO.CONSOLIDADO]: 'purple',
};

// Categorias de dietas Keralty
export const CATEGORIAS_DIETA = {
  PEDIATRICA: 'pediatrica',
  CONSISTENCIA: 'consistencia',
  TERAPEUTICA: 'terapeutica',
};

export const ETIQUETAS_CATEGORIA_DIETA = {
  [CATEGORIAS_DIETA.PEDIATRICA]: 'Pediatricas',
  [CATEGORIAS_DIETA.CONSISTENCIA]: 'Modificaciones en Consistencia',
  [CATEGORIAS_DIETA.TERAPEUTICA]: 'Terapeuticas',
};

// Tipos de operacion
export const TIPOS_OPERACION = {
  CICLICO: 'ciclico',
  CARTA_MENU: 'carta_menu',
};

// Operaciones que manejan datos de pacientes
export const OPERACIONES_CON_PACIENTES = ['alcala', 'presentes'];
