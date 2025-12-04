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
} from "../../services/profiles";

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
  const [activeTab, setActiveTab] = useState('pending');
  const [notification, setNotification] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    nombre: '',
    email: '',
    rol: ''
  });

  // Cargar datos iniciales
  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar en paralelo
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
    } catch (error) {
      console.error("Error cargando datos:", error);
      showNotification("❌ Error cargando datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAssignRole = async (userId, roleId) => {
    try {
      // Encontrar el nombre del rol
      const role = allRoles.find(r => r.id === roleId);
      const roleName = role ? role.nombre : roleId;

      // Asignar rol
      await assignRole(userId, roleId);
      
      // Actualizar estado local inmediatamente
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      
      // Recargar usuarios activos
      const updatedActiveUsers = await getActiveUsers();
      setActiveUsers(updatedActiveUsers);
      
      // Actualizar estadísticas
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        active: prev.active + 1
      }));
      
      // Mostrar feedback
      showNotification(`✅ Rol "${roleName}" asignado correctamente`);
      
    } catch (error) {
      console.error("Error asignando rol:", error);
      showNotification("❌ Error al asignar rol", "error");
    }
  };

  const handleRejectUser = async (userId) => {
    const confirmReject = window.confirm("¿Estás seguro de rechazar a este usuario? Esta acción no se puede deshacer.");
    if (!confirmReject) return;

    try {
      await rejectUser(userId);
      
      // Actualizar estado local
      setPendingUsers(prev => prev.filter(user => user.id !== userId));
      
      // Actualizar estadísticas
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        rejected: prev.rejected + 1
      }));
      
      showNotification("✅ Usuario rechazado correctamente");
      
    } catch (error) {
      console.error("Error rechazando usuario:", error);
      showNotification("❌ Error al rechazar usuario", "error");
    }
  };

  const handleDeactivateUser = async (userId, userName) => {
    const confirmDeactivate = window.confirm(`¿Estás seguro de desactivar a ${userName}? El usuario no podrá acceder al sistema.`);
    if (!confirmDeactivate) return;

    try {
      await deactivateUser(userId);
      
      // Actualizar estado local
      setActiveUsers(prev => prev.filter(user => user.id !== userId));
      
      // Recargar usuarios pendientes (por si vuelve a estar pendiente)
      const updatedPendingUsers = await getPendingUsers();
      setPendingUsers(updatedPendingUsers);
      
      // Actualizar estadísticas
      setStats(prev => ({
        ...prev,
        active: Math.max(0, prev.active - 1),
        pending: updatedPendingUsers.length // Actualizar con el nuevo conteo
      }));
      
      showNotification("✅ Usuario desactivado correctamente");
      
    } catch (error) {
      console.error("Error desactivando usuario:", error);
      showNotification("❌ Error al desactivar usuario", "error");
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
      // Validar formulario
      if (!editForm.nombre.trim() || !editForm.email.trim()) {
        showNotification("❌ Nombre y email son requeridos", "error");
        return;
      }

      // Actualizar usuario
      await updateUserProfile(editingUser.id, editForm);
      
      // Actualizar lista de usuarios activos
      const updatedActiveUsers = await getActiveUsers();
      setActiveUsers(updatedActiveUsers);
      
      // Cerrar modal
      setEditingUser(null);
      setEditForm({ nombre: '', email: '', rol: '' });
      
      showNotification("✅ Usuario actualizado correctamente");
      
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      showNotification("❌ Error al actualizar usuario", "error");
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

  // Mapear colores a roles comunes
  const getRoleColor = (roleName) => {
    const colors = {
      'administrador': 'bg-red-500',
      'jefe_de_planta': 'bg-blue-500',
      'jefe_de_compras': 'bg-purple-500',
      'auxiliar_de_compras': 'bg-green-500',
      'almacenista': 'bg-amber-500',
      'usuario': 'bg-gray-500',
    };
    return colors[roleName?.toLowerCase()] || 'bg-indigo-500';
  };

  const renderPendingUsers = () => (
    <>
      {/* Users List */}
      {pendingUsers.map(user => (
        <div key={user.id} className="px-4 sm:px-6 py-5 hover:bg-gray-50 transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-base sm:text-lg font-semibold text-primary-700">
                    {getInitials(user.nombre)}
                  </span>
                </div>
                
                {/* User Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      {user.nombre || 'Usuario sin nombre'}
                    </h4>
                    <span className="badge-warning text-xs whitespace-nowrap">
                      Pendiente
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">📧</span>
                      <span className="text-sm text-gray-600 truncate">{user.email}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500">
                      {user.created_at && (
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span>{formatDate(user.created_at)}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <span>🆔</span>
                        <span className="font-mono text-xs">{user.id.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions - VERSIÓN RESPONSIVE */}
            <div className="flex flex-col gap-3 w-full lg:w-80">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asignar rol
                </label>
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
                  className="form-select w-full text-sm"
                >
                  <option value="">Seleccionar rol…</option>
                  {allRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.nombre}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Action Buttons - VERSIÓN RESPONSIVE */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleRejectUser(user.id)}
                  className="flex-1 px-3 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-base">✕</span>
                  <span className="truncate">Rechazar</span>
                </button>
                
                {/* Quick Role Buttons - Solo en pantallas medianas+ */}
                <div className="hidden sm:flex gap-1">
                  {allRoles.slice(0, 2).map(role => (
                    <button
                      key={role.id}
                      onClick={() => handleAssignRole(user.id, role.id)}
                      className={`px-3 py-2.5 text-xs rounded-lg font-medium text-white ${getRoleColor(role.nombre)} hover:opacity-90 transition-opacity`}
                      title={`Asignar ${role.nombre}`}
                    >
                      {role.nombre.substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );

  const renderActiveUsers = () => (
    <>
      {/* Users List */}
      {activeUsers.map(user => (
        <div key={user.id} className="px-4 sm:px-6 py-5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-base sm:text-lg font-semibold text-green-700">
                    {getInitials(user.nombre)}
                  </span>
                </div>
                
                {/* User Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      {user.nombre || 'Usuario sin nombre'}
                    </h4>
                    <span className="badge-success text-xs whitespace-nowrap">
                      Activo
                    </span>
                    {user.roles && (
                      <span className={`px-2 py-1 text-xs rounded-full text-white ${getRoleColor(user.roles.nombre)}`}>
                        {user.roles.nombre}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">📧</span>
                      <span className="text-sm text-gray-600 truncate">{user.email}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500">
                      {user.created_at && (
                        <div className="flex items-center gap-1">
                          <span>📅</span>
                          <span>Registrado: {formatDate(user.created_at)}</span>
                        </div>
                      )}
                      
                      {user.updated_at && (
                        <div className="flex items-center gap-1">
                          <span>🔄</span>
                          <span>Actualizado: {formatDate(user.updated_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions - VERSIÓN RESPONSIVE MEJORADA */}
            <div className="flex flex-col gap-3 w-full sm:w-64">
              {/* Role Update */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="hidden sm:inline">Cambiar rol</span>
                  <span className="sm:hidden">Rol</span>
                </label>
                <select
                  value={selectedRole[user.id] || user.rol || ''}
                  onChange={(e) => {
                    const roleId = e.target.value;
                    if (roleId && roleId !== user.rol) {
                      handleAssignRole(user.id, roleId);
                    }
                  }}
                  className="form-select w-full text-sm"
                >
                  <option value={user.rol || ''}>
                    {user.roles?.nombre || 'Sin rol'}
                  </option>
                  {allRoles
                    .filter(role => role.id !== user.rol)
                    .map(role => (
                      <option key={role.id} value={role.id}>
                        {role.nombre}
                      </option>
                    ))}
                </select>
              </div>
              
              {/* Action Buttons - DISEÑO COMPACTO Y RESPONSIVE */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditUser(user)}
                  className="flex-1 px-3 py-2.5 border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  title="Editar usuario"
                >
                  <span className="text-sm">✏️</span>
                  <span className="hidden xs:inline text-xs">Editar</span>
                </button>
                
                <button
                  onClick={() => handleDeactivateUser(user.id, user.nombre)}
                  className="flex-1 px-3 py-2.5 border border-amber-300 text-amber-600 hover:bg-amber-50 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  title="Bloquear usuario"
                >
                  <span className="text-sm">⏸️</span>
                  <span className="hidden xs:inline text-xs">Bloquear</span>
                </button>
                
                <button
                  onClick={() => handleRejectUser(user.id)}
                  className="flex-1 px-3 py-2.5 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  title="Eliminar usuario"
                >
                  <span className="text-sm">🗑️</span>
                  <span className="hidden xs:inline text-xs">Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-4 md:p-6">
      {/* Notificación */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'error' 
            ? 'bg-red-50 border-l-4 border-red-500' 
            : 'bg-green-50 border-l-4 border-green-500'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-lg">{notification.type === 'error' ? '❌' : '✅'}</span>
            <span className="font-medium">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Editar Usuario</h3>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setEditForm({ nombre: '', email: '', rol: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
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
                  className="btn-outline flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <span>💾</span>
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Gestión de usuarios y asignación de roles
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                disabled={loading}
                className="btn-outline flex items-center gap-2 px-3 sm:px-4 py-2 text-sm"
              >
                {loading ? (
                  <>
                    <div className="spinner-sm border-t-primary-500 w-4 h-4"></div>
                    <span>Cargando...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Actualizar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="card-hover bg-white p-3 sm:p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <span className="text-lg sm:text-xl text-blue-600">👥</span>
                </div>
              </div>
            </div>

            <div className="card-hover bg-white p-3 sm:p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Pendientes</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <span className="text-lg sm:text-xl text-amber-600">⏳</span>
                </div>
              </div>
            </div>

            <div className="card-hover bg-white p-3 sm:p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Activos</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.active}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <span className="text-lg sm:text-xl text-green-600">✅</span>
                </div>
              </div>
            </div>

            <div className="card-hover bg-white p-3 sm:p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Rechazados</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.rejected}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <span className="text-lg sm:text-xl text-red-600">❌</span>
                </div>
              </div>
            </div>

            <div className="card-hover bg-white p-3 sm:p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Hoy</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stats.today}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <span className="text-lg sm:text-xl text-indigo-600">📅</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`px-3 sm:px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('pending')}
            >
              Pendientes ({stats.pending})
            </button>
            <button
              className={`px-3 sm:px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'active'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('active')}
            >
              Activos ({stats.active})
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="border-b border-gray-200 px-4 sm:px-6 py-4 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  {activeTab === 'pending' ? 'Usuarios pendientes de asignación' : 'Usuarios activos del sistema'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {activeTab === 'pending' 
                    ? 'Asigna roles a los usuarios recién registrados' 
                    : 'Gestiona los usuarios activos del sistema'}
                </p>
              </div>
              <div className="text-xs sm:text-sm text-gray-500">
                {activeTab === 'pending' 
                  ? `${pendingUsers.length} usuarios encontrados` 
                  : `${activeUsers.length} usuarios encontrados`}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-8 sm:p-12 text-center">
              <div className="inline-flex flex-col items-center">
                <div className="spinner-lg mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando usuarios...</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && (
            <>
              {activeTab === 'pending' && pendingUsers.length === 0 && (
                <div className="p-8 sm:p-12 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl sm:text-3xl">👍</span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      ¡Todo al día!
                    </h4>
                    <p className="text-gray-600 mb-6 text-sm sm:text-base">
                      No hay usuarios pendientes de asignación de rol.
                    </p>
                    <button
                      onClick={loadData}
                      className="btn-outline px-4 sm:px-5 py-2 sm:py-2.5 text-sm"
                    >
                      Verificar nuevamente
                    </button>
                  </div>
                </div>
              )}
              
              {activeTab === 'active' && activeUsers.length === 0 && (
                <div className="p-8 sm:p-12 text-center">
                  <div className="max-w-md mx-auto">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl sm:text-3xl">👥</span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                      No hay usuarios activos
                    </h4>
                    <p className="text-gray-600 mb-6 text-sm sm:text-base">
                      Todos los usuarios están pendientes o rechazados.
                    </p>
                    <button
                      onClick={() => setActiveTab('pending')}
                      className="btn-primary px-4 sm:px-5 py-2 sm:py-2.5 text-sm"
                    >
                      Ver usuarios pendientes
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Users List */}
          {!loading && (
            <div className="divide-y divide-gray-100">
              {activeTab === 'pending' && pendingUsers.length > 0 && renderPendingUsers()}
              {activeTab === 'active' && activeUsers.length > 0 && renderActiveUsers()}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 px-4 sm:px-6 py-4 bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-600">
                <p>
                  {activeTab === 'pending' 
                    ? `Mostrando ${pendingUsers.length} usuarios pendientes` 
                    : `Mostrando ${activeUsers.length} usuarios activos`}
                  {' • '}
                  Total roles disponibles: <span className="font-semibold">{allRoles.length}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {activeTab === 'pending' && (
                  <button
                    onClick={() => {
                      const confirmAll = window.confirm(
                        "¿Asignar rol por defecto a todos los usuarios pendientes?"
                      );
                      if (confirmAll) {
                        // Implementar lógica de asignación masiva
                        showNotification("Función de asignación masiva por implementar", "info");
                      }
                    }}
                    className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Asignar a todos
                  </button>
                )}
                
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="btn-primary px-3 sm:px-4 py-2 text-sm flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="spinner-sm border-t-white w-4 h-4"></div>
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      <span className="hidden xs:inline">Actualizar</span>
                      <span className="xs:hidden">Refrescar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Roles Summary */}
        {allRoles.length > 0 && (
          <div className="mt-4 sm:mt-6 p-4 sm:p-5 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Roles disponibles</h4>
              <span className="text-xs sm:text-sm text-gray-500">{allRoles.length} roles</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {allRoles.map(role => (
                <div 
                  key={role.id} 
                  className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${getRoleColor(role.nombre)}`}></div>
                    <span className="font-medium text-gray-900 text-xs sm:text-sm">{role.nombre}</span>
                  </div>
                  {role.descripcion && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{role.descripcion}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}