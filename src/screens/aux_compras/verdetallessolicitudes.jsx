// src/screens/aux_compras/VerDetallesSolicitud.jsx

import React, { useEffect, useState } from "react";
import { useRouter } from "../../context/roleroutercontext";
import {
  getSolicitudById,
  actualizarEstadoSolicitud,
  rechazarItemAuxiliar
} from "/src/services/solicitudes";

export default function VerDetallesSolicitud() {
  // ===============================
  // ROUTER INTERNO
  // ===============================
  const { currentScreen, navigate } = useRouter();

  // ✅ ID SEGURO (NO SE ROMPE)
  const id = currentScreen?.params?.id;

  // ===============================
  // ESTADOS
  // ===============================
  const [solicitud, setSolicitud] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // MODAL
  const [modal, setModal] = useState({ open: false, item: null });
  const [comentario, setComentario] = useState("");

  // ===============================
  // CARGAR SOLICITUD
  // ===============================
  useEffect(() => {
    if (!id) {
      console.error("ID de solicitud no recibido");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const data = await getSolicitudById(id);
        setSolicitud(data);
        setItems(data?.solicitud_items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  // ===============================
  // MODAL
  // ===============================
  function abrirModal(item) {
    setComentario("");
    setModal({ open: true, item });
  }

  // ===============================
  // RECHAZAR ITEM
  // ===============================
  async function rechazarItem() {
    const item = modal.item;

    await rechazarItemAuxiliar(
      item.id,
      comentario
    );

    setItems((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? { ...p, estado_item: "rechazado_auxiliar", observaciones: comentario }
          : p
      )
    );

    setModal({ open: false, item: null });
  }

  // ===============================
  // APROBAR SOLICITUD
  // ===============================
  async function aprobarSolicitud() {
    const existeRechazado = items.some(
      (i) => i.estado_item === "rechazado_auxiliar"
    );

    if (existeRechazado) {
      alert("No puedes aprobar la solicitud, hay productos rechazados.");
      return;
    }

    await actualizarEstadoSolicitud(
      id,
      "aprobado_auxiliar",
      "Solicitud aprobada por auxiliar"
    );

    alert("Solicitud aprobada");
    navigate("gestion_aux");
  }

  // ===============================
  // DEVOLVER SOLICITUD
  // ===============================
  async function devolverSolicitud() {
    await actualizarEstadoSolicitud(
      id,
      "rechazado_auxiliar",
      "Solicitud devuelta por auxiliar"
    );

    alert("Solicitud devuelta a jefe de planta");
    navigate("gestion_aux");
  }

  // ===============================
  // LOADING
  // ===============================
  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Cargando solicitud…
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="p-6 text-center text-red-500">
        Solicitud no encontrada
      </div>
    );
  }

  // ===============================
  // UI
  // ===============================
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Solicitud #{solicitud.id}
      </h1>

      <div className="bg-white shadow rounded p-4 mb-6">
        <p><strong>Proveedor:</strong> {solicitud.proveedor?.nombre}</p>
        <p><strong>Creada por:</strong> {solicitud.email_creador}</p>
        <p><strong>Estado actual:</strong> {solicitud.estado}</p>

        {solicitud.observaciones && (
          <p className="mt-2 italic text-gray-600">
            Nota: {solicitud.observaciones}
          </p>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-2">Productos</h2>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-gray-50 border p-4 rounded shadow-sm"
          >
            <p className="font-semibold">
              {item.catalogo_productos?.nombre}
            </p>

            <p className="text-sm text-gray-700">
              Cantidad: {item.cantidad_solicitada} {item.unidad}
            </p>

            <p className="text-sm my-1">
              Estado: <span className="font-bold">{item.estado_item}</span>
            </p>

            {item.observaciones && (
              <p className="text-gray-500 text-sm mt-1">
                Nota: {item.observaciones}
              </p>
            )}

            {(item.estado_item === "pendiente" ||
              item.estado_item === "revisado_auxiliar") ? (
              <button
                onClick={() => abrirModal(item)}
                className="mt-2 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Rechazar producto
              </button>
            ) : (
              <span className="text-gray-400 text-sm">No editable</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={aprobarSolicitud}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Aprobar solicitud
        </button>

        <button
          onClick={devolverSolicitud}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Devolver completa
        </button>
      </div>

      {modal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h3 className="text-lg font-bold mb-2">Rechazar producto</h3>

            <p className="mb-2">
              {modal.item?.catalogo_productos?.nombre}
            </p>

            <textarea
              rows="3"
              className="w-full border rounded p-2"
              placeholder="Motivo (opcional)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setModal({ open: false, item: null })}
                className="px-4 py-1 bg-gray-300 rounded"
              >
                Cancelar
              </button>

              <button
                onClick={rechazarItem}
                className="px-4 py-1 bg-red-600 text-white rounded"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
