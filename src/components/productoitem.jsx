// src/components/ProductItem.jsx
import React from "react";

export default function ProductItem({ producto, onAgregar }) {
  const { nombre, categoria } = producto;
  return (
    <div className="border rounded p-3 flex items-center justify-between">
      <div>
        <div className="font-medium">{nombre}</div>
        <div className="text-sm text-gray-500">{categoria || "-"}</div>
      </div>

      <div className="flex items-center gap-2">
        <input type="number" min="0" placeholder="Cant." className="border p-1 w-20" id={`cant-${producto.id}`} />
        <input type="text" placeholder="Unidad" className="border p-1 w-20" id={`und-${producto.id}`} defaultValue="und" />
        <button
          className="bg-green-600 text-white px-3 py-1 rounded"
          onClick={() => {
            const cantidad = document.getElementById(`cant-${producto.id}`).value;
            const unidad = document.getElementById(`und-${producto.id}`).value || "und";
            onAgregar(producto, Number(cantidad), unidad, "");
            document.getElementById(`cant-${producto.id}`).value = "";
          }}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
