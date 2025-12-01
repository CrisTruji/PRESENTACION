// src/screens/planta/solicitudes.jsx
import React, { useEffect, useState } from "react";
import { getSolicitudesByUser } from "../../services/solicitudes";
import { useAuth } from "../../context/auth";
import { useNavigate } from "react-router-dom";

export default function SolicitudesPlanta() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);

  useEffect(() => {
    if (user) loadSolicitudes();
  }, [user]);

  async function loadSolicitudes() {
    const data = await getSolicitudesByUser(user.id);
    setSolicitudes(data);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Mis Solicitudes</h1>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">ID</th>
            <th className="p-2">Proveedor</th>
            <th className="p-2">Fecha</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {solicitudes.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="p-2">{s.id}</td>
              <td className="p-2">{s.proveedores?.nombre}</td>
              <td className="p-2">
                {new Date(s.created_at).toLocaleDateString()}
              </td>
              <td className="p-2 capitalize">{s.estado}</td>
              <td className="p-2">
                <button
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                  onClick={() => navigate(`/planta/solicitud/${s.id}`)}
                >
                  Ver Detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
