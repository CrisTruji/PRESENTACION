import React from "react";
import FacturasList from "./components/facturaslist";

export default function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>📋 Sistema de Facturación</h1>
      <p>Esta aplicación está conectada a Supabase y lista para pruebas.</p>

      <hr style={{ margin: "20px 0" }} />

      <FacturasList />
    </div>
  );
}
