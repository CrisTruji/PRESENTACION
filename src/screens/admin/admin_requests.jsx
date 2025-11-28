// src/screens/admin/admin_requests.jsx
import React, { useEffect, useState } from "react";
import { getPendingUsers, assignRole } from "../../services/profiles";
import UserCard from "../../components/UserCard";

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadRequests() {
    setLoading(true);
    const { data, error } = await getPendingUsers();
    if (error) console.error("Error cargando pendientes:", error);
    else setRequests(data || []);
    setLoading(false);
  }

  useEffect(() => { loadRequests(); }, []);

  async function approveUser(id) {
    const { data, error } = await assignRole(id, 3); // cambia 3 por id deseado (ej. 5=administrador)
    if (error) {
      alert("Error asignando rol");
      console.error(error);
      return;
    }
    alert("Rol asignado correctamente");
    loadRequests();
  }

  async function rejectUser(id) {
    // sólo borra perfil (no auth user). Para eliminar auth user necesitas service_role en servidor.
    const { data, error } = await fetch(`/api/delete-profile/${id}`, { method: "POST" }).catch(() => ({ error: "not-implemented" }));
    alert("Usuario rechazado. Implementa borrado admin-side si deseas eliminar por completo.");
    loadRequests();
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: "#1e3a8a" }}>Solicitudes de acceso</h2>
      {loading && <p>Cargando solicitudes...</p>}
      {!loading && requests.length === 0 && <p>No hay usuarios en espera.</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {requests.map((u) => <UserCard key={u.id} user={u} onApprove={approveUser} onReject={rejectUser} />)}
      </div>
    </div>
  );
}
