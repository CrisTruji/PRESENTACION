import React, { useEffect, useState } from "react";
import { getPendingUsers, assignRole } from "../../services/profiles.js";
import UserCard from "../../components/UserCard.jsx";

export default function AdminDashboard() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleSelected, setRoleSelected] = useState(2); // default: 2

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await getPendingUsers();
    if (error) console.error("Error cargando pendientes:", error);
    else setPending(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleApprove = async (userId) => {
    const { data, error } = await assignRole(userId, roleSelected);
    if (error) {
      alert("Error asignando rol");
      console.error(error);
      return;
    }
    alert("Rol asignado correctamente");
    loadUsers();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Panel de Administración</h1>
      <p>Usuarios pendientes de aprobación:</p>

      <label>Rol a asignar:</label>
      <select value={roleSelected} onChange={(e) => setRoleSelected(Number(e.target.value))} style={{ marginBottom: 12 }}>
        <option value={1}>Administrador</option>
        <option value={2}>Jefe de planta</option>
        <option value={3}>Auxiliar de compras</option>
        <option value={4}>Jefe de compras</option>
        <option value={5}>Almacenista</option>
      </select>

      {loading ? <p>Cargando usuarios...</p> : pending.length === 0 ? <p>No hay usuarios en espera 🎉</p> : pending.map((u) => (
        <UserCard key={u.id} user={u} onApprove={() => handleApprove(u.id)} onReject={() => alert("Implementa rechazo server-side")} />
      ))}
    </div>
  );
}
