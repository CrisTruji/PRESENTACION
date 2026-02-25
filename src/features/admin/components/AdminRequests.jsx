// src/screens/admin/admin_requests.jsx
import React, { useEffect, useState } from "react";
import { getPendingUsers, assignRole } from "@/features/auth";
import notify from "@/shared/lib/notifier";
import { 
  RefreshCw, 
  ClipboardList, 
  Calendar, 
  Clock, 
  Mail, 
  User, 
  Inbox, 
  Download, 
  LightbulbIcon,
  Check,
  X,
  FileText,
  AlertCircle
} from "lucide-react";

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    pending: 0
  });
  const [selectedFilter, setSelectedFilter] = useState("all");

  async function loadRequests() {
    setLoading(true);
    const { data, error } = await getPendingUsers();
    if (error) {
      console.error("Error cargando pendientes:", error);
      notify.error("Error cargando solicitudes pendientes");
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
        notify.success(`Cargadas ${data.length} solicitudes pendientes`);
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
      notify.error("Error al aprobar usuario");
      return;
    }
    
    notify.success("Usuario aprobado correctamente");
    loadRequests();
  }

  async function rejectUser(id) {
    const confirmReject = window.confirm("¿Estás seguro de rechazar esta solicitud?");
    if (!confirmReject) return;
    
    // Implementa tu lógica de rechazo aquí
    notify.success("Solicitud rechazada");
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
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="section-header">
              <h1 className="section-title">Solicitudes de Acceso</h1>
              <p className="section-subtitle">
                Gestiona las solicitudes de registro pendientes de revisión
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={loadRequests}
                disabled={loading}
                className="btn btn-outline flex items-center gap-2 text-sm !py-1.5"
              >
                {loading ? (
                  <>
                    <div className="spinner spinner-sm"></div>
                    <span>Cargando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Actualizar</span>
                  </>
                )}
              </button>
              
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="form-input text-sm !py-1.5"
              >
                <option value="all">Todas las solicitudes</option>
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid-cards mb-6">
            <div className="stats-card">
              <div className="stats-icon bg-primary/10 text-primary">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{stats.total}</div>
                <div className="stats-label">Total pendientes</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon bg-success/10 text-success">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{stats.today}</div>
                <div className="stats-label">Solicitudes hoy</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon bg-warning/10 text-warning">
                <Clock className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{stats.pending}</div>
                <div className="stats-label">Por revisar</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="card">
          {/* Table Header */}
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">
                Lista de solicitudes ({filteredRequests.length})
              </h3>
              <div className="text-sm text-muted">
                Actualizado recientemente
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-12 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="spinner spinner-lg mx-auto"></div>
                <p className="mt-4 text-muted">Cargando solicitudes...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredRequests.length === 0 && (
            <div className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-app rounded-card flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-10 h-10 text-muted" />
                </div>
                <h4 className="text-xl font-semibold text-primary mb-2">
                  No hay solicitudes pendientes
                </h4>
                <p className="text-muted mb-6">
                  Todas las solicitudes han sido revisadas. ¡Buen trabajo!
                </p>
                <button
                  onClick={loadRequests}
                  className="btn btn-outline"
                >
                  Refrescar
                </button>
              </div>
            </div>
          )}

          {/* Requests List */}
          {!loading && filteredRequests.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Usuario</th>
                    <th className="table-header-cell">Correo</th>
                    <th className="table-header-cell">Fecha</th>
                    <th className="table-header-cell">Rol solicitado</th>
                    <th className="table-header-cell">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((user) => (
                    <tr key={user.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="user-avatar">
                            {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-primary">
                              {user.nombre || 'Usuario sin nombre'}
                            </div>
                            <div className="badge badge-primary text-xs">
                              Nuevo registro
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted" />
                          <span className="text-secondary">
                            {user.email || user.user_email}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted" />
                          <span>{formatDate(user.created_at)}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted" />
                          <span>{user.role_requested || "No especificado"}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button
                            onClick={() => rejectUser(user.id)}
                            className="btn btn-outline !py-1.5 text-sm flex items-center gap-2"
                            style={{
                              borderColor: 'var(--color-error)',
                              color: 'var(--color-error)',
                            }}
                          >
                            <X className="w-4 h-4" />
                            Rechazar
                          </button>
                          <button
                            onClick={() => approveUser(user.id)}
                            className="btn btn-primary !py-1.5 text-sm flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Aprobar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="card-footer">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-sm text-muted">
                Mostrando <span className="font-semibold text-primary">{filteredRequests.length}</span> solicitudes
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const confirmAll = window.confirm(
                      "¿Aprobar todas las solicitudes pendientes? Esta acción puede tomar unos momentos."
                    );
                    if (confirmAll) {
                      notify.info("Función de aprobación masiva por implementar");
                    }
                  }}
                  className="text-sm text-primary hover:text-primary-hover font-medium"
                >
                  Aprobar todas
                </button>
                
                <button
                  onClick={() => {
                    notify.info("Función de exportación por implementar");
                  }}
                  className="text-sm text-muted hover:text-secondary font-medium flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Exportar lista
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 rounded-card bg-success/10 border border-success/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-base bg-success/20 flex items-center justify-center flex-shrink-0">
              <LightbulbIcon className="w-4 h-4 text-success" />
            </div>
            <div className="text-sm text-success">
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