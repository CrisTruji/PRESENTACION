import React, { useEffect, useState } from "react";
import { getPendingUsers, assignRole } from "../../services/profiles";
import UserCard from "../../components/UserCard";

export default function AdminDashboard() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleSelected, setRoleSelected] = useState(3);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await getPendingUsers();
    if (error) console.error("❌ Error cargando pendientes:", error);
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
      <label>Rol a asignar:</label>
      <select value={roleSelected} onChange={(e) => setRoleSelected(Number(e.target.value))} style={{ marginLeft: 8 }}>
        <option value={1}>Administrador</option>
        <option value={2}>Jefe de Planta</option>
        <option value={3}>Empleado / Auxiliar</option>
      </select>

      {loading ? <p>Cargando usuarios...</p> : (
        pending.length === 0 ? <p>No hay usuarios en espera 🎉</p> :
          pending.map((u) => <UserCard key={u.id} user={u} onApprove={() => handleApprove(u.id)} onReject={() => {}} />)
      )}
    </div>
  );
}
