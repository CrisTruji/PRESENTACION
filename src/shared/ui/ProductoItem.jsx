// src/components/ProductItem.jsx
import React from "react";

export default function ProductItem({ producto, onAgregar }) {
  const { nombre, categoria, id } = producto;
  
  const handleAgregar = () => {
    const cantidadInput = document.getElementById(`cant-${id}`);
    const unidadInput = document.getElementById(`und-${id}`);
    
    const cantidad = cantidadInput.value;
    const unidad = unidadInput.value || "und";
    
    if (cantidad && Number(cantidad) > 0) {
      onAgregar(producto, Number(cantidad), unidad, "");
      cantidadInput.value = "";
    }
  };

  return (
    <div className="card flex items-center justify-between p-3 gap-3 hover:-translate-y-0.5 transition-transform">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-primary truncate">{nombre}</div>
        <div className="text-sm text-muted mt-0.5">{categoria || "Sin categoría"}</div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          placeholder="Cant."
          className="form-input w-20 !py-1.5 !px-2 text-sm"
          id={`cant-${id}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAgregar();
            }
          }}
        />
        <input
          type="text"
          placeholder="Unidad"
          className="form-input w-20 !py-1.5 !px-2 text-sm"
          id={`und-${id}`}
          defaultValue="und"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAgregar();
            }
          }}
        />
        <button
          className="btn btn-primary !py-1.5 !px-3 text-sm whitespace-nowrap"
          onClick={handleAgregar}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}