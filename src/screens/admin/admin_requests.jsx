// src/screens/admin/admin_requests.jsx
import React, { useEffect, useState } from "react";
import { getPendingUsers, assignRole } from "../../services/profiles";

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    pending: 0
  });
  const [selectedFilter, setSelectedFilter] = useState("all");
  
  // NUEVO: Estados para sistema de notificaciones mejorado
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionActiva, setNotificacionActiva] = useState(null);

  // NUEVO: Función mejorada para mostrar notificaciones
  const mostrarNotificacion = (tipo, mensaje, duracion = 8000) => {
    const id = Date.now();
    const nuevaNotificacion = {
      id,
      tipo,
      mensaje,
      timestamp: new Date().toLocaleTimeString(),
      duracion
    };
    
    setNotificaciones(prev => [...prev, nuevaNotificacion]);
    setNotificacionActiva(nuevaNotificacion);
    
    setTimeout(() => {
      setNotificacionActiva(prev => prev?.id === id ? null : prev);
    }, duracion);
  };

  async function loadRequests() {
    setLoading(true);
    const { data, error } = await getPendingUsers();
    if (error) {
      console.error("Error cargando pendientes:", error);
      mostrarNotificacion('error', "❌ Error cargando solicitudes pendientes", 10000);
    } else {
      setRequests(data || []);
      // Calcular estadísticas
      const today = new Date().toISOString().split('T')[0];
      const todayRequests = (data || []).filter(u => 
        u.created_at && u.created_at.startsWith(today)
      );
      
      setStats({
        total: data?.length || 0,
        today: todayRequests.length,
        pending: data?.length || 0
      });
      
      if (data?.length > 0) {
        mostrarNotificacion('success', `✅ Cargadas ${data.length} solicitudes pendientes`, 5000);
      }
    }
    setLoading(false);
  }

  useEffect(() => { 
    loadRequests(); 
  }, []);

  async function approveUser(id) {
    const roleId = 3; // Rol predeterminado
    const { data, error } = await assignRole(id, roleId);
    if (error) {
      console.error(error);
      mostrarNotificacion('error', "❌ Error al aprobar usuario", 10000);
      return;
    }
    
    mostrarNotificacion('success', "✅ Usuario aprobado correctamente", 8000);
    loadRequests();
  }

  async function rejectUser(id) {
    const confirmReject = window.confirm("¿Estás seguro de rechazar esta solicitud?");
    if (!confirmReject) return;
    
    // Implementa tu lógica de rechazo aquí
    mostrarNotificacion('success', "✅ Solicitud rechazada", 8000);
    loadRequests();
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Fecha no disponible";
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = selectedFilter === "today" 
    ? requests.filter(u => {
        const today = new Date().toISOString().split('T')[0];
        return u.created_at && u.created_at.startsWith(today);
      })
    : requests;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* NUEVO: Estilos CSS para animaciones de notificaciones */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        
        .animate-progress {
          animation: progress linear forwards;
        }
      `}</style>
      
      {/* NUEVO: Sistema de Notificaciones Mejorado */}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
        {notificacionActiva && (
          <div className={`animate-slide-in p-4 rounded-lg shadow-lg border-l-4 ${
            notificacionActiva.tipo === 'success' 
              ? 'bg-green-50 border-green-500 text-green-800' 
              : 'bg-red-50 border-red-500 text-red-800'
          }`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                {notificacionActiva.tipo === 'success' ? (
                  <svg className="w-6 h-6 mr-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 mr-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <div>
                  <p className="font-semibold">{notificacionActiva.mensaje}</p>
                  <p className="text-sm opacity-75 mt-1">{notificacionActiva.timestamp}</p>
                </div>
              </div>
              <button 
                onClick={() => setNotificacionActiva(null)}
                className="ml-4 opacity-50 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
            {/* Barra de progreso */}
            <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  notificacionActiva.tipo === 'success' ? 'bg-green-500' : 'bg-red-500'
                } animate-progress`}
                style={{ animationDuration: `${notificacionActiva.duracion}ms` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Solicitudes de Acceso</h1>
              <p className="text-gray-600 mt-1">
                Gestiona las solicitudes de registro pendientes de revisión
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={loadRequests}
                disabled={loading}
                className="btn-outline flex items-center gap-2 px-4 py-2 text-sm"
              >
                {loading ? (
                  <>
                    <div className="spinner-sm"></div>
                    <span>Cargando...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Actualizar</span>
                  </>
                )}
              </button>
              
              <div className="relative">
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="form-select py-2 pl-3 pr-8 text-sm"
                >
                  <option value="all">Todas las solicitudes</option>
                  <option value="today">Hoy</option>
                  <option value="week">Esta semana</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total pendientes</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Solicitudes hoy</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.today}</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Por revisar</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⏳</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Table Header */}
          <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Lista de solicitudes ({filteredRequests.length})
              </h3>
              <div className="text-sm text-gray-500">
                Actualizado hace unos momentos
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-12 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="spinner-lg mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando solicitudes...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredRequests.length === 0 && (
            <div className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📭</span>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  No hay solicitudes pendientes
                </h4>
                <p className="text-gray-600 mb-6">
                  Todas las solicitudes han sido revisadas. ¡Buen trabajo!
                </p>
                <button
                  onClick={loadRequests}
                  className="btn-outline px-5 py-2.5"
                >
                  Refrescar
                </button>
              </div>
            </div>
          )}

          {/* Requests List */}
          {!loading && filteredRequests.length > 0 && (
            <div className="divide-y divide-gray-100">
              {filteredRequests.map((user) => (
                <div key={user.id} className="px-6 py-5 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl flex items-center justify-center">
                          <span className="text-lg">
                            {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold text-gray-900">
                              {user.nombre || 'Usuario sin nombre'}
                            </h4>
                            <span className="badge-primary text-xs">
                              Nuevo registro
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <span>📧</span>
                              <span>{user.email || user.user_email}</span>
                            </div>
                            
                            {user.created_at && (
                              <div className="flex items-center gap-1">
                                <span>📅</span>
                                <span>{formatDate(user.created_at)}</span>
                              </div>
                            )}
                            
                            {user.role_requested && (
                              <div className="flex items-center gap-1">
                                <span>👤</span>
                                <span>Solicita: {user.role_requested}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => rejectUser(user.id)}
                        className="px-4 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                      >
                        <span>✕</span>
                        Rechazar
                      </button>
                      
                      <button
                        onClick={() => approveUser(user.id)}
                        className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2"
                      >
                        <span>✓</span>
                        Aprobar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                Mostrando <span className="font-semibold">{filteredRequests.length}</span> solicitudes
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const confirmAll = window.confirm(
                      "¿Aprobar todas las solicitudes pendientes? Esta acción puede tomar unos momentos."
                    );
                    if (confirmAll) {
                      mostrarNotificacion('info', "Función de aprobación masiva por implementar", 5000);
                    }
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Aprobar todas
                </button>
                
                <button
                  onClick={() => {
                    mostrarNotificacion('info', "Función de exportación por implementar", 5000);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium flex items-center gap-1"
                >
                  <span>📥</span>
                  Exportar lista
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600">💡</span>
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Nota importante:</p>
              <p>
                Al aprobar un usuario, se le asignará un rol predeterminado. Para asignar roles específicos, 
                implementa un selector en la función de aprobación.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}