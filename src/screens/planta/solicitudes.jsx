// src/screens/planta/solicitudes.jsx
import React from "react";
import useSolicitudes from "../../screens/hooks/usesolicitudes";
import { useAuth } from "../../context/auth";

export default function SolicitudesPlanta() {
  const { user } = useAuth?.() || {};
  const { solicitudes, loading } = useSolicitudes({ created_by: user?.id });

  if (loading) return <p>Cargando solicitudes...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Mis Solicitudes</h1>
      {solicitudes.length === 0 ? (
        <p>No tienes solicitudes</p>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Proveedor</th>
              <th className="p-2">Fecha</th>
              <th className="p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id}>
                <td className="border p-2">{s.proveedor?.nombre}</td>
                <td className="border p-2">{new Date(s.fecha_solicitud).toLocaleString()}</td>
                <td className="border p-2">{s.estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
