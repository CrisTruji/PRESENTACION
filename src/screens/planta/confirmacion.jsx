// src/screens/planta/confirmacion.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function ConfirmacionPlanta() {
  const navigate = useNavigate();

  return (
    <div className="p-10 text-center">
      <h1 className="text-3xl font-bold mb-4">Solicitud creada con éxito</h1>
      <p className="mb-6">Puedes verla en el listado de tus solicitudes.</p>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={() => navigate("/planta/solicitudes")}
      >
        Ir a Mis Solicitudes
      </button>
    </div>
  );
}
