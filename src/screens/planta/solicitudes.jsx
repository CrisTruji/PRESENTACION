// src/screens/planta/solicitudes.jsx
import React, { useState } from "react";
import { useRouter } from "../../context/roleroutercontext";
import useSolicitudes from "../hooks/usesolicitudes";
import { useAuth } from "../../context/auth";
import { 
  ESTADOS_SOLICITUD, 
  ETIQUETAS_ESTADO_SOLICITUD,
  getEstadoClasses,
  getEstadoIcon 
} from "../../lib/estados";

export default function SolicitudesPlanta() {
  const { navigate } = useRouter();
  const { user, profile, session, roleName } = useAuth?.() || {};
  const userId = profile?.id || user?.id || session?.user?.id;

  const { solicitudes = [], loading } = useSolicitudes({ created_by: userId });

  // Pestaña activa
  const [tabActiva, setTabActiva] = useState('todas');

  // ============================================================
  // CONFIGURACIÓN POR ROL
  // ============================================================

  const esJefeDePlanta = roleName === 'jefe_de_planta';
  const esAuxiliarDeCompras = roleName === 'auxiliar_de_compras';
  const esJefeDeCompras = roleName === 'jefe_de_compras';
  const esAlmacenista = roleName === 'almacenista';
  const esAdministrador = roleName === 'administrador';

  // Definir qué pestañas ve cada rol
  const pestanasDisponibles = {
    jefe_de_planta: ['todas', 'pendientes', 'devueltas', 'aprobadas', 'compradas', 'finalizadas'],
    auxiliar_de_compras: ['todas', 'pendientes', 'aprobadas'],
    jefe_de_compras: ['todas', 'pendientes', 'aprobadas', 'compradas'],
    almacenista: ['todas', 'compradas', 'finalizadas'],
    administrador: ['todas', 'pendientes', 'devueltas', 'aprobadas', 'compradas', 'finalizadas']
  };

  const pestañasActuales = pestanasDisponibles[roleName] || ['todas'];

  // ============================================================
  // FILTROS POR ROL
  // ============================================================

  const solicitudesFiltradas = solicitudes.filter(sol => {
    if (tabActiva === 'todas') return true;
    
    if (tabActiva === 'pendientes') {
      // Para jefe de planta: solo sus pendientes
      if (esJefeDePlanta) {
        return [
          ESTADOS_SOLICITUD.PENDIENTE,
          ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR
        ].includes(sol.estado);
      }
      
      // Para auxiliar: las que debe revisar
      if (esAuxiliarDeCompras) {
        return [
          ESTADOS_SOLICITUD.PENDIENTE,
          ESTADOS_SOLICITUD.EN_REVISION_AUXILIAR
        ].includes(sol.estado);
      }
      
      // Para jefe de compras: las aprobadas por auxiliar
      if (esJefeDeCompras) {
        return sol.estado === ESTADOS_SOLICITUD.APROBADO_AUXILIAR;
      }
    }
    
    // Solo jefe de planta ve "devueltas"
    if (tabActiva === 'devueltas' && esJefeDePlanta) {
      return [
        ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA,
        ESTADOS_SOLICITUD.RECHAZADO_AUXILIAR
      ].includes(sol.estado);
    }
    
    if (tabActiva === 'aprobadas') {
      return [
        ESTADOS_SOLICITUD.APROBADO_AUXILIAR,
        ESTADOS_SOLICITUD.APROBADO_COMPRAS
      ].includes(sol.estado);
    }
    
    if (tabActiva === 'compradas') {
      return sol.estado === ESTADOS_SOLICITUD.COMPRADO;
    }
    
    if (tabActiva === 'finalizadas') {
      return sol.estado === ESTADOS_SOLICITUD.FINALIZADO;
    }
    
    return true;
  });

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

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

  // Verificar si una solicitud puede editarse (solo jefe de planta)
  const puedeEditar = (estado) => {
    return esJefeDePlanta && [
      ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA,
      ESTADOS_SOLICITUD.RECHAZADO_AUXILIAR
    ].includes(estado);
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Cargando solicitudes...</p>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              📋 {esJefeDePlanta ? 'Mis Solicitudes' : 'Solicitudes de Compra'}
            </h1>
            <p className="text-gray-600">
              {esJefeDePlanta && 'Gestiona y revisa tus solicitudes enviadas'}
              {esAuxiliarDeCompras && 'Solicitudes pendientes de revisión'}
              {esJefeDeCompras && 'Solicitudes para gestionar compra'}
              {esAlmacenista && 'Solicitudes para gestión de almacén'}
              {esAdministrador && 'Vista administrativa de todas las solicitudes'}
              {!esJefeDePlanta && !esAuxiliarDeCompras && !esJefeDeCompras && !esAlmacenista && !esAdministrador && 'Historial de solicitudes'}
            </p>
          </div>
        </div>

        {/* Tabs (solo las que corresponden al rol) */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {pestañasActuales.includes('todas') && (
            <button
              onClick={() => setTabActiva('todas')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                tabActiva === 'todas'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Todas ({stats.todas})
            </button>
          )}

          {pestañasActuales.includes('pendientes') && (
            <button
              onClick={() => setTabActiva('pendientes')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                tabActiva === 'pendientes'
                  ? 'bg-yellow-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              ⏳ Pendientes ({stats.pendientes})
            </button>
          )}

          {pestañasActuales.includes('devueltas') && (
            <button
              onClick={() => setTabActiva('devueltas')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap relative ${
                tabActiva === 'devueltas'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              ⚠️ Devueltas ({stats.devueltas})
              {stats.devueltas > 0 && tabActiva !== 'devueltas' && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {stats.devueltas}
                </span>
              )}
            </button>
          )}

          {pestañasActuales.includes('aprobadas') && (
            <button
              onClick={() => setTabActiva('aprobadas')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                tabActiva === 'aprobadas'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              ✅ Aprobadas ({stats.aprobadas})
            </button>
          )}

          {pestañasActuales.includes('compradas') && (
            <button
              onClick={() => setTabActiva('compradas')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                tabActiva === 'compradas'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              🛒 Compradas ({stats.compradas})
            </button>
          )}

          {pestañasActuales.includes('finalizadas') && (
            <button
              onClick={() => setTabActiva('finalizadas')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                tabActiva === 'finalizadas'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              🏁 Finalizadas ({stats.finalizadas})
            </button>
          )}
        </div>

        {/* Alerta para devueltas (solo jefe de planta) */}
        {tabActiva === 'devueltas' && esJefeDePlanta && stats.devueltas > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-red-900 mb-1">
                  Solicitudes devueltas para corrección
                </h3>
                <p className="text-sm text-red-800">
                  Estas solicitudes fueron rechazadas por el auxiliar de compras. 
                  Revisa los motivos, corrige los productos y vuelve a enviarlas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info según pestaña activa */}
        {tabActiva === 'compradas' && (
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <span className="text-2xl">🛒</span>
              <div>
                <h3 className="font-bold text-purple-900 mb-1">
                  Solicitudes compradas
                </h3>
                <p className="text-sm text-purple-800">
                  Estas solicitudes ya han sido procesadas en compras y están listas para ser recibidas en almacén.
                </p>
              </div>
            </div>
          </div>
        )}

        {tabActiva === 'finalizadas' && (
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <span className="text-2xl">🏁</span>
              <div>
                <h3 className="font-bold text-indigo-900 mb-1">
                  Solicitudes finalizadas
                </h3>
                <p className="text-sm text-indigo-800">
                  Estas solicitudes han completado todo el proceso y han sido recibidas en almacén.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resto del código se mantiene igual */}
      {/* Lista de solicitudes */}
      {solicitudesFiltradas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-400 text-2xl">
              {tabActiva === 'devueltas' ? '✅' : 
               tabActiva === 'compradas' ? '🛒' :
               tabActiva === 'finalizadas' ? '🏁' : '📄'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {tabActiva === 'devueltas' 
              ? '¡Excelente! No hay solicitudes devueltas' 
              : tabActiva === 'compradas'
              ? 'No hay solicitudes compradas'
              : tabActiva === 'finalizadas'
              ? 'No hay solicitudes finalizadas'
              : 'No hay solicitudes en esta categoría'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {tabActiva === 'devueltas'
              ? 'Todas tus solicitudes están siendo procesadas correctamente.'
              : tabActiva === 'pendientes'
              ? esJefeDePlanta ? 'Crea una nueva solicitud de compra para comenzar.' : 'No hay solicitudes pendientes de revisión.'
              : tabActiva === 'compradas'
              ? 'No hay solicitudes en estado de compra completada.'
              : tabActiva === 'finalizadas'
              ? 'No hay solicitudes completamente finalizadas en almacén.'
              : 'No tienes solicitudes en esta categoría aún.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Solicitud
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Proveedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Items
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {solicitudesFiltradas.map((sol) => {
                  const esDevuelta = puedeEditar(sol.estado);
                  const itemsRechazados = sol.solicitud_items?.filter(
                    item => item.estado_item === 'rechazado_auxiliar'
                  ).length || 0;

                  return (
                    <tr 
                      key={sol.id} 
                      className={`transition-colors ${
                        esDevuelta ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            esDevuelta ? 'bg-red-200' : 
                            sol.estado === ESTADOS_SOLICITUD.COMPRADO ? 'bg-purple-200' :
                            sol.estado === ESTADOS_SOLICITUD.FINALIZADO ? 'bg-indigo-200' :
                            'bg-blue-100'
                          }`}>
                            <span className={`font-bold ${
                              esDevuelta ? 'text-red-700' : 
                              sol.estado === ESTADOS_SOLICITUD.COMPRADO ? 'text-purple-700' :
                              sol.estado === ESTADOS_SOLICITUD.FINALIZADO ? 'text-indigo-700' :
                              'text-blue-600'
                            }`}>
                              {esDevuelta ? '!' : '#'}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {sol.id}
                            </div>
                            {esDevuelta && itemsRechazados > 0 && (
                              <div className="text-xs text-red-600 font-medium">
                                {itemsRechazados} rechazado{itemsRechazados > 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(sol.fecha_solicitud).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(sol.fecha_solicitud).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* Proveedor */}
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 max-w-[150px] truncate">
                          {sol.proveedor?.nombre || sol.proveedores?.nombre || 'No especificado'}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getEstadoClasses(sol.estado, 'solicitud')
                        }`}>
                          <span>{getEstadoIcon(sol.estado, 'solicitud')}</span>
                          {ETIQUETAS_ESTADO_SOLICITUD[sol.estado]}
                        </span>
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {sol.solicitud_items?.length || 0}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {esDevuelta ? (
                          <button
                            onClick={() => navigate('verificar_solicitud', { id: sol.id })}
                            className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Corregir
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate('verificar_solicitud', { id: sol.id })}
                            className="px-3 py-1.5 border border-blue-500 text-blue-600 rounded hover:bg-blue-50 text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}