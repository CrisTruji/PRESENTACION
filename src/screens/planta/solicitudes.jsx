// src/screens/planta/solicitudes.jsx
import React, { useState } from "react";
import { useRouter } from "../../context/roleroutercontext";
import useSolicitudes from "../hooks/usesolicitudes";
import { useAuth } from "../../context/auth";
import { 
  ESTADOS_SOLICITUD, 
  ETIQUETAS_ESTADO_SOLICITUD,
  getEstadoClasses 
} from "../../lib/estados";
import {
  Search,
  Building,
  Package,
  AlertCircle,
  RefreshCw,
  Eye,
  Edit,
  Plus,
  Download,
  FileText,
  ShoppingCart,
  CheckCheck,
  AlertTriangle,
  Hash,
  RotateCcw,
  CircleDashed,
  CircleCheck,
  CircleX,
  CheckCircle,
  Clock,
  Circle,
  XCircle,
  Flag,
  FileSearch
} from "lucide-react";

// Función para obtener icono de estado usando iconos de Lucide directamente
const getEstadoIcon = (estado, size = 14) => {
  const iconos = {
    // Estados de solicitud
    [ESTADOS_SOLICITUD.PENDIENTE]: <Clock size={size} />,
    [ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR]: <FileSearch size={size} />,
    [ESTADOS_SOLICITUD.APROBADO_AUXILIAR]: <CheckCircle size={size} />,
    [ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA]: <RotateCcw size={size} />,
    [ESTADOS_SOLICITUD.RECHAZADO_AUXILIAR]: <XCircle size={size} />,
    [ESTADOS_SOLICITUD.APROBADO_COMPRAS]: <CheckCircle size={size} />,
    [ESTADOS_SOLICITUD.COMPRADO]: <ShoppingCart size={size} />,
    [ESTADOS_SOLICITUD.DEVUELTO]: <AlertTriangle size={size} />,
    [ESTADOS_SOLICITUD.FINALIZADO]: <Flag size={size} />,
    
    // Estados de item (para compatibilidad)
    'pendiente_auxiliar': <Clock size={size} />,
    'aprobado_auxiliar': <CheckCircle size={size} />,
    'rechazado_auxiliar': <XCircle size={size} />,
  };
  
  return iconos[estado] || <Circle size={size} />;
};

