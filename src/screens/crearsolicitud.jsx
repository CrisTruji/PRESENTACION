// src/components/CrearSolicitud.jsx
import React, { useState, useEffect } from 'react';
import { getAllProviders, getProductsByProvider, createSolicitud, createSolicitudItems } from "../lib/supabase";
import { useAuth } from '../context/auth';

export default function CrearSolicitud({ onCancelar, onSolicitudCreada }) {
  const { session } = useAuth();
  const [paso, setPaso] = useState(1); // 1: Proveedor, 2: Productos
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [busquedaProveedor, setBusquedaProveedor] = useState('');
  const [productos, setProductos] = useState([]);
  const [items, setItems] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargandoProductos, setCargandoProductos] = useState(false);

  // Filtrar proveedores según búsqueda
  const proveedoresFiltrados = proveedores.filter(prov =>
    prov.nombre.toLowerCase().includes(busquedaProveedor.toLowerCase()) ||
    prov.nit.toLowerCase().includes(busquedaProveedor.toLowerCase())
  );

  // Cargar proveedores al montar el componente
  useEffect(() => {
    cargarProveedores();
  }, []);

  // Cargar productos cuando se selecciona un proveedor
  useEffect(() => {
    if (proveedorSeleccionado) {
      cargarProductos(proveedorSeleccionado.id);
    }
  }, [proveedorSeleccionado]);

  const cargarProveedores = async () => {
    try {
      const proveedoresData = await getAllProviders();
      setProveedores(proveedoresData);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
    }
  };

  const cargarProductos = async (proveedorId) => {
    try {
      setCargandoProductos(true);
      const productosData = await getProductsByProvider(proveedorId);
      setProductos(productosData);
    } catch (error) {
      console.error('Error cargando productos:', error);
      alert('Error cargando productos del proveedor');
    } finally {
      setCargandoProductos(false);
    }
  };

  const handleSeleccionarProveedor = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setPaso(2);
  };

  const handleCantidadChange = (productoId, cantidad) => {
    if (cantidad === '' || cantidad === 0) {
      // Eliminar el producto si la cantidad es 0 o vacía
      setItems(items.filter(item => item.producto_id !== productoId));
      return;
    }

    const producto = productos.find(p => p.id === productoId);
    const itemExistente = items.find(item => item.producto_id === productoId);

    if (itemExistente) {
      // Actualizar cantidad existente
      setItems(items.map(item =>
        item.producto_id === productoId
          ? { ...item, cantidad: parseInt(cantidad) }
          : item
      ));
    } else {
      // Agregar nuevo item
      setItems([
        ...items,
        {
          producto_id: producto.id,
          producto_nombre: producto.nombre,
          producto_codigo: producto.codigo_arbol,
          producto_categoria: producto.categoria,
          cantidad: parseInt(cantidad),
          unidad: 'unidades',
          observaciones: ''
        }
      ]);
    }
  };

  const getCantidadProducto = (productoId) => {
    const item = items.find(item => item.producto_id === productoId);
    return item ? item.cantidad : '';
  };

  const calcularTotalProductos = () => {
    return items.reduce((total, item) => total + item.cantidad, 0);
  };

  const enviarSolicitud = async () => {
    if (items.length === 0) {
      alert('Debes agregar al menos un producto a la solicitud');
      return;
    }

    try {
      setLoading(true);
      
      // 1. Crear la solicitud principal
      const solicitud = await createSolicitud({
        proveedor_id: proveedorSeleccionado.id,
        created_by: session.user.id,
        estado: 'pendiente',
        observaciones: observaciones
      });

      // 2. Crear los items de la solicitud
      const itemsParaEnviar = items.map(item => ({
        solicitud_id: solicitud.id,
        catalogo_producto_id: item.producto_id,
        cantidad_solicitada: item.cantidad,
        unidad: item.unidad,
        observaciones: item.observaciones
      }));

      await createSolicitudItems(itemsParaEnviar);

      alert('✅ Solicitud enviada correctamente');
      
      // Llamar el callback para recargar la lista
      if (onSolicitudCreada) {
        onSolicitudCreada();
      }
      
    } catch (error) {
      console.error('Error enviando solicitud:', error);
      alert('❌ Error al enviar la solicitud: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="header-title">
          <h1>Nueva Solicitud de Materiales</h1>
          <p>Complete la información para crear una nueva solicitud</p>
        </div>
        <button className="btn-secondary" onClick={onCancelar}>
          ← Volver
        </button>
      </div>

      {/* Progreso */}
      <div className="progress-steps">
        <div className={`step ${paso >= 1 ? 'active' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Seleccionar Proveedor</div>
        </div>
        <div className={`step ${paso >= 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Seleccionar Productos</div>
        </div>
      </div>

      {/* Paso 1: Selección de Proveedor */}
      {paso === 1 && (
        <div className="step-container">
          <div className="search-section">
            <label className="search-label">Buscar Proveedor:</label>
            <input
              type="text"
              placeholder="Escribe el nombre o NIT del proveedor..."
              value={busquedaProveedor}
              onChange={(e) => setBusquedaProveedor(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="proveedores-grid">
            {proveedoresFiltrados.map(proveedor => (
              <div
                key={proveedor.id}
                className="proveedor-card"
                onClick={() => handleSeleccionarProveedor(proveedor)}
              >
                <div className="proveedor-info">
                  <h3 className="proveedor-nombre">{proveedor.nombre}</h3>
                  <p className="proveedor-nit">NIT: {proveedor.nit}</p>
                </div>
                <div className="proveedor-action">
                  <span className="select-arrow">→</span>
                </div>
              </div>
            ))}
          </div>

          {proveedoresFiltrados.length === 0 && busquedaProveedor && (
            <div className="empty-state">
              <p>No se encontraron proveedores con "{busquedaProveedor}"</p>
            </div>
          )}
        </div>
      )}

      {/* Paso 2: Selección de Productos */}
      {paso === 2 && (
        <div className="step-container">
          {/* Header del proveedor seleccionado */}
          <div className="selected-provider">
            <button 
              className="btn-back"
              onClick={() => setPaso(1)}
            >
              ← Cambiar Proveedor
            </button>
            <div className="provider-info">
              <h3>Proveedor: {proveedorSeleccionado.nombre}</h3>
              <p>NIT: {proveedorSeleccionado.nit}</p>
            </div>
          </div>

          {/* Lista de productos */}
          {cargandoProductos ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Cargando productos...</p>
            </div>
          ) : (
            <>
              <div className="products-section">
                <h3>Productos Disponibles</h3>
                <p>Ingresa las cantidades necesarias para cada producto:</p>
                
                <div className="products-table-container">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Código</th>
                        <th>Categoría</th>
                        <th width="150">Cantidad Requerida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map(producto => (
                        <tr key={producto.id}>
                          <td>
                            <strong>{producto.nombre}</strong>
                          </td>
                          <td>{producto.codigo_arbol}</td>
                          <td>{producto.categoria || 'Sin categoría'}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={getCantidadProducto(producto.id)}
                              onChange={(e) => handleCantidadChange(producto.id, e.target.value)}
                              className="quantity-input"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {productos.length === 0 && (
                  <div className="empty-state">
                    <p>No hay productos disponibles para este proveedor</p>
                  </div>
                )}
              </div>

              {/* Resumen y acciones */}
              {items.length > 0 && (
                <div className="summary-section">
                  <div className="summary-card">
                    <h4>Resumen de la Solicitud</h4>
                    <div className="summary-stats">
                      <div className="stat">
                        <span className="stat-label">Productos seleccionados:</span>
                        <span className="stat-value">{items.length}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Total de unidades:</span>
                        <span className="stat-value">{calcularTotalProductos()}</span>
                      </div>
                    </div>

                    <div className="observaciones-section">
                      <label>Observaciones (opcional):</label>
                      <textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Agregue observaciones adicionales para esta solicitud..."
                        className="observaciones-textarea"
                      />
                    </div>

                    <div className="action-buttons">
                      <button 
                        className="btn-primary"
                        onClick={enviarSolicitud}
                        disabled={loading}
                      >
                        {loading ? 'Enviando...' : '✅ Enviar Solicitud'}
                      </button>
                      <button 
                        className="btn-secondary"
                        onClick={onCancelar}
                        disabled={loading}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}