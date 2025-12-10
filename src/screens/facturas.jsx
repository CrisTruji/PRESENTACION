// src/screens/solicitudes/facturas.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function FacturasList() {
  const [facturas, setFacturas] = useState([]);
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("facturas")
        .select(`
          id,
          proveedor_id,
          numero_factura,
          fecha_factura,
          valor_total,
          pdf_url,
          proveedor:proveedores (id, nombre)
        `)
        .order("fecha_factura", { ascending: false });
      setFacturas(data || []);
    }
    load();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Facturas</h1>

      {facturas.length === 0 ? (
        <p>No hay facturas registradas.</p>
      ) : (
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Proveedor</th>
              <th className="p-2">Nº Factura</th>
              <th className="p-2">Fecha</th>
              <th className="p-2">Valor</th>
              <th className="p-2">PDF</th>
            </tr>
          </thead>
          <tbody>
            {facturas.map(f => (
              <tr key={f.id}>
                <td className="border p-2">{f.proveedor?.nombre}</td>
                <td className="border p-2">{f.numero_factura}</td>
                <td className="border p-2">{f.fecha_factura}</td>
                <td className="border p-2">{f.valor_total}</td>
                <td className="border p-2">
                  {f.pdf_url ? <a className="text-blue-600" href={f.pdf_url} target="_blank" rel="noreferrer">Ver</a> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
