// src/screens/solicitudes.jsx
import React, { useEffect, useState } from "react";
import { listSolicitudes, updateSolicitudEstado } from "../lib/solicitudes";
import { useAuth } from "../context/auth";

export default function SolicitudesScreen() {
  const { session, roleName } = useAuth();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("lista"); // "lista" o "crear"
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [productos, setProductos] = useState([]);
  const [itemsSolicitud, setItemsSolicitud] = useState([]);

  // Cargar solicitudes
  useEffect(() => { 
    cargarSolicitudes(); 
  }, []);

  const cargarSolicitudes = async () => {
    try {
      const data = await listSolicitudes();
      setSolicitudes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEstado = async (id, estado) => {
    try {
      await updateSolicitudEstado(id, estado, session?.user?.id);
      cargarSolicitudes();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Si estamos creando una solicitud
  if (vista === "crear") {
    return (
      <VistaCrearSolicitud 
        onVolver={() => setVista("lista")}
        onSolicitudCreada={() => {
          setVista("lista");
          cargarSolicitudes();
        }}
      />
    );
  }

  // Vista principal - Lista de solicitudes
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.titulo}>Solicitudes</h1>
          <p style={styles.subtitulo}>Gestiona las solicitudes de materiales</p>
        </div>
        
        {(roleName === 'jefe planta' || roleName === 'administrador') && (
          <button 
            style={styles.botonPrimario}
            onClick={() => setVista("crear")}
          >
            <span style={styles.icono}>+</span>
            Nueva Solicitud
          </button>
        )}
      </div>

      {/* Estadísticas */}
      <div style={styles.estadisticas}>
        <div style={styles.tarjetaEstadistica}>
          <div style={styles.numero}>{solicitudes.length}</div>
          <div style={styles.etiqueta}>Total</div>
        </div>
        <div style={styles.tarjetaEstadistica}>
          <div style={{...styles.numero, color: '#F59E0B'}}>
            {solicitudes.filter(s => s.estado === 'pendiente').length}
          </div>
          <div style={styles.etiqueta}>Pendientes</div>
        </div>
        <div style={styles.tarjetaEstadistica}>
          <div style={{...styles.numero, color: '#10B981'}}>
            {solicitudes.filter(s => s.estado === 'aprobada').length}
          </div>
          <div style={styles.etiqueta}>Aprobadas</div>
        </div>
      </div>

      {/* Lista de Solicitudes */}
      {loading ? (
        <div style={styles.cargando}>
          <div style={styles.spinner}></div>
          <p>Cargando solicitudes...</p>
        </div>
      ) : (
        <div style={styles.listaSolicitudes}>
          {solicitudes.length === 0 ? (
            <div style={styles.estadoVacio}>
              <div style={styles.iconoVacio}>📋</div>
              <h3>No hay solicitudes</h3>
              <p>Cuando crees solicitudes, aparecerán aquí</p>
              {(roleName === 'jefe planta' || roleName === 'administrador') && (
                <button 
                  style={styles.botonPrimario}
                  onClick={() => setVista("crear")}
                >
                  Crear primera solicitud
                </button>
              )}
            </div>
          ) : (
            solicitudes.map((solicitud) => (
              <TarjetaSolicitud 
                key={solicitud.id}
                solicitud={solicitud}
                roleName={roleName}
                onEstadoChange={handleEstado}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Componente Tarjeta de Solicitud
function TarjetaSolicitud({ solicitud, roleName, onEstadoChange }) {
  const getColorEstado = (estado) => {
    switch (estado) {
      case 'aprobada': return '#10B981';
      case 'rechazada': return '#EF4444';
      case 'pendiente': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getIconoEstado = (estado) => {
    switch (estado) {
      case 'aprobada': return '✅';
      case 'rechazada': return '❌';
      case 'pendiente': return '⏳';
      default: return '📄';
    }
  };

  return (
    <div style={styles.tarjeta}>
      <div style={styles.contenidoTarjeta}>
        <div style={styles.infoPrincipal}>
          <div style={styles.encabezado}>
            <span style={{
              ...styles.estado,
              backgroundColor: getColorEstado(solicitud.estado)
            }}>
              {getIconoEstado(solicitud.estado)} {solicitud.estado.toUpperCase()}
            </span>
            <span style={styles.fecha}>
              {new Date(solicitud.created_at).toLocaleDateString()}
            </span>
          </div>
          
          <h3 style={styles.nombreProveedor}>{solicitud.proveedor?.nombre}</h3>
          <p style={styles.creador}>
            Solicitado por: <strong>{solicitud.created_by_user?.nombre || 'Usuario'}</strong>
          </p>
        </div>

        <div style={styles.acciones}>
          {solicitud.estado === "pendiente" && roleName === 'administrador' && (
            <div style={styles.botonesAccion}>
              <button 
                style={styles.botonAprobar}
                onClick={() => onEstadoChange(solicitud.id, "aprobada")}
              >
                Aprobar
              </button>
              <button 
                style={styles.botonRechazar}
                onClick={() => onEstadoChange(solicitud.id, "rechazada")}
              >
                Rechazar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente para Crear Solicitud
function VistaCrearSolicitud({ onVolver, onSolicitudCreada }) {
  const { session } = useAuth();
  const [paso, setPaso] = useState(1);
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Cargar proveedores
  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    const { getAllProviders } = await import("../lib/supabase");
    const data = await getAllProviders();
    setProveedores(data);
  };

  const cargarProductos = async (proveedorId) => {
    const { getProductsByProvider } = await import("../lib/supabase");
    const data = await getProductsByProvider(proveedorId);
    setProductos(data);
  };

  const proveedoresFiltrados = proveedores.filter(prov =>
    prov.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    prov.nit.includes(busqueda)
  );

  const seleccionarProveedor = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    cargarProductos(proveedor.id);
    setPaso(2);
  };

  const manejarCantidad = (productoId, cantidad) => {
    if (!cantidad || cantidad === "0") {
      setItems(items.filter(item => item.producto_id !== productoId));
      return;
    }

    const producto = productos.find(p => p.id === productoId);
    const existe = items.find(item => item.producto_id === productoId);

    if (existe) {
      setItems(items.map(item => 
        item.producto_id === productoId 
          ? { ...item, cantidad: parseInt(cantidad) }
          : item
      ));
    } else {
      setItems([...items, {
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        producto_codigo: producto.codigo_arbol,
        cantidad: parseInt(cantidad),
        unidad: 'unidades'
      }]);
    }
  };

  const enviarSolicitud = async () => {
    if (items.length === 0) {
      alert("Agrega al menos un producto");
      return;
    }

    try {
      setCargando(true);
      const { createSolicitud, createSolicitudItems } = await import("../lib/supabase");

      // Crear solicitud
      const solicitud = await createSolicitud({
        proveedor_id: proveedorSeleccionado.id,
        created_by: session.user.id,
        estado: 'pendiente'
      });

      // Crear items
      const itemsData = items.map(item => ({
        solicitud_id: solicitud.id,
        catalogo_producto_id: item.producto_id,
        cantidad_solicitada: item.cantidad,
        unidad: item.unidad
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
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button style={styles.botonSecundario} onClick={onVolver}>
            ← Volver
          </button>
          <h1 style={styles.titulo}>
            {paso === 1 ? "Seleccionar Proveedor" : "Seleccionar Productos"}
          </h1>
        </div>
      </div>

      {/* Progreso */}
      <div style={styles.progreso}>
        <div style={styles.paso}>
          <div style={{
            ...styles.circuloPaso,
            backgroundColor: paso >= 1 ? '#FF6B00' : '#E5E7EB',
            color: paso >= 1 ? 'white' : '#9CA3AF'
          }}>1</div>
          <span style={{
            color: paso >= 1 ? '#FF6B00' : '#6B7280',
            fontWeight: paso >= 1 ? '600' : '400'
          }}>Proveedor</span>
        </div>
        <div style={styles.linea}></div>
        <div style={styles.paso}>
          <div style={{
            ...styles.circuloPaso,
            backgroundColor: paso >= 2 ? '#FF6B00' : '#E5E7EB',
            color: paso >= 2 ? 'white' : '#9CA3AF'
          }}>2</div>
          <span style={{
            color: paso >= 2 ? '#FF6B00' : '#6B7280',
            fontWeight: paso >= 2 ? '600' : '400'
          }}>Productos</span>
        </div>
      </div>

      {/* Paso 1: Selección de Proveedor */}
      {paso === 1 && (
        <div>
          <div style={styles.busquedaContainer}>
            <input
              type="text"
              placeholder="🔍 Buscar proveedor por nombre o NIT..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={styles.busquedaInput}
            />
          </div>

          <div style={styles.listaProveedores}>
            {proveedoresFiltrados.map(proveedor => (
              <div
                key={proveedor.id}
                style={styles.tarjetaProveedor}
                onClick={() => seleccionarProveedor(proveedor)}
              >
                <div>
                  <h3 style={styles.nombreProveedorLista}>{proveedor.nombre}</h3>
                  <p style={styles.nit}>NIT: {proveedor.nit}</p>
                </div>
                <div style={styles.flecha}>→</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paso 2: Selección de Productos */}
      {paso === 2 && (
        <div>
          {/* Info del proveedor seleccionado */}
          <div style={styles.infoProveedor}>
            <button 
              style={styles.botonSecundario}
              onClick={() => setPaso(1)}
            >
              ← Cambiar proveedor
            </button>
            <div style={styles.datosProveedor}>
              <h3>{proveedorSeleccionado.nombre}</h3>
              <p>NIT: {proveedorSeleccionado.nit}</p>
            </div>
          </div>

          {/* Tabla de productos */}
          <div style={styles.tablaContainer}>
            <table style={styles.tabla}>
              <thead>
                <tr>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>Código</th>
                  <th style={styles.th}>Categoría</th>
                  <th style={styles.th}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {productos.map(producto => (
                  <tr key={producto.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{producto.nombre}</strong>
                    </td>
                    <td style={styles.td}>{producto.codigo_arbol}</td>
                    <td style={styles.td}>{producto.categoria || '-'}</td>
                    <td style={styles.td}>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={items.find(i => i.producto_id === producto.id)?.cantidad || ""}
                        onChange={(e) => manejarCantidad(producto.id, e.target.value)}
                        style={styles.inputCantidad}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen y enviar */}
          {items.length > 0 && (
            <div style={styles.resumen}>
              <div style={styles.tarjetaResumen}>
                <h3>Resumen de Pedido</h3>
                <div style={styles.datosResumen}>
                  <div style={styles.datoResumen}>
                    <span>Productos seleccionados:</span>
                    <strong>{items.length}</strong>
                  </div>
                  <div style={styles.datoResumen}>
                    <span>Total unidades:</span>
                    <strong>{items.reduce((sum, item) => sum + item.cantidad, 0)}</strong>
                  </div>
                </div>
                <button 
                  style={styles.botonPrimario}
                  onClick={enviarSolicitud}
                  disabled={cargando}
                >
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

// ESTILOS - Diseño Moderno
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    gap: '20px'
  },
  titulo: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0 0 8px 0'
  },
  subtitulo: {
    fontSize: '16px',
    color: '#6B7280',
    margin: '0'
  },
  botonPrimario: {
    background: '#FF6B00',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  botonSecundario: {
    background: 'white',
    color: '#374151',
    border: '1px solid #D1D5DB',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  icono: {
    fontSize: '18px',
    fontWeight: 'bold'
  },
  estadisticas: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '32px'
  },
  tarjetaEstadistica: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  numero: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: '8px'
  },
  etiqueta: {
    fontSize: '14px',
    color: '#6B7280',
    fontWeight: '500'
  },
  listaSolicitudes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  tarjeta: {
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'all 0.2s'
  },
  contenidoTarjeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px'
  },
  infoPrincipal: {
    flex: '1'
  },
  encabezado: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  estado: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    color: 'white'
  },
  fecha: {
    fontSize: '14px',
    color: '#6B7280'
  },
  nombreProveedor: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 8px 0'
  },
  creador: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0'
  },
  acciones: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  botonesAccion: {
    display: 'flex',
    gap: '8px'
  },
  botonAprobar: {
    background: '#10B981',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  botonRechazar: {
    background: '#EF4444',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  cargando: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #F3F4F6',
    borderTop: '4px solid #FF6B00',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  },
  estadoVacio: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6B7280'
  },
  iconoVacio: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  // Estilos para creación de solicitud
  progreso: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '40px',
    gap: '8px'
  },
  paso: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  circuloPaso: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600'
  },
  linea: {
    width: '80px',
    height: '2px',
    background: '#E5E7EB',
    margin: '0 8px'
  },
  busquedaContainer: {
    marginBottom: '24px'
  },
  busquedaInput: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '16px'
  },
  listaProveedores: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  tarjetaProveedor: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  nombreProveedorLista: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 4px 0'
  },
  nit: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0'
  },
  flecha: {
    color: '#9CA3AF',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  infoProveedor: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    padding: '20px',
    background: '#F0F9FF',
    borderRadius: '8px',
    border: '1px solid #BAE6FD'
  },
  datosProveedor: {
    flex: '1'
  },
  tablaContainer: {
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '24px'
  },
  tabla: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    background: '#F8FAFC',
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #E5E7EB'
  },
  tr: {
    borderBottom: '1px solid #F1F5F9'
  },
  td: {
    padding: '16px',
    borderBottom: '1px solid #F1F5F9'
  },
  inputCantidad: {
    width: '80px',
    padding: '8px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    textAlign: 'center'
  },
  resumen: {
    marginTop: '32px'
  },
  tarjetaResumen: {
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  datosResumen: {
    display: 'flex',
    gap: '24px',
    marginBottom: '24px'
  },
  datoResumen: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#F8FAFC',
    borderRadius: '6px',
    flex: '1'
  }
};

// Agregar animación spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);