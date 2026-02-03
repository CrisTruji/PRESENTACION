// src/pages/jefe-planta/crearsolicitud.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/auth";
import { useTheme } from "../hooks/useTheme";
import { getProveedores } from "../../services/proveedores";
import { proveedorPresentacionesService } from "../../services/proveedorPresentacionesService";
import {
  crearSolicitud,
  agregarItemsSolicitud,
} from "../../services/solicitudes";
import notify from "../../utils/notifier"; // ✅ Usar sistema de notificaciones global

// Íconos de Lucide React (reemplazan emojis)
import {
  Building,
  Package,
  Wrench,
  Cpu,
  Zap,
  FlaskConical,
  Box,
  CheckCircle,
  XCircle,
  Search,
  Trash2,
  Send,
  RefreshCw,
  Users,
  HelpCircle,
  Plus,
  Store,
  ClipboardList,
  Hospital,
  ChevronRight,
  ArrowRight
} from "lucide-react";

// Paleta de colores para categorías usando variables CSS del sistema
const categoryColors = {
  Materiales: {
    light: "var(--color-primary)",
    dark: "var(--color-primary)",
    bgLight: "rgba(15, 118, 110, 0.1)",
    bgDark: "rgba(45, 212, 191, 0.1)"
  },
  Herramientas: {
    light: "var(--color-warning)",
    dark: "var(--color-warning)",
    bgLight: "rgba(245, 158, 11, 0.1)",
    bgDark: "rgba(251, 191, 36, 0.1)"
  },
  Equipos: {
    light: "var(--color-text-secondary)",
    dark: "var(--color-text-secondary)",
    bgLight: "rgba(100, 116, 139, 0.1)",
    bgDark: "rgba(203, 213, 225, 0.1)"
  },
  Eléctricos: {
    light: "#F59E0B",
    dark: "#FBBF24",
    bgLight: "rgba(245, 158, 11, 0.1)",
    bgDark: "rgba(251, 191, 36, 0.1)"
  },
  Químicos: {
    light: "var(--color-success)",
    dark: "var(--color-success)",
    bgLight: "rgba(5, 150, 105, 0.1)",
    bgDark: "rgba(16, 185, 129, 0.1)"
  },
  Insumos: {
    light: "#8B5CF6",
    dark: "#A78BFA",
    bgLight: "rgba(139, 92, 246, 0.1)",
    bgDark: "rgba(167, 139, 250, 0.1)"
  },
  default: {
    light: "var(--color-text-muted)",
    dark: "var(--color-text-muted)",
    bgLight: "rgba(148, 163, 184, 0.1)",
    bgDark: "rgba(148, 163, 184, 0.1)"
  },
};

// Íconos por categoría usando Lucide React
const categoryIcons = {
  Materiales: Building,
  Herramientas: Wrench,
  Equipos: Cpu,
  Eléctricos: Zap,
  Químicos: FlaskConical,
  Insumos: Package,
  default: Box,
};

