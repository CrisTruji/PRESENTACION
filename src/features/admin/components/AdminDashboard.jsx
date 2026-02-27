// src/screens/admin/adminDashboard.jsx
import React, { useEffect, useState } from "react";
import {
  getPendingUsers,
  assignRole,
  getAllRoles,
  getUserStats,
  rejectUser,
  getActiveUsers,
  updateUserProfile,
  deactivateUser
} from "@/features/auth";
import notify from "@/shared/lib/notifier";
import { useAdminKPIs } from '../hooks/useAdminKPIs';
import { RecommendationWidget } from '@/features/recommendations';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Edit,
  Pause,
  Trash2,
  Save,
  UserPlus,
  RefreshCw,
  Mail,
  Key,
  Shield,
  AlertCircle,
  MoreVertical,
  ChevronDown,
  Search,
  Download,
  Filter,
  Package,
  TrendingUp,
  FileText,
  ShoppingCart,
  DollarSign
} from "lucide-react";

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    rejected: 0,
    today: 0
  });
  const [activeTab, setActiveTab] = useState('resumen');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre: '',
    email: '',
    rol: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Cargar datos iniciales
  const loadData = async () => {
    setLoading(true);
    try {
      const [pending, active, roles, userStats] = await Promise.all([
        getPendingUsers(),
        getActiveUsers(),
        getAllRoles(),
        getUserStats()
      ]);
      
      setPendingUsers(pending);
      setActiveUsers(active);
      setAllRoles(roles);
      if (userStats) setStats(userStats);
      
      notify.success("Datos cargados correctamente");
    } catch (error) {
      console.error("Error cargando datos:", error);
      notify.error("Error cargando datos del sistema");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignRole = async (userId, roleId) => {
    try {
      const role = allRoles.find(r => r.id === roleId);
      const roleName = role ? role.nombre : roleId;

      await assignRole(userId, roleId);
      
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      
      const updatedActiveUsers = await getActiveUsers();
      setActiveUsers(updatedActiveUsers);
      
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        active: prev.active + 1
      }));
      
      notify.success(`Rol "${roleName}" asignado correctamente`);
      
    } catch (error) {
      console.error("Error asignando rol:", error);
      notify.error("Error al asignar rol al usuario");
    }
  };

  const handleRejectUser = async (userId) => {
    const confirmReject = window.confirm("¿Estás seguro de rechazar a este usuario? Esta acción no se puede deshacer.");
    if (!confirmReject) return;

    try {
      await rejectUser(userId);
      
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        rejected: prev.rejected + 1
      }));
      
      notify.success("Usuario rechazado correctamente");
      
    } catch (error) {
      console.error("Error rechazando usuario:", error);
      notify.error("Error al rechazar usuario");
    }
  };

  const handleDeactivateUser = async (userId, userName) => {
    const confirmDeactivate = window.confirm(`¿Estás seguro de desactivar a ${userName}? El usuario no podrá acceder al sistema.`);
    if (!confirmDeactivate) return;

    try {
      await deactivateUser(userId);
      
      setActiveUsers(prev => prev.filter(user => user.id !== userId));
      
      const updatedPendingUsers = await getPendingUsers();
      setPendingUsers(updatedPendingUsers);
      
      setStats(prev => ({
        ...prev,
        active: Math.max(0, prev.active - 1),
        pending: updatedPendingUsers.length
      }));
      
      notify.success("Usuario desactivado correctamente");
      
    } catch (error) {
      console.error("Error desactivando usuario:", error);
      notify.error("Error al desactivar usuario");
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      nombre: user.nombre || '',
      email: user.email || '',
      rol: user.rol || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      if (!editForm.nombre.trim() || !editForm.email.trim()) {
        notify.error("Nombre y email son requeridos");
        return;
      }

      await updateUserProfile(editingUser.id, editForm);
      
      const updatedActiveUsers = await getActiveUsers();
      setActiveUsers(updatedActiveUsers);
      
      setEditingUser(null);
      setEditForm({ nombre: '', email: '', rol: '' });
      
      notify.success("Usuario actualizado correctamente");
      
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      notify.error("Error al actualizar usuario");
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrar usuarios según búsqueda y filtro
  const filteredPendingUsers = pendingUsers.filter(user => {
    const matchesSearch = user.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.rol === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredActiveUsers = activeUsers.filter(user => {
    const matchesSearch = user.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.rol === filterRole;
    return matchesSearch && matchesRole;
  });

  const currentUsers = activeTab === 'pending' ? filteredPendingUsers : filteredActiveUsers;

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="section-header">
              <h1 className="section-title">Panel de Administración</h1>
              <p className="section-subtitle">
                Gestión de usuarios y asignación de roles
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
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
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid-cards mb-6">
            <div className="stats-card">
              <div className="stats-icon bg-primary/10 text-primary">
                <Users className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{stats.total}</div>
                <div className="stats-label">Total usuarios</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon bg-warning/10 text-warning">
                <Clock className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{stats.pending}</div>
                <div className="stats-label">Pendientes</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon bg-success/10 text-success">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{stats.active}</div>
                <div className="stats-label">Activos</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon bg-error/10 text-error">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{stats.rejected}</div>
                <div className="stats-label">Rechazados</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon bg-primary/10 text-primary">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="stats-content">
                <div className="stats-value">{stats.today}</div>
                <div className="stats-label">Hoy</div>
              </div>
            </div>
          </div>

          {/* Tabs y Filtros */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex border-b border-base">
                <button
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'resumen'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-secondary'
                  }`}
                  onClick={() => setActiveTab('resumen')}
                >
                  Resumen
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'pending'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-secondary'
                  }`}
                  onClick={() => setActiveTab('pending')}
                >
                  Pendientes ({stats.pending})
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === 'active'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-secondary'
                  }`}
                  onClick={() => setActiveTab('active')}
                >
                  Activos ({stats.active})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-9 pr-4 text-sm !py-1.5"
                  />
                </div>
                
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="form-input text-sm !py-1.5"
                >
                  <option value="all">Todos los roles</option>
                  {allRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tab Resumen */}
          {activeTab === 'resumen' && <TabResumen />}

          {/* Main Content (Usuarios) */}
          <div className={`card ${activeTab === 'resumen' ? 'hidden' : ''}`}>
            {/* Header */}
            <div className="card-header">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-primary">
                    {activeTab === 'pending' ? 'Usuarios pendientes' : 'Usuarios activos'}
                  </h3>
                  <p className="text-sm text-muted mt-0.5">
                    {activeTab === 'pending' 
                      ? 'Asigna roles a los usuarios recién registrados' 
                      : 'Gestiona los usuarios activos del sistema'}
                  </p>
                </div>
                <div className="text-sm text-muted">
                  {currentUsers.length} usuarios encontrados
                </div>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="p-12 text-center">
                <div className="inline-flex flex-col items-center">
                  <div className="spinner spinner-lg mx-auto"></div>
                  <p className="mt-4 text-muted">Cargando usuarios...</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && currentUsers.length === 0 && (
              <div className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 bg-app rounded-card flex items-center justify-center mx-auto mb-4">
                    {activeTab === 'pending' ? (
                      <CheckCircle className="w-10 h-10 text-success" />
                    ) : (
                      <Users className="w-10 h-10 text-muted" />
                    )}
                  </div>
                  <h4 className="text-xl font-semibold text-primary mb-2">
                    {activeTab === 'pending' ? '¡Todo al día!' : 'No hay usuarios activos'}
                  </h4>
                  <p className="text-muted mb-6">
                    {activeTab === 'pending' 
                      ? 'No hay usuarios pendientes de asignación de rol.'
                      : 'Todos los usuarios están pendientes o rechazados.'}
                  </p>
                  {activeTab === 'pending' ? (
                    <button
                      onClick={loadData}
                      className="btn btn-outline"
                    >
                      Verificar nuevamente
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab('pending')}
                      className="btn btn-primary"
                    >
                      Ver usuarios pendientes
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Users List */}
            {!loading && currentUsers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Usuario</th>
                      <th className="table-header-cell">Correo</th>
                      <th className="table-header-cell">Fecha</th>
                      <th className="table-header-cell">Rol</th>
                      <th className="table-header-cell">Estado</th>
                      <th className="table-header-cell">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsers.map((user) => (
                      <tr key={user.id} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="user-avatar">
                              {getInitials(user.nombre)}
                            </div>
                            <div>
                              <div className="font-medium text-primary">
                                {user.nombre || 'Usuario sin nombre'}
                              </div>
                              <div className="text-xs text-muted">
                                ID: {user.id?.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted" />
                            <span className="text-secondary truncate max-w-[200px]">
                              {user.email}
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
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-muted" />
                              <span>{user.roles?.nombre || 'Sin rol'}</span>
                            </div>
                            {activeTab === 'pending' && (
                              <select
                                value={selectedRole[user.id] || ''}
                                onChange={(e) => {
                                  const roleId = e.target.value;
                                  if (roleId) {
                                    setSelectedRole(prev => ({
                                      ...prev,
                                      [user.id]: roleId
                                    }));
                                    handleAssignRole(user.id, roleId);
                                  }
                                }}
                                className="form-input text-xs !py-1 !px-2 mt-1"
                              >
                                <option value="">Asignar rol...</option>
                                {allRoles.map(role => (
                                  <option key={role.id} value={role.id}>
                                    {role.nombre}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${
                            activeTab === 'pending' 
                              ? 'badge-warning' 
                              : 'badge-success'
                          }`}>
                            {activeTab === 'pending' ? 'Pendiente' : 'Activo'}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex gap-2">
                            {activeTab === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleRejectUser(user.id)}
                                  className="btn btn-outline !py-1.5 text-sm flex items-center gap-2"
                                  style={{
                                    borderColor: 'var(--color-error)',
                                    color: 'var(--color-error)',
                                  }}
                                >
                                  <XCircle className="w-4 h-4" />
                                  Rechazar
                                </button>
                                <button
                                  onClick={() => {
                                    const defaultRole = allRoles[0]?.id;
                                    if (defaultRole) {
                                      handleAssignRole(user.id, defaultRole);
                                    }
                                  }}
                                  className="btn btn-primary !py-1.5 text-sm flex items-center gap-2"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Aprobar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="btn btn-outline !py-1.5 text-sm flex items-center gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeactivateUser(user.id, user.nombre)}
                                  className="btn btn-outline !py-1.5 text-sm flex items-center gap-2"
                                  style={{
                                    borderColor: 'var(--color-warning)',
                                    color: 'var(--color-warning)',
                                  }}
                                >
                                  <Pause className="w-4 h-4" />
                                  Bloquear
                                </button>
                              </>
                            )}
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
                  Mostrando <span className="font-semibold text-primary">{currentUsers.length}</span> usuarios
                  {filterRole !== 'all' && ` • Filtrado por rol`}
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      notify.info("Función de exportación por implementar");
                    }}
                    className="text-sm text-muted hover:text-secondary font-medium flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Roles Summary */}
          {activeTab !== 'resumen' && allRoles.length > 0 && (
            <div className="mt-6 card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-primary">Roles disponibles</h4>
                  <span className="text-sm text-muted">{allRoles.length} roles</span>
                </div>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allRoles.map(role => (
                    <div 
                      key={role.id} 
                      className="p-4 rounded-base bg-app hover:bg-app/50 transition-colors border border-base"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span className="font-medium text-primary">{role.nombre}</span>
                      </div>
                      {role.descripcion && (
                        <p className="text-sm text-muted mt-1">{role.descripcion}</p>
                      )}
                      <div className="mt-3 text-xs text-muted">
                        ID: {role.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edición - Fuera del flujo principal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-card shadow-card w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-primary">Editar Usuario</h3>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setEditForm({ nombre: '', email: '', rol: '' });
                  }}
                  className="text-muted hover:text-primary"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="form-label">Nombre completo</label>
                  <input
                    type="text"
                    value={editForm.nombre}
                    onChange={(e) => setEditForm(prev => ({ ...prev, nombre: e.target.value }))}
                    className="form-input"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                
                <div>
                  <label className="form-label">Correo electrónico</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="form-input"
                    placeholder="Ej: usuario@empresa.com"
                  />
                </div>
                
                <div>
                  <label className="form-label">Rol</label>
                  <select
                    value={editForm.rol}
                    onChange={(e) => setEditForm(prev => ({ ...prev, rol: e.target.value }))}
                    className="form-select"
                  >
                    <option value="">Seleccionar rol</option>
                    {allRoles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setEditForm({ nombre: '', email: '', rol: '' });
                  }}
                  className="btn btn-outline flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// Tab Resumen — KPIs ejecutivos
// ========================================
function TabResumen() {
  const {
    pedidosHoy, ciclosActivos, solicitudesPendientes,
    facturasSemanales, stockCritico, valorInventario, isLoading
  } = useAdminKPIs();

  const fmtMoney = (n) => '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });

  const kpis = [
    {
      label: 'Pedidos Hoy',
      value: pedidosHoy,
      icon: <FileText className="w-6 h-6" />,
      bg: 'bg-primary/10 text-primary',
      alert: false,
    },
    {
      label: 'Productos Críticos',
      value: stockCritico,
      icon: <Package className="w-6 h-6" />,
      bg: stockCritico > 0 ? 'bg-error/10 text-error' : 'bg-success/10 text-success',
      alert: stockCritico > 0,
    },
    {
      label: 'Ciclos Activos',
      value: ciclosActivos,
      icon: <TrendingUp className="w-6 h-6" />,
      bg: 'bg-primary/10 text-primary',
      alert: false,
    },
    {
      label: 'Solicitudes Pendientes',
      value: solicitudesPendientes,
      icon: <ShoppingCart className="w-6 h-6" />,
      bg: solicitudesPendientes > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success',
      alert: false,
    },
    {
      label: 'Facturas (7 días)',
      value: facturasSemanales,
      icon: <FileText className="w-6 h-6" />,
      bg: 'bg-primary/10 text-primary',
      alert: false,
    },
    {
      label: 'Valor Inventario',
      value: fmtMoney(valorInventario),
      icon: <DollarSign className="w-6 h-6" />,
      bg: 'bg-success/10 text-success',
      alert: false,
      isMoney: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <div className="spinner spinner-lg mx-auto mb-4" />
        <p className="text-muted">Cargando KPIs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`stats-card ${kpi.alert ? 'ring-1 ring-error/30' : ''}`}>
            <div className={`stats-icon ${kpi.bg}`}>
              {kpi.icon}
            </div>
            <div className="stats-content">
              <div className={`stats-value ${kpi.isMoney ? 'text-xl' : ''} ${kpi.alert ? 'text-error' : ''}`}>
                {kpi.value}
              </div>
              <div className="stats-label">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      <RecommendationWidget diasProyeccion={7} />
    </div>
  );
}