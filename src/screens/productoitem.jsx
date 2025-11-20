// src/components/productoitem.jsx
import React, { useState } from "react";

export default function ProductoItem({ producto, onSelect }) {
  const [cantidad, setCantidad] = useState(1);
  const [unidad, setUnidad] = useState("unidades");
  const [observaciones, setObservaciones] = useState("");

  const handleSelect = () => {
    onSelect({ id: producto.id, nombre: producto.nombre, codigo_arbol: producto.codigo_arbol, cantidad, unidad, observaciones });
  };

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, marginBottom: 8 }}>
      <h4>{producto.nombre}</h4>
      <p>Código: {producto.codigo_arbol}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="number" value={cantidad} min="1" onChange={(e) => setCantidad(Number(e.target.value))} />
        <input value={unidad} onChange={(e) => setUnidad(e.target.value)} />
      </div>
      <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Observaciones" />
      <div>
        <button onClick={handleSelect}>Seleccionar</button>
      </div>
    </div>
  );
}
