// src/screens/admin/AdminRequests.jsx
import React, { useEffect, useState } from "react";
import { getPendingUsers, assignRole } from "../../services/profiles";
import UserCard from "../../components/UserCard";

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadRequests() {
    setLoading(true);
    const { data, error } = await getPendingUsers();

    if (error) console.error("❌ Error cargando pendientes:", error);
    else setRequests(data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  // CORRECCIÓN en admin_requests.jsx - Mejora las funciones:
async function approveUser(id, roleName = "jefe") {
  try {
    // Primero necesitamos obtener el ID del rol basado en el nombre
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id")
      .eq("nombre", roleName)
      .single();

    if (rolesError || !roles) {
      console.error("❌ Error obteniendo rol:", rolesError);
      alert("Error: No se pudo encontrar el rol especificado");
      return;
    }

    const { error } = await assignRole(id, roles.id);

    if (error) {
      console.error("❌ Error asignando rol:", error);
      alert("Error asignando rol: " + error.message);
      return;
    }

    alert("Usuario aprobado exitosamente");
    loadRequests();
  } catch (error) {
    console.error("❌ Error en approveUser:", error);
    alert("Error aprobando usuario");
  }
}

async function rejectUser(id) {
  if (confirm("¿Estás seguro de que quieres rechazar este usuario?")) {
    // Opción 1: Eliminar el perfil (y posiblemente el usuario)
    const { error } = await supabase
      .from("users_profiles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("❌ Error rechazando usuario:", error);
      alert("Error rechazando usuario");
      return;
    }

    alert("Usuario rechazado");
    loadRequests();
  }
}
}
