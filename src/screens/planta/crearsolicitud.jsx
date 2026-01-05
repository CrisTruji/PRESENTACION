// src/pages/jefe-planta/crearsolicitud.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth";
import { getProveedores } from "../../services/proveedores";
import { getProductosByProveedor } from "../../services/productos";
import {
  crearSolicitud,
  agregarItemsSolicitud,
} from "../../services/solicitudes";

// Paleta de colores para categorías
const categoryColors = {
  Materiales: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-200",
  },
  Herramientas: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
  },
  Equipos: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    border: "border-purple-200",
  },
  Eléctricos: {
    bg: "bg-yellow-50",
    text: "text-yellow-600",
    border: "border-yellow-200",
  },
  Químicos: {
    bg: "bg-green-50",
    text: "text-green-600",
    border: "border-green-200",
  },
  Insumos: {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    border: "border-indigo-200",
  },
  default: {
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
  },
};

// Íconos por categoría
const categoryIcons = {
  Materiales: "🏗️",
  Herramientas: "🛠️",
  Equipos: "⚙️",
  Eléctricos: "⚡",
  Químicos: "🧪",
  Insumos: "📦",
  default: "📋",
};

// Lista de unidades médicas (AGREGAR ESTA CONSTANTE)
const unidadesMedicas = [
  { codigo: "0001", nombre: "HEALTHY MATRIZ" },
  { codigo: "0002", nombre: "SEATECH" },
  { codigo: "0003", nombre: "ASOCAÑA CALI" },
  { codigo: "0004", nombre: "CLINICA LA NUESTRA" },
  { codigo: "0005", nombre: "CASA LIMPIA" },
  { codigo: "0006", nombre: "CLINICA NUEVA EL LAGO" },
  { codigo: "0007", nombre: "CLINICA RED HUMANA" },
  { codigo: "0008", nombre: "AURUM MEDICAL" },
  { codigo: "0009", nombre: "CLINICA GARPER MEDICA" },
  { codigo: "0011", nombre: "PLANTA IBAGUE" },
  { codigo: "0012", nombre: "CLINICA KERALTY" },
  { codigo: "0013", nombre: "CLINICA AVIDANTI" },
  { codigo: "0014", nombre: "BRUNE RETAIL" },
  { codigo: "0015", nombre: "RETAIL FLORIDA" },
  { codigo: "0016", nombre: "COORDINADORA MERCANTIL BGT" },
  { codigo: "0017", nombre: "CARRITO MEDICADIZ" },
  { codigo: "0018", nombre: "CARRITO KERALTY" },
  { codigo: "0019", nombre: "COLEGIO LICEO FRANCES" },
  { codigo: "0020", nombre: "VERSANIA 139" },
  { codigo: "0021", nombre: "VERSANIA AV 68" },
  { codigo: "0022", nombre: "VERSANIA PRESENTES" },
  { codigo: "0023", nombre: "CLINICA MEDICADIZ" },
  { codigo: "0024", nombre: "SEVIN DRUMMOND" },
  { codigo: "0025", nombre: "VIRREY SOLIS SUBA" },
  { codigo: "0026", nombre: "ARCHROMA BOGOTA" },
  { codigo: "0027", nombre: "HUTSMAN BOGOTA" },
  { codigo: "0028", nombre: "ALMUERZO PERSONAL BOGOTA" },
  { codigo: "0029", nombre: "ALMUERZO PERSONAL IBAGUE" },
  { codigo: "0030", nombre: "EIREN COLSANITAS" },
  { codigo: "0031", nombre: "CLINICA AZUL MEDPLUS" },
];

