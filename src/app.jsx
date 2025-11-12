import React from "react";
import FacturasList from "./components/facturaslist";

export default function App() {
  console.log("URL de Supabase:", import.meta.env.VITE_SUPABASE_URL);
console.log("Anon key:", import.meta.env.VITE_SUPABASE_ANON_KEY);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>📋 Sistema de Facturación</h1>
      <p>Esta aplicación está conectada a Supabase y lista para pruebas.</p>

      <hr style={{ margin: "20px 0" }} />

      <FacturasList />
    </div>
  );
}
