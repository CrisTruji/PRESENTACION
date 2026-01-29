// src/screens/almacen/recepcionfactura.jsx
import React, { useEffect, useState } from "react";
import { useRouter } from "../../context/roleroutercontext";
import {
  getSolicitudesCompradas,
  getProveedoresConSolicitudesPendientes,
  registrarRecepcionFactura,
  subirPDFFactura
} from "../../services/facturas";
import notify from "../../utils/notifier";
import {
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  FileText,
  Calendar,
  Building,
  User,
  RefreshCw,
  Package,
  X,
  Loader2,
  AlertCircle,
  Receipt,
  Upload,
  DollarSign,
  AlertTriangle,
  Save
} from "lucide-react";

export default function RecepcionFactura() {
  const { navigate } = useRouter();

  // Estados principales
  const [solicitudes, setSolicitudes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [proveedorFiltro, setProveedorFiltro] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Estados para ordenamiento
  const [sortField, setSortField] = useState("fecha_solicitud");
  const [sortDirection, setSortDirection] = useState("desc");

  // Modal de registro
  const [modalAbierto, setModalAbierto] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Formulario de factura
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaFactura, setFechaFactura] = useState("");
  const [archivoPDF, setArchivoPDF] = useState(null);
  const [itemsRecepcion, setItemsRecepcion] = useState([]);
  
  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Debounce para búsqueda
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);

    return () => clearTimeout(timerId);
  }, [searchTerm]);

  async function cargarDatosIniciales() {
    setLoading(true);
    try {
      const [sols, provs] = await Promise.all([
        getSolicitudesCompradas(),
        getProveedoresConSolicitudesPendientes()
      ]);
      
      setProveedores(provs);
      // Ordenar solicitudes
      const sorted = [...(sols || [])].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (sortField === "fecha_solicitud") {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        if (sortDirection === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      setSolicitudes(sorted);
      notify.success(`Cargadas ${sorted.length} solicitudes compradas`);
    } catch (error) {
      notify.error('Error al cargar datos iniciales');
    } finally {
      setLoading(false);
    }
  }

  // Función para actualizar solo las solicitudes (sin recargar todo)
  async function actualizarSolicitudes() {
    setUpdating(true);
    setTableLoading(true);
    try {
      const sols = await getSolicitudesCompradas();
      
      // Ordenar solicitudes
      const sorted = [...(sols || [])].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (sortField === "fecha_solicitud") {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        if (sortDirection === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      setSolicitudes(sorted);
      notify.success(`Actualizadas ${sorted.length} solicitudes`);
    } catch (error) {
      notify.error('Error al actualizar solicitudes');
    } finally {
      setUpdating(false);
      setTableLoading(false);
    }
  }

  // Handlers para ordenamiento
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    
    // Ordenar localmente sin recargar
    const sorted = [...solicitudes].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      
      if (field === "fecha_solicitud") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    setSolicitudes(sorted);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  // Filtrar solicitudes por proveedor y búsqueda
  const solicitudesFiltradas = solicitudes.filter(s => {
    // Filtro por proveedor
    if (proveedorFiltro !== "todos" && s.proveedores?.id !== parseInt(proveedorFiltro)) {
      return false;
    }
    
    // Filtro por búsqueda
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      return (
        s.id.toString().includes(searchLower) ||
        (s.proveedores?.nombre || "").toLowerCase().includes(searchLower) ||
        (s.email_creador || "").toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // ============================================================
  // ABRIR MODAL DE REGISTRO
  // ============================================================

  function abrirModalRegistro(solicitud) {
    setSolicitudSeleccionada(solicitud);
    
    // Inicializar items con valores por defecto
    const itemsIniciales = solicitud.solicitud_items.map(item => ({
      item_id: item.id,
      catalogo_producto_id: item.catalogo_productos.id,
      nombre: item.catalogo_productos.nombre,
      cantidad_solicitada: item.cantidad_solicitada,
      cantidad_recibida: item.cantidad_solicitada, // Por defecto, todo llegó
      unidad: item.unidad,
      precio_unitario: 0,
      observacion: ''
    }));

    setItemsRecepcion(itemsIniciales);
    setNumeroFactura("");
    setFechaFactura(new Date().toISOString().split('T')[0]);
    setArchivoPDF(null);
    setModalAbierto(true);
  }

  // ============================================================
  // ACTUALIZAR ITEM
  // ============================================================

  function actualizarItem(index, campo, valor) {
    setItemsRecepcion(prev => {
      const nuevo = [...prev];
      nuevo[index][campo] = valor;
      return nuevo;
    });
  }

  // ============================================================
  // CALCULAR TOTALES
  // ============================================================

  const totalFactura = itemsRecepcion.reduce((sum, item) => {
    return sum + (item.cantidad_recibida * item.precio_unitario);
  }, 0);

  const hayFaltantes = itemsRecepcion.some(
    item => item.cantidad_recibida < item.cantidad_solicitada
  );

  // ============================================================
  // GUARDAR RECEPCIÓN
  // ============================================================

  async function guardarRecepcion() {
    // Validaciones
    if (!numeroFactura.trim()) {
      notify.warning('El número de factura es obligatorio');
      return;
    }

    if (!fechaFactura) {
      notify.warning('La fecha de factura es obligatoria');
      return;
    }

    const todosConPrecio = itemsRecepcion.every(item => item.precio_unitario > 0);
    if (!todosConPrecio) {
      notify.warning('Todos los productos deben tener precio');
      return;
    }

    // Validar faltantes con motivo
    const faltantesSinMotivo = itemsRecepcion.filter(
      item => item.cantidad_recibida < item.cantidad_solicitada && !item.observacion?.trim()
    );

    if (faltantesSinMotivo.length > 0) {
      notify.warning('Los productos con faltante deben tener un motivo');
      return;
    }

    setGuardando(true);

    try {
      let pdfUrl = null;

      // Subir PDF si existe
      if (archivoPDF) {
        const resultado = await subirPDFFactura(archivoPDF, solicitudSeleccionada.id);
        pdfUrl = resultado.url;
      }

      // Registrar recepción
      await registrarRecepcionFactura({
        solicitud_id: solicitudSeleccionada.id,
        proveedor_id: solicitudSeleccionada.proveedores?.id,
        numero_factura: numeroFactura,
        fecha_factura: fechaFactura,
        pdf_url: pdfUrl,
        items: itemsRecepcion,
        total_factura: totalFactura
      });

      notify.success('Recepción registrada correctamente');
      
      setModalAbierto(false);
      // Actualizar solo las solicitudes después de guardar
      actualizarSolicitudes();

    } catch (error) {
      notify.error(error.message || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  }

  // ============================================================
  // MANEJO DE ARCHIVO PDF
  // ============================================================

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        notify.error('Solo se permiten archivos PDF');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        notify.error('El archivo no debe superar 5MB');
        return;
      }
      setArchivoPDF(file);
    }
  }

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-content bg-app">
        <div className="page-container">
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4"></div>
              <p className="text-secondary font-medium">Cargando solicitudes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="section-header">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <h1 className="section-title">Recepción de Facturas</h1>
              <p className="section-subtitle">
                Registra las facturas de las solicitudes compradas
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="badge badge-primary">
                <Receipt size={14} className="mr-1" />
                Total: {solicitudesFiltradas.length}
              </span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="card p-compact mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar por ID, proveedor o creador..."
                className="form-input pl-10 pr-10 !py-2.5"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-primary"
                  type="button"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Filtro por proveedor */}
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
                size={20}
              />
              <select
                className="form-input pl-10 !py-2.5 appearance-none"
                value={proveedorFiltro}
                onChange={(e) => setProveedorFiltro(e.target.value)}
              >
                <option value="todos">Todos los proveedores</option>
                {proveedores.map((proveedor, index) => (
                  <option key={index} value={proveedor.id}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón actualizar alineado a la derecha */}
            <div className="flex items-center justify-end">
              <button 
                onClick={actualizarSolicitudes}
                disabled={updating}
                className="btn btn-outline flex items-center gap-2"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Actualizar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de Solicitudes */}
        <div className="card overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("id")}
                  >
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Solicitud {getSortIcon("id")}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("fecha_solicitud")}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Fecha y Hora {getSortIcon("fecha_solicitud")}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("proveedores.nombre")}
                  >
                    <div className="flex items-center gap-1">
                      <Building className="w-4 h-4" />
                      Proveedor {getSortIcon("proveedores.nombre")}
                    </div>
                  </th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("email_creador")}
                  >
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Creada por {getSortIcon("email_creador")}
                    </div>
                  </th>
                  <th className="table-header-cell">Productos</th>
                  <th className="table-header-cell">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="spinner spinner-lg mx-auto mb-3"></div>
                      <p className="text-muted">Actualizando solicitudes...</p>
                    </td>
                  </tr>
                ) : solicitudesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-muted">
                        <Package
                          size={48}
                          className="mx-auto mb-4 text-border"
                        />
                        <p className="text-lg font-medium mb-2 text-primary">
                          No se encontraron solicitudes
                        </p>
                        <p className="text-muted">
                          {debouncedSearchTerm || proveedorFiltro !== "todos"
                            ? "Prueba con otros filtros"
                            : "No hay solicitudes compradas pendientes"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  solicitudesFiltradas.map((sol) => (
                    <tr key={sol.id} className="table-row">
                      {/* ID */}
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-app rounded-base flex items-center justify-center mr-3 border border-light">
                            <span className="font-bold text-primary">#{sol.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td className="table-cell">
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {new Date(sol.fecha_solicitud).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-secondary">
                            {new Date(sol.fecha_solicitud).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Proveedor */}
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-base flex items-center justify-center">
                            <Building size={16} className="text-primary" />
                          </div>
                          <div>
                            <div className="text-sm truncate max-w-[150px]">
                              {sol.proveedores?.nombre || 'No especificado'}
                            </div>
                            <div className="text-xs text-secondary">
                              ID: {sol.proveedores?.id || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Creada por */}
                      <td className="table-cell">
                        <div className="text-sm truncate max-w-[150px]">
                          {sol.email_creador || 'N/A'}
                        </div>
                      </td>

                      {/* Items */}
                      <td className="table-cell">
                        <span className="badge badge-primary text-sm">
                          {sol.solicitud_items?.length || 0} productos
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="table-cell">
                        <button
                          onClick={() => abrirModalRegistro(sol)}
                          className="btn btn-primary flex items-center gap-2"
                        >
                          <FileText size={16} />
                          Registrar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de registro */}
        {modalAbierto && solicitudSeleccionada && (
          <DetalleModal
            solicitudSeleccionada={solicitudSeleccionada}
            numeroFactura={numeroFactura}
            setNumeroFactura={setNumeroFactura}
            fechaFactura={fechaFactura}
            setFechaFactura={setFechaFactura}
            archivoPDF={archivoPDF}
            handleFileChange={handleFileChange}
            setArchivoPDF={setArchivoPDF}
            itemsRecepcion={itemsRecepcion}
            actualizarItem={actualizarItem}
            totalFactura={totalFactura}
            hayFaltantes={hayFaltantes}
            guardando={guardando}
            guardarRecepcion={guardarRecepcion}
            onClose={() => setModalAbierto(false)}
          />
        )}
      </div>
    </div>
  );
}

// Componente Modal separado (se mantiene igual que antes)
function DetalleModal({
  solicitudSeleccionada,
  numeroFactura,
  setNumeroFactura,
  fechaFactura,
  setFechaFactura,
  archivoPDF,
  handleFileChange,
  setArchivoPDF,
  itemsRecepcion,
  actualizarItem,
  totalFactura,
  hayFaltantes,
  guardando,
  guardarRecepcion,
  onClose
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-card shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="card-header">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Receipt size={24} className="text-primary" />
                Registrar Recepción
              </h2>
              <p className="text-secondary">
                Solicitud #{solicitudSeleccionada.id} • Proveedor: {solicitudSeleccionada.proveedores?.nombre}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="btn btn-icon btn-outline"
              disabled={guardando}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Información de la factura */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4 pb-2 border-b border-light">
              Información de la Factura
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">
                  Número de factura <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  className="form-input"
                  placeholder="Ej: F-2023-00123"
                  disabled={guardando}
                />
              </div>

              <div>
                <label className="form-label">
                  Fecha de factura <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  value={fechaFactura}
                  onChange={(e) => setFechaFactura(e.target.value)}
                  className="form-input"
                  disabled={guardando}
                />
              </div>

              <div>
                <label className="form-label">
                  Subir PDF de factura
                </label>
                <div className="relative">
                  <label className={`flex items-center gap-3 p-3 border rounded-base cursor-pointer transition-colors ${
                    archivoPDF ? 'border-primary bg-primary/5' : 'border-base hover:border-primary'
                  }`}>
                    <div className="flex items-center justify-center w-10 h-10 bg-surface rounded-base">
                      <Upload size={20} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm">
                        {archivoPDF ? archivoPDF.name : 'Seleccionar archivo PDF'}
                      </span>
                      <span className="text-xs text-secondary block">
                        {archivoPDF ? `${(archivoPDF.size / 1024).toFixed(0)} KB` : 'Máx. 5MB'}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={guardando}
                    />
                  </label>
                  {archivoPDF && (
                    <button
                      type="button"
                      onClick={() => setArchivoPDF(null)}
                      className="absolute top-2 right-2 p-1 text-muted hover:text-error"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de productos */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-light">
              <h3 className="text-lg font-medium">
                Detalle de Productos Recibidos
              </h3>
              <div className="text-sm text-secondary">
                Total: <span className="font-semibold text-primary">{itemsRecepcion.length}</span> productos
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Producto</th>
                    <th className="table-header-cell">Solicitado</th>
                    <th className="table-header-cell">Recibido</th>
                    <th className="table-header-cell">Precio Unit.</th>
                    <th className="table-header-cell">Subtotal</th>
                    <th className="table-header-cell">Diferencia</th>
                    <th className="table-header-cell">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsRecepcion.map((item, index) => {
                    const esFaltante = item.cantidad_recibida < item.cantidad_solicitada;
                    const subtotal = item.cantidad_recibida * item.precio_unitario;
                    const diferencia = item.cantidad_solicitada - item.cantidad_recibida;
                    
                    return (
                      <tr key={index} className={`table-row ${esFaltante ? 'bg-error/5' : ''}`}>
                        <td className="table-cell">
                          <div>
                            <div className="text-sm font-medium">{item.nombre}</div>
                            <div className="text-xs text-secondary flex items-center gap-2">
                              <span>Unidad: {item.unidad}</span>
                              <span className="text-border">•</span>
                              <span>ID: {item.catalogo_producto_id}</span>
                            </div>
                          </div>
                        </td>
                        
                        <td className="table-cell">
                          <div className="text-sm font-medium">
                            {item.cantidad_solicitada}
                          </div>
                        </td>
                        
                        <td className="table-cell">
                          <input
                            type="number"
                            value={item.cantidad_recibida}
                            onChange={(e) => actualizarItem(index, 'cantidad_recibida', parseFloat(e.target.value) || 0)}
                            className="form-input text-sm w-24"
                            min="0"
                            max={item.cantidad_solicitada}
                            step="0.01"
                            disabled={guardando}
                          />
                        </td>
                        
                        <td className="table-cell">
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted">
                              <DollarSign size={14} />
                            </span>
                            <input
                              type="number"
                              value={item.precio_unitario}
                              onChange={(e) => actualizarItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                              className="form-input text-sm pl-8 w-32"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              disabled={guardando}
                            />
                          </div>
                        </td>
                        
                        <td className="table-cell">
                          <div className={`px-3 py-2 rounded-base ${
                            subtotal > 0 ? 'bg-success/10 border border-success/20' : 'bg-surface'
                          }`}>
                            <div className="text-sm font-semibold text-success">
                              ${subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </td>
                        
                        <td className="table-cell">
                          <div className={`px-3 py-2 rounded-base text-center ${
                            diferencia === 0 
                              ? 'bg-surface' 
                              : 'bg-error/10 border border-error/20 text-error'
                          }`}>
                            <div className="text-sm font-medium">
                              {diferencia}
                              {diferencia !== 0 && (
                                <span className="text-xs ml-1">({item.unidad})</span>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="table-cell">
                          {esFaltante ? (
                            <input
                              type="text"
                              value={item.observacion}
                              onChange={(e) => actualizarItem(index, 'observacion', e.target.value)}
                              className="form-input text-sm w-full border-error/50"
                              placeholder="Motivo del faltante..."
                              disabled={guardando}
                            />
                          ) : (
                            <span className="text-sm text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-surface rounded-card p-6 mb-6 border border-light">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Resumen</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-secondary">Productos procesados:</span>
                    <span className="font-medium">{itemsRecepcion.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-secondary">Productos con faltante:</span>
                    <span className={`font-medium ${hayFaltantes ? 'text-error' : ''}`}>
                      {itemsRecepcion.filter(item => item.cantidad_recibida < item.cantidad_solicitada).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-secondary">Estado de recepción:</span>
                    <span className={`badge ${hayFaltantes ? 'badge-warning' : 'badge-success'}`}>
                      {hayFaltantes ? 'Parcial' : 'Completa'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-app rounded-base p-4 border border-light">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-semibold">Total Factura:</span>
                  <span className="text-2xl font-bold text-success">
                    ${totalFactura.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-sm text-secondary">
                  Incluye {itemsRecepcion.length} productos
                </div>
                {hayFaltantes && (
                  <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded-base text-sm text-warning">
                    <AlertTriangle size={16} className="inline mr-1" />
                    Esta recepción será registrada como parcial debido a productos faltantes.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="card-footer flex justify-between items-center">
          <div className="text-sm text-secondary">
            {hayFaltantes 
              ? "Recepción parcial con productos faltantes" 
              : "Recepción completa"}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="btn btn-outline"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button 
              onClick={guardarRecepcion}
              disabled={guardando}
              className={`btn btn-primary flex items-center gap-2 ${
                guardando ? 'opacity-75' : ''
              }`}
            >
              {guardando ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Guardar Recepción
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}