export default function CrearSolicitudPlanta() {
  const { user } = useAuth();
  const [proveedores, setProveedores] = useState([]);
  const [proveedoresFiltrados, setProveedoresFiltrados] = useState([]);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
  const [productos, setProductos] = useState([]);
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [codigoUnidad, setCodigoUnidad] = useState("");

  useEffect(() => {
    async function init() {
      try {
        setCargando(true);
        const provs = await getProveedores();
        setProveedores(provs);
        setProveedoresFiltrados(provs);
      } catch (err) {
        console.error(err);
        setError("Error cargando proveedores");
      } finally {
        setCargando(false);
      }
    }
    init();
  }, []);

  const handleBusquedaProveedor = (e) => {
    const termino = e.target.value;
    setBusquedaProveedor(termino);
    
    if (!termino.trim()) {
      setProveedoresFiltrados(proveedores);
    } else {
      const filtrados = proveedores.filter(proveedor =>
        proveedor.nombre.toLowerCase().includes(termino.toLowerCase())
      );
      setProveedoresFiltrados(filtrados);
    }
  };

  const onProveedorChange = async (provId) => {
    const proveedor = proveedores.find((p) => p.id === Number(provId));
    setProveedorNombre(proveedor?.nombre || "");
    setProveedorSeleccionado(provId);
    setBusquedaProveedor("");
    setProductos([]);
    setItemsSeleccionados([]);
    setError("");
    setSuccess("");

    if (!provId) return;

    try {
      setCargandoProductos(true);
      const prods = await getProductosByProveedor(Number(provId));
      setProductos(prods);
    } catch (err) {
      console.error(err);
      setError("Error cargando productos del proveedor");
    } finally {
      setCargandoProductos(false);
    }
  };

  const agregarProducto = (
    producto,
    cantidad,
    unidad = "und",
  ) => {
    if (!producto || !cantidad || Number(cantidad) <= 0) {
      setError("Ingrese una cantidad válida");
      return;
    }

    if (
      itemsSeleccionados.some(
        (i) => Number(i.catalogo_producto_id) === producto.id
      )
    ) {
      setError("Este producto ya fue agregado");
      return;
    }

    setItemsSeleccionados((prev) => [
      ...prev,
      {
        catalogo_producto_id: producto.id,
        nombre: producto.nombre,
        categoria: producto.categoria,
        cantidad_solicitada: Number(cantidad),
        unidad,
      },
    ]);

    setError("");
    setSuccess(`"${producto.nombre}" agregado a la solicitud`);

    // Auto-ocultar mensaje de éxito después de 3 segundos
    setTimeout(() => setSuccess(""), 3000);
  };

  const eliminarItem = (id) => {
    const item = itemsSeleccionados.find((i) => i.catalogo_producto_id === id);
    setItemsSeleccionados((prev) =>
      prev.filter((p) => p.catalogo_producto_id !== id)
    );
    setSuccess(`"${item?.nombre}" eliminado de la solicitud`);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleEnviarSolicitud = async () => {
    if (!proveedorSeleccionado) {
      setError("Seleccione un proveedor.");
      return;
    }

    if (!codigoUnidad) {
      setError("Seleccione una unidad.");
      return;
    }

    if (itemsSeleccionados.length === 0) {
      setError("Debe agregar al menos un producto.");
      return;
    }

    setCargando(true);
    setError("");
    setSuccess("");

    try {
      const solicitud = await crearSolicitud({
        proveedor_id: Number(proveedorSeleccionado),
        codigo_unidad: codigoUnidad,
        created_by: user?.id,
        observaciones: "",
      });

      await agregarItemsSolicitud(solicitud.id, itemsSeleccionados);

      setSuccess("✅ Solicitud creada correctamente. ID: " + solicitud.id);

      // Limpiar después de 5 segundos
      setTimeout(() => {
        setProveedorSeleccionado("");
        setProveedorNombre("");
        setBusquedaProveedor("");
        setProductos([]);
        setItemsSeleccionados([]);
        setCodigoUnidad("");
        setError("");
        setSuccess("");
      }, 5000);
    } catch (err) {
      console.error(err);
      setError(
        "Error creando la solicitud: " + (err.message || "Intente nuevamente")
      );
    } finally {
      setCargando(false);
    }
  };

  const limpiarTodo = () => {
    setProveedorSeleccionado("");
    setProveedorNombre("");
    setBusquedaProveedor("");
    setProductos([]);
    setItemsSeleccionados([]);
    setCodigoUnidad("");
    setError("");
    setSuccess("");
  };

  // Función para obtener estilos de categoría
  const getCategoryStyle = (categoria) => {
    return categoryColors[categoria] || categoryColors.default;
  };

  // Función para obtener ícono de categoría
  const getCategoryIcon = (categoria) => {
    return categoryIcons[categoria] || categoryIcons.default;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Nueva Solicitud de Compra
          </h1>
          <p className="text-gray-600">
            Complete los detalles para crear una nueva solicitud de compra
          </p>
        </div>

        {/* Alertas */}
        <div className="space-y-4 mb-6">
          {error && (
            <div className="alert-error">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="alert-success">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {success}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Formularios */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Selección de Proveedor (EXACTAMENTE IGUAL) */}
            <div className="card-hover">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <svg
                      className="w-5 h-5 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Seleccionar Proveedor
                  </h2>
                </div>

                <div className="form-group">
                  <label className="form-label">Buscar Proveedor</label>
                  
                  {/* Campo de búsqueda */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      className="form-input w-full pl-4 pr-10 py-3"
                      placeholder="Escribe el nombre del proveedor..."
                      value={busquedaProveedor}
                      onChange={handleBusquedaProveedor}
                      disabled={cargando}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Lista de proveedores filtrados */}
                  {busquedaProveedor && (
                    <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto mb-3">
                      {proveedoresFiltrados.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No se encontraron proveedores que coincidan con "{busquedaProveedor}"
                        </div>
                      ) : (
                        proveedoresFiltrados.map((proveedor) => (
                          <div
                            key={proveedor.id}
                            className={`p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                              proveedorSeleccionado === proveedor.id.toString() ? 'bg-primary-50' : ''
                            }`}
                            onClick={() => onProveedorChange(proveedor.id.toString())}
                          >
                            <div className="font-medium text-gray-800">{proveedor.nombre}</div>
                            <div className="text-xs text-gray-500 mt-1">ID: {proveedor.id}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  {/* Información del proveedor seleccionado */}
                  {proveedorNombre && (
                    <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium text-primary-600">
                          Proveedor seleccionado:
                        </span>
                      </div>
                      <p className="font-semibold text-gray-800">
                        {proveedorNombre}
                      </p>
                      <button
                        type="button"
                        className="text-xs text-primary-600 hover:text-primary-800 mt-2"
                        onClick={() => {
                          setProveedorSeleccionado("");
                          setProveedorNombre("");
                          setBusquedaProveedor("");
                        }}
                      >
                        Cambiar proveedor
                      </button>
                    </div>
                  )}
                  
                  {/* Mensaje cuando no hay búsqueda pero tampoco proveedor seleccionado */}
                  {!busquedaProveedor && !proveedorNombre && (
                    <div className="text-sm text-gray-500 mt-2">
                      Escribe el nombre del proveedor para buscarlo. Hay {proveedores.length} proveedores disponibles.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* === NUEVA CARD: Selección de Unidad Médica === */}
            <div className="card-hover">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Seleccionar Unidad Médica
                  </h2>
                </div>

                <div className="form-group">
                  <label htmlFor="codigo_unidad" className="form-label">
                    Unidad Médica
                  </label>
                  
                  {/* Select con el mismo estilo que los otros inputs */}
                  <select
                    id="codigo_unidad"
                    name="codigo_unidad"
                    required
                    value={codigoUnidad}
                    onChange={(e) => setCodigoUnidad(e.target.value)}
                    className="form-select w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500 hover:border-gray-400"
                  >
                    <option value="" disabled className="text-gray-400">
                      Seleccione una unidad...
                    </option>
                    {unidadesMedicas.map((unidad) => (
                      <option 
                        key={unidad.codigo} 
                        value={unidad.codigo}
                        className="text-gray-700"
                      >
                        {unidad.codigo} - {unidad.nombre}
                      </option>
                    ))}
                  </select>
                  
                  <p className="mt-2 text-sm text-gray-500">
                    Se enviará el código a la columna <code className="text-primary-600 font-medium">codigo_unidad</code>
                  </p>
                </div>
              </div>
            </div>
            {/* === FIN NUEVA CARD === */}

            {/* Card Productos del Proveedor */}
            {proveedorSeleccionado && (
              <div className="card-hover">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center mr-3">
                        <svg
                          className="w-5 h-5 text-secondary-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        Productos Disponibles
                      </h2>
                    </div>
                    <span className="badge-secondary">
                      {productos.length} productos
                    </span>
                  </div>

                  {cargandoProductos ? (
                    <div className="flex justify-center py-8">
                      <div className="spinner"></div>
                    </div>
                  ) : productos.length === 0 ? (
                    <div className="text-center py-6">
                      <svg
                        className="w-12 h-12 text-gray-300 mx-auto mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-gray-500">
                        Este proveedor no tiene productos asociados.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {productos.map((prod) => (
                        <ProductoFila
                          key={prod.id}
                          producto={prod}
                          onAgregar={agregarProducto}
                          categoryStyle={getCategoryStyle(prod.categoria)}
                          categoryIcon={getCategoryIcon(prod.categoria)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha - Resumen */}
          <div className="lg:col-span-1">
            {/* Card Resumen de Solicitud */}
            <div className="card-glass mb-6">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center mr-3">
                    <svg
                      className="w-5 h-5 text-accent-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Resumen de Solicitud
                  </h2>
                </div>

                {/* Información del proveedor */}
                {proveedorNombre && (
                  <div className="mb-3 p-3 bg-primary-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <svg
                        className="w-4 h-4 text-primary-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      <span className="text-sm font-medium text-primary-600">
                        Proveedor:
                      </span>
                    </div>
                    <p
                      className="font-semibold text-gray-800 truncate"
                      title={proveedorNombre}
                    >
                      {proveedorNombre}
                    </p>
                  </div>
                )}

                {/* Información de la unidad seleccionada */}
                {codigoUnidad && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm font-medium text-blue-600">
                        Unidad Médica:
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800">
                      {unidadesMedicas.find(u => u.codigo === codigoUnidad)?.nombre}
                    </p>
                    <div className="text-xs text-blue-600 font-mono mt-1">
                      Código: {codigoUnidad}
                    </div>
                  </div>
                )}

                {/* Contador de items */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">
                      Productos seleccionados:
                    </span>
                    <span className="font-semibold text-lg">
                      {itemsSeleccionados.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          itemsSeleccionados.length * 10,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  {itemsSeleccionados.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Agregue productos para continuar
                    </p>
                  )}
                </div>

                {/* Lista de items seleccionados */}
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 mb-6">
                  {itemsSeleccionados.length === 0 ? (
                    <div className="text-center py-4">
                      <svg
                        className="w-12 h-12 text-gray-300 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <p className="text-gray-500 text-sm">
                        No hay productos seleccionados
                      </p>
                    </div>
                  ) : (
                    itemsSeleccionados.map((item, index) => (
                      <div
                        key={item.catalogo_producto_id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover-scale"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0">
                            <h4
                              className="font-medium text-gray-800 truncate"
                              title={item.nombre}
                            >
                              {item.nombre}
                            </h4>
                            {item.categoria && (
                              <span className="badge-primary text-xs mt-1">
                                {item.categoria}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              eliminarItem(item.catalogo_producto_id)
                            }
                            className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0 ml-2"
                            title="Eliminar"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-600">Cantidad:</div>
                          <div className="font-medium text-right">
                            {item.cantidad_solicitada} {item.unidad}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 text-right mt-2">
                          #{index + 1}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Totales */}
                {itemsSeleccionados.length > 0 && (
                  <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-600">Total productos:</span>
                      <span className="font-bold text-lg">
                        {itemsSeleccionados.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Cantidad total:</span>
                      <span className="font-semibold">
                        {itemsSeleccionados.reduce(
                          (sum, item) => sum + item.cantidad_solicitada,
                          0
                        )}{" "}
                        unidades
                      </span>
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="space-y-3">
                  <button
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      cargando ||
                      itemsSeleccionados.length === 0 ||
                      !proveedorSeleccionado ||
                      !codigoUnidad
                    }
                    onClick={handleEnviarSolicitud}
                  >
                    {cargando ? (
                      <>
                        <div className="spinner-sm"></div>
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                        <span>Enviar Solicitud</span>
                      </>
                    )}
                  </button>

                  <button
                    className="btn-outline w-full flex items-center justify-center gap-2"
                    onClick={limpiarTodo}
                    disabled={cargando}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Limpiar Todo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="card mt-4">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      Proveedores disponibles
                    </p>
                    <p className="text-2xl font-bold text-gray-800">
                      {proveedores.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de ayuda */}
        <div className="mt-8">
          <div className="card">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="font-medium text-gray-700">Instrucciones</h3>
              </div>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-medium">1.</span>
                  <span>Busque y seleccione un proveedor escribiendo su nombre</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-medium">2.</span>
                  <span>Seleccione la unidad médica desde el listado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-medium">3.</span>
                  <span>
                    Agregue productos con sus cantidades
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-medium">4.</span>
                  <span>Revise el resumen en el panel derecho</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-medium">5.</span>
                  <span>Presione "Enviar Solicitud" cuando esté listo</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente ProductoFila
function ProductoFila({ producto, onAgregar, categoryStyle, categoryIcon }) {
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("und");

  const handleAgregar = () => {
    if (!cantidad || Number(cantidad) <= 0) return;
    onAgregar(producto, cantidad, unidad);
    setCantidad("");
    setUnidad("und");
  };

  return (
    <div className="card hover-lift border border-gray-200 mb-3">
      <div className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sección izquierda: Información del producto */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <div
                className={`w-12 h-12 ${categoryStyle.bg} ${categoryStyle.border} border rounded-lg flex items-center justify-center flex-shrink-0 mt-1`}
              >
                <span className="text-xl">{categoryIcon}</span>
              </div>

              <div className="flex-1 min-w-0">
                <h3
                  className="font-medium text-gray-800 text-base mb-2 line-clamp-2"
                  title={producto.nombre}
                >
                  {producto.nombre}
                </h3>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                    ID: {producto.id}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sección derecha: Controles de agregar */}
          <div className="lg:w-2/3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              {/* Cantidad */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Ej: 10"
                    className="form-input w-full pl-4 pr-1 py-3 text-base"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAgregar()}
                  />
                </div>
              </div>
              {/* Unidad */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1 px-5">
                  Unidad
                </label>
                <div className="relative">
                  {producto.categoria && (
                    <span
                      className={`inline-flex items-center mx-4 px-5 py-4 rounded-full text-xs font-large ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border} border`}
                    >
                      {producto.categoria}
                    </span>
                  )}
                </div>
              </div>
              {/* Botón Agregar */}
              <div className="md:col-span-2 flex items-end">
                <button
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base font-medium min-h-[48px] whitespace-nowrap"
                  onClick={handleAgregar}
                  disabled={!cantidad || Number(cantidad) <= 0}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}