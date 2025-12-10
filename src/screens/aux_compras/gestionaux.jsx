import React, { useEffect, useState } from "react";
import { getSolicitudes } from "../../services/solicitudes";

export default function GestionAux() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  async function cargarSolicitudes() {
    setLoading(true);
    const data = await getSolicitudes(); // 👈 ahora trae TODAS con prioridad
    setSolicitudes(data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-600">
        Cargando solicitudes…
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Solicitudes</h1>

      {solicitudes.length === 0 ? (
        <p className="text-gray-500">No hay solicitudes.</p>
      ) : (
        <div className="space-y-4">
          {solicitudes.map((sol) => (
            <div
              key={sol.id}
              className="border border-gray-300 rounded-lg p-4 shadow-sm bg-white"
            >
              {/* HEADER */}
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-lg">Solicitud #{sol.id}</h2>
                <span className="text-sm text-gray-500">
                  {new Date(sol.fecha_solicitud).toLocaleDateString()}
                </span>
              </div>

              {/* DATOS PRINCIPALES */}
              <p className="text-gray-700">
                <strong>Proveedor:</strong> {sol.proveedor?.nombre}
              </p>

              <p className="text-gray-700">
                <strong>Creada por:</strong> {sol.email_creador}
              </p>

              {sol.observaciones && (
                <p className="text-gray-600 mt-2 italic">{sol.observaciones}</p>
              )}

              {/* ITEMS */}
              <div className="mt-3">
                <h3 className="font-semibold mb-2">Productos solicitados:</h3>

                <ul className="space-y-2">
                  {sol.solicitud_items?.map((item) => (
                    <li
                      key={item.id}
                      className="border p-3 rounded-lg bg-gray-50"
                    >
                      <p className="font-semibold">
                        {item.catalogo_productos?.nombre}
                      </p>

                      <p className="text-gray-600 text-sm">
                        Cantidad: {item.cantidad_solicitada} {item.unidad}
                      </p>

                      <p className="text-gray-600 text-sm">
                        Estado item:{" "}
                        <span className="font-semibold">
                          {item.estado_item}
                        </span>
                      </p>

                      {item.observaciones && (
                        <p className="text-gray-600 text-sm mt-1">
                          Nota: {item.observaciones}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* botón para ver/gestionar */}
              <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Ver detalles
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