export default function SolicitudesPlanta() {
  const { navigate } = useRouter();
  const { user, profile, session, roleName } = useAuth?.() || {};
  const userId = profile?.id || user?.id || session?.user?.id;

  const { solicitudes = [], loading, refetch } = useSolicitudes({ created_by: userId });
  const [tabActiva, setTabActiva] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  // Pestañas disponibles por rol
  const pestanasPorRol = {
    jefe_de_planta: ['todas', 'pendientes', 'devueltas', 'aprobadas', 'compradas', 'finalizadas'],
    auxiliar_de_compras: ['todas', 'pendientes', 'aprobadas'],
    jefe_de_compras: ['todas', 'pendientes', 'aprobadas', 'compradas'],
    almacenista: ['todas', 'compradas', 'finalizadas'],
    administrador: ['todas', 'pendientes', 'devueltas', 'aprobadas', 'compradas', 'finalizadas']
  };

  const esJefeDePlanta = roleName === 'jefe_de_planta';
  const esAuxiliarDeCompras = roleName === 'auxiliar_de_compras';
  const esJefeDeCompras = roleName === 'jefe_de_compras';
  const esAlmacenista = roleName === 'almacenista';
  const esAdministrador = roleName === 'administrador';

  const pestañasActuales = pestanasPorRol[roleName] || ['todas'];

  // Configuración de pestañas con iconos vectoriales
  const configPestañas = {
    todas: { 
      label: 'Todas',
      icon: FileText,
      color: 'text-muted',
      bgColor: 'bg-surface'
    },
    pendientes: { 
      label: 'Pendientes',
      icon: CircleDashed,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    devueltas: { 
      label: 'Devueltas',
      icon: RotateCcw,
      color: 'text-error',
      bgColor: 'bg-error/10'
    },
    aprobadas: { 
      label: 'Aprobadas',
      icon: CircleCheck,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    compradas: { 
      label: 'Compradas',
      icon: ShoppingCart,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    finalizadas: { 
      label: 'Finalizadas',
      icon: CheckCheck,
      color: 'text-muted',
      bgColor: 'bg-surface'
    }
  };

  // Filtrado de solicitudes
  const solicitudesFiltradas = solicitudes.filter(sol => {
    // Filtro por búsqueda
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      const matchId = sol.id.toString().includes(termino);
      const matchProveedor = sol.proveedor?.nombre?.toLowerCase().includes(termino);
      const matchEstado = sol.estado?.toLowerCase().includes(termino);
      
      if (!matchId && !matchProveedor && !matchEstado) return false;
    }

    // Filtro por pestaña
    if (tabActiva === 'todas') return true;
    
    if (tabActiva === 'pendientes') {
      if (esJefeDePlanta) {
        return [ESTADOS_SOLICITUD.PENDIENTE, ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR].includes(sol.estado);
      }
      if (esAuxiliarDeCompras) {
        return [ESTADOS_SOLICITUD.PENDIENTE, ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR].includes(sol.estado);
      }
      if (esJefeDeCompras) {
        return sol.estado === ESTADOS_SOLICITUD.APROBADO_AUXILIAR;
      }
    }
    
    if (tabActiva === 'devueltas' && esJefeDePlanta) {
      return [ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA, ESTADOS_SOLICITUD.RECHAZADO_AUXILIAR].includes(sol.estado);
    }
    
    if (tabActiva === 'aprobadas') {
      return [ESTADOS_SOLICITUD.APROBADO_AUXILIAR, ESTADOS_SOLICITUD.APROBADO_COMPRAS].includes(sol.estado);
    }
    
    if (tabActiva === 'compradas') {
      return sol.estado === ESTADOS_SOLICITUD.COMPRADO;
    }
    
    if (tabActiva === 'finalizadas') {
      return sol.estado === ESTADOS_SOLICITUD.FINALIZADO;
    }
    
    return true;
  });

  // Calcular estadísticas para mostrar en botones
  const calcularEstadisticas = () => {
    const stats = {
      todas: solicitudes.length,
      pendientes: solicitudes.filter(s => 
        [ESTADOS_SOLICITUD.PENDIENTE, ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR].includes(s.estado)
      ).length,
      devueltas: solicitudes.filter(s => 
        [ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA, ESTADOS_SOLICITUD.RECHAZADO_AUXILIAR].includes(s.estado)
      ).length,
      aprobadas: solicitudes.filter(s => 
        [ESTADOS_SOLICITUD.APROBADO_AUXILIAR, ESTADOS_SOLICITUD.APROBADO_COMPRAS].includes(s.estado)
      ).length,
      compradas: solicitudes.filter(s => 
        s.estado === ESTADOS_SOLICITUD.COMPRADO
      ).length,
      finalizadas: solicitudes.filter(s => 
        s.estado === ESTADOS_SOLICITUD.FINALIZADO
      ).length
    };
    
    return stats;
  };

  const stats = calcularEstadisticas();

  const puedeEditar = (estado) => {
    return esJefeDePlanta && [
      ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA,
      ESTADOS_SOLICITUD.RECHAZADO_AUXILIAR
    ].includes(estado);
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-content flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-muted">Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-content p-compact">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="section-header mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="section-title">
                {esJefeDePlanta ? 'Mis Solicitudes' : 'Solicitudes de Compra'}
              </h1>
              <p className="section-subtitle">
                {esJefeDePlanta && 'Gestiona y revisa tus solicitudes enviadas'}
                {esAuxiliarDeCompras && 'Solicitudes pendientes de revisión'}
                {esJefeDeCompras && 'Solicitudes para gestionar compra'}
                {esAlmacenista && 'Solicitudes para gestión de almacén'}
                {esAdministrador && 'Vista administrativa de todas las solicitudes'}
                {!esJefeDePlanta && !esAuxiliarDeCompras && !esJefeDeCompras && !esAlmacenista && !esAdministrador && 'Historial de solicitudes'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {esJefeDePlanta && (
                <button
                  onClick={() => navigate('crear_solicitud')}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus size={18} />
                  Nueva Solicitud
                </button>
              )}
              <button
                onClick={refetch}
                className="btn btn-outline flex items-center gap-2"
              >
                <RefreshCw size={18} />
                Actualizar
              </button>
            </div>
          </div>

          {/* Barra de búsqueda */}
          <div className="mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
              <input
                type="text"
                placeholder="Buscar por ID, proveedor o estado..."
                className="form-input pl-10 w-full"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          {/* Pestañas con contadores */}
          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pestañasActuales.map((tab) => {
                const config = configPestañas[tab];
                const Icon = config?.icon || FileText;
                const isActive = tabActiva === tab;
                const count = stats[tab] || 0;
                
                return (
                  <button
                    key={tab}
                    onClick={() => setTabActiva(tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-base font-medium text-sm transition-all whitespace-nowrap min-w-[120px] ${
                      isActive
                        ? `${config.bgColor} ${config.color} border border-current`
                        : 'bg-surface text-muted hover:bg-hover border border-base'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="flex-1 text-left">{config?.label || tab}</span>
                    <span className={`text-xs font-semibold ${
                      isActive 
                        ? 'text-current' 
                        : 'text-muted'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alerta para devueltas */}
        {tabActiva === 'devueltas' && esJefeDePlanta && stats.devueltas > 0 && (
          <div className="alert alert-warning mb-6">
            <div className="flex items-start gap-3">
              <RotateCcw size={20} className="text-warning" />
              <div className="flex-1">
                <h3 className="font-bold text-warning mb-1">
                  Solicitudes devueltas para corrección
                </h3>
                <p className="text-sm text-warning">
                  Estas solicitudes fueron rechazadas por el auxiliar de compras. 
                  Revisa los motivos, corrige los productos y vuelve a enviarlas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Información de estado */}
        {tabActiva === 'pendientes' && esJefeDePlanta && stats.pendientes > 0 && (
          <div className="alert alert-success mb-6">
            <div className="flex items-start gap-3">
              <Clock size={20} className="text-success" />
              <div className="flex-1">
                <h3 className="font-bold text-success mb-1">
                  Solicitudes en revisión
                </h3>
                <p className="text-sm text-success">
                  Estas solicitudes están siendo revisadas por el departamento de compras.
                  Serás notificado cuando haya cambios en su estado.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lista de solicitudes */}
        {solicitudesFiltradas.length === 0 ? (
          <div className="card text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-hover flex items-center justify-center">
              <FileText size={32} className="text-muted" />
            </div>
            <h3 className="section-title mb-2">
              {busqueda 
                ? 'No se encontraron resultados' 
                : `No hay solicitudes ${tabActiva !== 'todas' ? 'en esta categoría' : ''}`
              }
            </h3>
            <p className="text-muted mb-6 max-w-md mx-auto">
              {busqueda 
                ? 'Intenta con otros términos de búsqueda'
                : tabActiva === 'pendientes' && esJefeDePlanta
                  ? 'Crea una nueva solicitud de compra para comenzar.'
                  : 'No hay registros que mostrar en este momento.'
              }
            </p>
            {busqueda ? (
              <button
                onClick={() => setBusqueda('')}
                className="btn btn-outline"
              >
                Limpiar búsqueda
              </button>
            ) : esJefeDePlanta && (
              <button
                onClick={() => navigate('crear_solicitud')}
                className="btn btn-primary"
              >
                <Plus size={18} className="mr-2" />
                Crear primera solicitud
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-base bg-surface">
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">ID</th>
                    <th className="table-header-cell">Fecha</th>
                    <th className="table-header-cell">Proveedor</th>
                    <th className="table-header-cell">Estado</th>
                    <th className="table-header-cell">Items</th>
                    <th className="table-header-cell">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudesFiltradas.map((sol) => {
                    const esDevuelta = puedeEditar(sol.estado);
                    const itemsRechazados = sol.solicitud_items?.filter(
                      item => item.estado_item === 'rechazado_auxiliar'
                    ).length || 0;

                    return (
                      <tr 
                        key={sol.id} 
                        className={`table-row ${esDevuelta ? 'bg-error/5' : ''}`}
                      >
                        {/* ID */}
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-base flex items-center justify-center ${
                              esDevuelta ? 'bg-error/20' : 'bg-primary/10'
                            }`}>
                              {esDevuelta ? (
                                <AlertTriangle size={16} className="text-error" />
                              ) : (
                                <Hash size={16} className="text-primary" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold">
                                #{sol.id}
                              </div>
                              {esDevuelta && itemsRechazados > 0 && (
                                <div className="text-xs text-error font-medium flex items-center gap-1">
                                  <CircleX size={12} />
                                  {itemsRechazados} rechazado{itemsRechazados > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Fecha */}
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {new Date(sol.fecha_solicitud).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-xs text-muted">
                              {new Date(sol.fecha_solicitud).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Proveedor */}
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <Building size={14} className="text-muted" />
                            <span className="truncate max-w-[150px]" title={sol.proveedor?.nombre || 'No especificado'}>
                              {sol.proveedor?.nombre || sol.proveedores?.nombre || 'No especificado'}
                            </span>
                          </div>
                        </td>

                        {/* Estado CON ICONOS VECTORIALES DIRECTOS */}
                        <td className="table-cell">
                          <div className={`badge px-3 py-1 text-sm font-medium flex items-center gap-1.5 ${
                            getEstadoClasses(sol.estado, 'solicitud')
                          }`}>
                            {getEstadoIcon(sol.estado, 14)}
                            <span>{ETIQUETAS_ESTADO_SOLICITUD[sol.estado]}</span>
                          </div>
                        </td>

                        {/* Items */}
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-muted" />
                            <span className="font-medium">
                              {sol.solicitud_items?.length || 0}
                            </span>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            {esDevuelta ? (
                              <button
                                onClick={() => navigate('verificar_solicitud', { id: sol.id })}
                                className="btn btn-outline text-error hover:bg-error/10 border-error text-sm flex items-center gap-2"
                              >
                                <Edit size={14} />
                                Corregir
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate('verificar_solicitud', { id: sol.id })}
                                className="btn btn-outline text-sm flex items-center gap-2"
                              >
                                <Eye size={14} />
                                Ver detalles
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pie de tabla con contador */}
            <div className="table-header">
              <div className="px-6 py-3 flex justify-between items-center">
                <span className="text-sm text-muted">
                  Mostrando {solicitudesFiltradas.length} de {solicitudes.length} solicitudes
                </span>
                <div className="flex items-center gap-2">
                  <button className="btn btn-outline btn-sm">
                    <Download size={14} />
                    Exportar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Solo muestra información útil cuando no hay solicitudes */}
        {esJefeDePlanta && solicitudes.length === 0 && !busqueda && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-base bg-primary/10 flex items-center justify-center">
                    <FileText size={24} className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Primeros pasos</h4>
                    <p className="text-sm text-muted">Comienza a gestionar tus solicitudes</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('crear_solicitud')}
                  className="btn btn-primary w-full py-3 text-base"
                >
                  <Plus size={18} className="mr-2" />
                  Crear tu primera solicitud
                </button>
              </div>
            </div>

            <div className="card">
              <div className="p-6">
                <h4 className="font-semibold text-lg mb-4">Proceso de compra</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">1</span>
                    </div>
                    <span className="text-sm">Crear solicitud con productos</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">2</span>
                    </div>
                    <span className="text-sm">Revisión por parte de compras</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <span className="text-sm">Aprobación y compra</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">4</span>
                    </div>
                    <span className="text-sm">Entrega y recepción</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}