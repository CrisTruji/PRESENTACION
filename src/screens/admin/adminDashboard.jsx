// src/screens/admin/adminDashboard.jsx
import React, { useEffect, useState } from "react";
import { 
  getPendingUsers, 
  assignRole 
} from "../../services/profiles";

export default function AdminDashboard() {

  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar usuarios pendientes al inicio
  const loadUsers = async () => {
    setLoading(true);
    const users = await getPendingUsers();
    setPendingUsers(users);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAssignRole = async (userId, newRole) => {
    await assignRole(userId, newRole);
    await loadUsers(); // recargar lista
  };

  if (loading) return <p>Cargando usuarios...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Panel de Administración</h2>

      <h3>Usuarios pendientes de rol</h3>

      {pendingUsers.length === 0 && (
        <p>No hay usuarios pendientes 👍</p>
      )}

      {pendingUsers.map(user => (
        <div 
          key={user.id} 
          style={{
            border: "1px solid #ccc",
            padding: 10,
            borderRadius: 6,
            marginBottom: 10
          }}
        >
          <p><strong>Nombre:</strong> {user.nombre}</p>
          <p><strong>Email:</strong> {user.email}</p>

          <select
            onChange={(e) => handleAssignRole(user.id, e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Asignar rol…</option>
            <option value="jefe_de_planta">Jefe de Planta</option>
            <option value="auxiliar_de_compras">Auxiliar de Compras</option>
            <option value="jefe_de_compras">Jefe de Compras</option>
            <option value="almacenista">Almacenista</option>
            <option value="administrador">Administrador</option>
          </select>
        </div>
      ))}

      <button onClick={loadUsers} style={{ marginTop: 20 }}>
        Recargar lista
      </button>
    </div>
  );
}
