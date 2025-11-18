import React, { useState } from "react";

export default function ProductoItem({ producto, onSelect }) {
  const [cantidad, setCantidad] = useState(1);
  const [unidad, setUnidad] = useState("unidades");
  const [observaciones, setObservaciones] = useState("");

  const handleSelect = () => {
    onSelect({ ...producto, cantidad, unidad, observaciones });
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "10px", margin: "10px" }}>
      <h4>{producto.nombre}</h4>
      <p>Código Árbol: {producto.codigo_arbol}</p>
      <p>Categoría: {producto.categoria || "N/A"}</p>
      <input
        type="number"
        value={cantidad}
        onChange={(e) => setCantidad(Number(e.target.value))}
        min="1"
        placeholder="Cantidad"
      />
      <input
        type="text"
        value={unidad}
        onChange={(e) => setUnidad(e.target.value)}
        placeholder="Unidad"
      />
      <textarea
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
        placeholder="Observaciones"
      />
      <button onClick={handleSelect}>Seleccionar para Solicitud</button>
    </div>
  );
}