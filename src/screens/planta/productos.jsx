// src/screens/planta/productos.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Productos() {
  const [productos, setProductos] = useState([]);
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("catalogo_productos").select("*").order("nombre");
      setProductos(data || []);
    }
    load();
  }, []);
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Catálogo de productos</h1>
      <ul>
        {productos.map((p) => (
          <li key={p.id} className="border p-2 mb-2">
            <div className="font-medium">{p.nombre}</div>
            <div className="text-sm text-gray-500">{p.categoria}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