// Lista de unidades médicas
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
  const { theme } = useTheme();
  const [proveedores, setProveedores] = useState([]);
  const [proveedoresFiltrados, setProveedoresFiltrados] = useState([]);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
  const [productos, setProductos] = useState([]);
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [proveedorNombre, setProveedorNombre] = useState("");
  const [codigoUnidad, setCodigoUnidad] = useState("");

  // Función para obtener estilos de categoría según el tema
  const getCategoryStyle = (categoria) => {
    const cat = categoryColors[categoria] || categoryColors.default;
    return {
      color: theme === 'dark' ? cat.dark : cat.light,
      backgroundColor: theme === 'dark' ? cat.bgDark : cat.bgLight,
      borderColor: theme === 'dark' ? cat.dark + '40' : cat.light + '40'
    };
  };

  // Función para obtener ícono de categoría
  const getCategoryIcon = (categoria) => {
    const IconComponent = categoryIcons[categoria] || categoryIcons.default;
    return <IconComponent size={16} />;
  };

  useEffect(() => {
    async function init() {
      try {
        setCargando(true);
        const provs = await getProveedores();
        setProveedores(provs);
        setProveedoresFiltrados(provs);
      } catch (err) {
        console.error(err);
        notify.error("Error cargando proveedores"); // ✅ Usar sistema global
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

    if (!provId) return;

    try {
      setCargandoProductos(true);
      // ACTUALIZADO: Usa proveedorPresentacionesService en lugar de getProductosByProveedor
      const { data: prods, error } = await proveedorPresentacionesService.getPresentacionesByProveedor(Number(provId));

      if (error) {
        throw error;
      }

      // Transformar la respuesta para mantener compatibilidad con el UI
      const productosFormateados = (prods || []).map(item => ({
        id: item.presentacion?.id,
        nombre: item.presentacion?.nombre || 'Sin nombre',
        codigo: item.presentacion?.codigo,
        contenido_unidad: item.presentacion?.contenido_unidad,
        unidad_contenido: item.presentacion?.unidad_contenido,
        precio_referencia: item.precio_referencia,
        producto_padre: item.producto,
        categoria: item.producto?.nombre || 'Sin categoría'
      }));
      setProductos(productosFormateados);
    } catch (err) {
      console.error(err);
      notify.error("Error cargando productos del proveedor");
    } finally {
      setCargandoProductos(false);
    }
  };

  const agregarProducto = (producto, cantidad, unidad = "und") => {
    if (!producto || !cantidad || Number(cantidad) <= 0) {
      notify.error("Ingrese una cantidad válida");
      return;
    }

    // ACTUALIZADO: Usar presentacion_id en lugar de catalogo_producto_id
    if (
      itemsSeleccionados.some(
        (i) => Number(i.presentacion_id) === producto.id
      )
    ) {
      notify.error("Este producto ya fue agregado");
      return;
    }

    setItemsSeleccionados((prev) => [
      ...prev,
      {
        presentacion_id: producto.id,
        producto_arbol_id: producto.producto_padre?.id || null,
        nombre: producto.nombre,
        categoria: producto.categoria,
        cantidad_solicitada: Number(cantidad),
        unidad,
      },
    ]);

    notify.success(`"${producto.nombre}" agregado a la solicitud`);
  };

  const eliminarItem = (id) => {
    // ACTUALIZADO: Usar presentacion_id en lugar de catalogo_producto_id
    const item = itemsSeleccionados.find((i) => i.presentacion_id === id);
    setItemsSeleccionados((prev) =>
      prev.filter((p) => p.presentacion_id !== id)
    );
    notify.success(`"${item?.nombre}" eliminado de la solicitud`);
  };

  const handleEnviarSolicitud = async () => {
    if (!proveedorSeleccionado) {
      notify.error("Seleccione un proveedor."); // ✅ Usar sistema global
      return;
    }

    if (!codigoUnidad) {
      notify.error("Seleccione una unidad."); // ✅ Usar sistema global
      return;
    }

    if (itemsSeleccionados.length === 0) {
      notify.error("Debe agregar al menos un producto."); // ✅ Usar sistema global
      return;
    }

    setCargando(true);

    try {
      const solicitud = await crearSolicitud({
        proveedor_id: Number(proveedorSeleccionado),
        codigo_unidad: codigoUnidad,
        created_by: user?.id,
        observaciones: "",
      });

      await agregarItemsSolicitud(solicitud.id, itemsSeleccionados);

      notify.success(`Solicitud creada correctamente. ID: ${solicitud.id}`); // ✅ Usar sistema global

      // Limpiar después de 3 segundos
      setTimeout(() => {
        setProveedorSeleccionado("");
        setProveedorNombre("");
        setBusquedaProveedor("");
        setProductos([]);
        setItemsSeleccionados([]);
        setCodigoUnidad("");
      }, 3000);
    } catch (err) {
      console.error(err);
      notify.error("Error creando la solicitud: " + (err.message || "Intente nuevamente")); // ✅ Usar sistema global
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
  };

  return (
    <div className="min-h-content p-compact">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="section-header">
          <h1 className="section-title">Nueva Solicitud de Compra</h1>
          <p className="section-subtitle">
            Complete los detalles para crear una nueva solicitud de compra
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda - Formularios */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Selección de Proveedor */}
            <div className="card card-hover">
              <div className="card-header">
                <div className="flex items-center">
                  <div className="stats-icon">
                    <Store size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">
                    Seleccionar Proveedor
                  </h2>
                </div>
              </div>

              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Buscar Proveedor</label>
                  
                  {/* Campo de búsqueda */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      className="form-input w-full pl-10 py-2"
                      placeholder="Escribe el nombre del proveedor..."
                      value={busquedaProveedor}
                      onChange={handleBusquedaProveedor}
                      disabled={cargando}
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search size={18} className="text-muted" />
                    </div>
                  </div>
                  
                  {/* Lista de proveedores filtrados */}
                  {busquedaProveedor && (
                    <div className="border border-base rounded-base max-h-60 overflow-y-auto mb-3 bg-surface">
                      {proveedoresFiltrados.length === 0 ? (
                        <div className="p-4 text-center text-muted">
                          No se encontraron proveedores que coincidan con "{busquedaProveedor}"
                        </div>
                      ) : (
                        proveedoresFiltrados.map((proveedor) => (
                          <div
                            key={proveedor.id}
                            className={`p-3 border-b border-base last:border-b-0 hover:bg-hover cursor-pointer transition-colors ${
                              proveedorSeleccionado === proveedor.id.toString() ? 'bg-hover' : ''
                            }`}
                            onClick={() => onProveedorChange(proveedor.id.toString())}
                          >
                            <div className="font-medium">{proveedor.nombre}</div>
                            <div className="text-xs text-muted mt-1">ID: {proveedor.id}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  {/* Información del proveedor seleccionado */}
                  {proveedorNombre && (
                    <div className="mt-4 p-3 alert alert-success">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={16} className="text-success" />
                        <span className="text-sm font-medium text-success">
                          Proveedor seleccionado:
                        </span>
                      </div>
                      <p className="font-semibold">
                        {proveedorNombre}
                      </p>
                      <button
                        type="button"
                        className="text-xs text-primary hover:text-primary-hover mt-2 transition-colors"
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
                    <div className="text-sm text-muted mt-2">
                      Escribe el nombre del proveedor para buscarlo. Hay {proveedores.length} proveedores disponibles.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card: Selección de Unidad Médica */}
            <div className="card card-hover">
              <div className="card-header">
                <div className="flex items-center">
                  <div className="stats-icon">
                    <Hospital size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">
                    Seleccionar Unidad Médica
                  </h2>
                </div>
              </div>

              <div className="card-body">
                <div className="form-group">
                  <label htmlFor="codigo_unidad" className="form-label">
                    Unidad Médica
                  </label>
                  
                  <select
                    id="codigo_unidad"
                    name="codigo_unidad"
                    required
                    value={codigoUnidad}
                    onChange={(e) => setCodigoUnidad(e.target.value)}
                    className="form-input w-full"
                  >
                    <option value="" disabled className="text-muted">
                      Seleccione una unidad...
                    </option>
                    {unidadesMedicas.map((unidad) => (
                      <option 
                        key={unidad.codigo} 
                        value={unidad.codigo}
                      >
                        {unidad.codigo} - {unidad.nombre}
                      </option>
                    ))}
                  </select>
                  
                  <p className="form-hint">
                    Se enviará el código a la columna <code className="text-primary font-medium">codigo_unidad</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Card Productos del Proveedor */}
            {proveedorSeleccionado && (
              <div className="card card-hover">
                <div className="card-header">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="stats-icon">
                        <Package size={20} />
                      </div>
                      <h2 className="text-xl font-semibold">
                        Productos Disponibles
                      </h2>
                    </div>
                    <span className="badge badge-primary">
                      {productos.length} productos
                    </span>
                  </div>
                </div>

                <div className="card-body">
                  {cargandoProductos ? (
                    <div className="flex justify-center py-8">
                      <div className="spinner"></div>
                    </div>
                  ) : productos.length === 0 ? (
                    <div className="text-center py-6">
                      <HelpCircle size={48} className="text-muted mx-auto mb-3" />
                      <p className="text-muted">
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
                          getCategoryStyle={getCategoryStyle}
                          getCategoryIcon={getCategoryIcon}
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
            <div className="card card-hover mb-6">
              <div className="card-header">
                <div className="flex items-center">
                  <div className="stats-icon">
                    <ClipboardList size={20} />
                  </div>
                  <h2 className="text-xl font-semibold">
                    Resumen de Solicitud
                  </h2>
                </div>
              </div>

              <div className="card-body">
                {/* Información del proveedor */}
                {proveedorNombre && (
                  <div className="mb-3 p-3 alert alert-success">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle size={16} className="text-success" />
                      <span className="text-sm font-medium text-success">
                        Proveedor:
                      </span>
                    </div>
                    <p className="font-semibold truncate" title={proveedorNombre}>
                      {proveedorNombre}
                    </p>
                  </div>
                )}

                {/* Información de la unidad seleccionada */}
                {codigoUnidad && (
                  <div className="mb-3 p-3 bg-hover rounded-base">
                    <div className="flex items-center gap-2 mb-1">
                      <Hospital size={16} className="text-primary" />
                      <span className="text-sm font-medium text-primary">
                        Unidad Médica:
                      </span>
                    </div>
                    <p className="font-semibold">
                      {unidadesMedicas.find(u => u.codigo === codigoUnidad)?.nombre}
                    </p>
                    <div className="text-xs text-primary font-mono mt-1">
                      Código: {codigoUnidad}
                    </div>
                  </div>
                )}

                {/* Contador de items */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted">
                      Productos seleccionados:
                    </span>
                    <span className="font-semibold text-lg">
                      {itemsSeleccionados.length}
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          itemsSeleccionados.length * 10,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  {itemsSeleccionados.length === 0 && (
                    <p className="text-sm text-muted mt-2">
                      Agregue productos para continuar
                    </p>
                  )}
                </div>

                {/* Lista de items seleccionados */}
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 mb-6">
                  {itemsSeleccionados.length === 0 ? (
                    <div className="text-center py-4">
                      <Package size={48} className="text-muted mx-auto mb-2" />
                      <p className="text-muted text-sm">
                        No hay productos seleccionados
                      </p>
                    </div>
                  ) : (
                    itemsSeleccionados.map((item, index) => (
                      <div
                        key={item.presentacion_id}
                        className="bg-surface border border-base rounded-base p-3 hover:bg-hover transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0">
                            <h4 className="font-medium truncate" title={item.nombre}>
                              {item.nombre}
                            </h4>
                            {item.categoria && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="badge text-xs px-2 py-1 border" style={getCategoryStyle(item.categoria)}>
                                  <span className="flex items-center gap-1">
                                    {getCategoryIcon(item.categoria)}
                                    {item.categoria}
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => eliminarItem(item.presentacion_id)}
                            className="text-error hover:text-error-hover transition-colors flex-shrink-0 ml-2"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-muted">Cantidad:</div>
                          <div className="font-medium text-right">
                            {item.cantidad_solicitada} {item.unidad}
                          </div>
                        </div>
                        <div className="text-xs text-muted text-right mt-2">
                          #{index + 1}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Totales */}
                {itemsSeleccionados.length > 0 && (
                  <div className="mb-6 p-3 bg-hover rounded-base">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-muted">Total productos:</span>
                      <span className="font-bold text-lg">
                        {itemsSeleccionados.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted">Cantidad total:</span>
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
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
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
                        <Send size={18} />
                        <span>Enviar Solicitud</span>
                      </>
                    )}
                  </button>

                  <button
                    className="btn btn-outline w-full flex items-center justify-center gap-2"
                    onClick={limpiarTodo}
                    disabled={cargando}
                  >
                    <RefreshCw size={18} />
                    <span>Limpiar Todo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="card">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted">
                      Proveedores disponibles
                    </p>
                    <p className="text-2xl font-bold">
                      {proveedores.length}
                    </p>
                  </div>
                  <div className="stats-icon">
                    <Users size={20} />
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
                <HelpCircle size={20} className="text-muted" />
                <h3 className="font-medium text-muted">Instrucciones</h3>
              </div>
              <ul className="text-sm text-muted space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">1.</span>
                  <span>Busque y seleccione un proveedor escribiendo su nombre</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">2.</span>
                  <span>Seleccione la unidad médica desde el listado</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">3.</span>
                  <span>
                    Agregue productos con sus cantidades
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">4.</span>
                  <span>Revise el resumen en el panel derecho</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">5.</span>
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
function ProductoFila({ producto, onAgregar, getCategoryStyle, getCategoryIcon }) {
  const [cantidad, setCantidad] = useState("");

  const handleAgregar = () => {
    if (!cantidad || Number(cantidad) <= 0) return;
    onAgregar(producto, cantidad);
    setCantidad("");
  };

  return (
    <div className="bg-surface border border-base rounded-base p-4 hover:bg-hover transition-colors">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sección izquierda: Información del producto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 border rounded-base flex items-center justify-center flex-shrink-0"
              style={getCategoryStyle(producto.categoria)}
            >
              {getCategoryIcon(producto.categoria)}
            </div>

            <div className="flex-1 min-w-0">
              <h3
                className="font-medium text-base mb-2 line-clamp-2"
                title={producto.nombre}
              >
                {producto.nombre}
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-primary text-xs">
                  ID: {producto.id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección derecha: Controles de agregar */}
        <div className="lg:w-64">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Cantidad
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ej: 10"
                  className="form-input w-full text-base"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAgregar()}
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                className="btn btn-primary flex items-center justify-center gap-2 h-[42px]"
                onClick={handleAgregar}
                disabled={!cantidad || Number(cantidad) <= 0}
              >
                <Plus size={18} />
                Agregar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}