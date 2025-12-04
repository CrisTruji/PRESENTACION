// src/screens/solicitudes/VistaCrearSolicitud.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth";
import styles from "./VistaCrearSolicitud.module.css";

/**
 * VistaCrearSolicitud: pantalla para seleccionar proveedor y productos (2 pasos)
 * onVolver: callback para volver a la lista
 * onSolicitudCreada: callback cuando se crea una solicitud
 */
export default function VistaCrearSolicitud({ onVolver, onSolicitudCreada }) {
  const { session } = useAuth();
  const [paso, setPaso] = useState(1);
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    const { getAllProviders } = await import("../../lib/supabase");
    const data = await getAllProviders();
    setProveedores(data || []);
  };

  const cargarProductos = async (proveedorId) => {
    const { getProductsByProvider } = await import("../../lib/supabase");
    const data = await getProductsByProvider(proveedorId);
    setProductos(data || []);
  };

  const proveedoresFiltrados = proveedores.filter(
    (prov) =>
      prov.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (prov.nit && prov.nit.includes(busqueda))
  );

  const seleccionarProveedor = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    cargarProductos(proveedor.id);
    setPaso(2);
  };

  const manejarCantidad = (productoId, cantidad) => {
    if (!cantidad || cantidad === "0") {
      setItems(items.filter((item) => item.producto_id !== productoId));
      return;
    }

    const producto = productos.find((p) => p.id === productoId);
    const existe = items.find((item) => item.producto_id === productoId);

    if (existe) {
      setItems(
        items.map((item) =>
          item.producto_id === productoId ? { ...item, cantidad: parseInt(cantidad, 10) } : item
        )
      );
    } else if (producto) {
      setItems([
        ...items,
        {
          producto_id: producto.id,
          producto_nombre: producto.nombre,
          producto_codigo: producto.codigo_arbol,
          cantidad: parseInt(cantidad, 10),
          unidad: "unidades",
        },
      ]);
    }
  };

  const enviarSolicitud = async () => {
    if (items.length === 0) {
      alert("Agrega al menos un producto");
      return;
    }

    try {
      setCargando(true);
      const { createSolicitud, createSolicitudItems } = await import("../../lib/supabase");

      const solicitud = await createSolicitud({
        proveedor_id: proveedorSeleccionado.id,
        created_by: session.user.id,
        estado: "pendiente",
      });

      const itemsData = items.map((item) => ({
        solicitud_id: solicitud.id,
        catalogo_producto_id: item.producto_id,
        cantidad_solicitada: item.cantidad,
        unidad: item.unidad,
      }));

      await createSolicitudItems(itemsData);
      alert("✅ Solicitud creada exitosamente");
      onSolicitudCreada();
    } catch (error) {
      alert("❌ Error: " + error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <button className={styles.botonSecundario} onClick={onVolver}>
            ← Volver
          </button>
          <h1 className={styles.titulo}>
            {paso === 1 ? "Seleccionar Proveedor" : "Seleccionar Productos"}
          </h1>
        </div>
      </div>

      <div className={styles.progreso}>
        <div className={styles.paso}>
          <div
            className={styles.circuloPaso}
            style={{ backgroundColor: paso >= 1 ? "#FF6B00" : "#E5E7EB", color: paso >= 1 ? "#fff" : "#9CA3AF" }}
          >
            1
          </div>
          <span className={paso >= 1 ? styles.pasoActivo : styles.pasoInactivo}>Proveedor</span>
        </div>

        <div className={styles.linea} />

        <div className={styles.paso}>
          <div
            className={styles.circuloPaso}
            style={{ backgroundColor: paso >= 2 ? "#FF6B00" : "#E5E7EB", color: paso >= 2 ? "#fff" : "#9CA3AF" }}
          >
            2
          </div>
          <span className={paso >= 2 ? styles.pasoActivo : styles.pasoInactivo}>Productos</span>
        </div>
      </div>

      {paso === 1 && (
        <div>
          <div className={styles.busquedaContainer}>
            <input
              type="text"
              placeholder="🔍 Buscar proveedor por nombre o NIT..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={styles.busquedaInput}
            />
          </div>

          <div className={styles.listaProveedores}>
            {proveedoresFiltrados.map((proveedor) => (
              <div
                key={proveedor.id}
                className={styles.tarjetaProveedor}
                onClick={() => seleccionarProveedor(proveedor)}
              >
                <div>
                  <h3 className={styles.nombreProveedorLista}>{proveedor.nombre}</h3>
                  <p className={styles.nit}>NIT: {proveedor.nit}</p>
                </div>
                <div className={styles.flecha}>→</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {paso === 2 && (
        <div>
          <div className={styles.infoProveedor}>
            <button className={styles.botonSecundario} onClick={() => setPaso(1)}>
              ← Cambiar proveedor
            </button>
            <div className={styles.datosProveedor}>
              <h3>{proveedorSeleccionado?.nombre}</h3>
              <p>NIT: {proveedorSeleccionado?.nit}</p>
            </div>
          </div>

          <div className={styles.tablaContainer}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th className={styles.th}>Producto</th>
                  <th className={styles.th}>Código</th>
                  <th className={styles.th}>Categoría</th>
                  <th className={styles.th}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((producto) => (
                  <tr key={producto.id} className={styles.tr}>
                    <td className={styles.td}>
                      <strong>{producto.nombre}</strong>
                    </td>
                    <td className={styles.td}>{producto.codigo_arbol}</td>
                    <td className={styles.td}>{producto.categoria || "-"}</td>
                    <td className={styles.td}>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={items.find((i) => i.producto_id === producto.id)?.cantidad || ""}
                        onChange={(e) => manejarCantidad(producto.id, e.target.value)}
                        className={styles.inputCantidad}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length > 0 && (
            <div className={styles.resumen}>
              <div className={styles.tarjetaResumen}>
                <h3>Resumen de Pedido</h3>
                <div className={styles.datosResumen}>
                  <div className={styles.datoResumen}>
                    <span>Productos seleccionados:</span>
                    <strong>{items.length}</strong>
                  </div>
                  <div className={styles.datoResumen}>
                    <span>Total unidades:</span>
                    <strong>{items.reduce((sum, item) => sum + item.cantidad, 0)}</strong>
                  </div>
                </div>
                <button className={styles.botonPrimario} onClick={enviarSolicitud} disabled={cargando}>
                  {cargando ? "Enviando..." : "✅ Enviar Solicitud"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
