// src/screens/empleados/EmpleadosTalentoHumano.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  getEmpleadosTalentoHumano,
  getEmpleadoCompleto,
  updateEmpleado,
  updateTalentoHumano,
  uploadEmpleadoDocumento,
  getEmpleadoDocumentos,
  deleteEmpleadoDocumento,
  toggleEmpleadoEstado,
  searchEmpleados,
  createEmpleadoCompleto
} from "../../services/empleadosService";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  User,
  FileText,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  Building,
  Save,
  X,
  Upload,
  Download,
  File,
  Loader2,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Shield,
  Syringe,
  BookOpen
} from "lucide-react";
import notify from "../../utils/notifier";

// Constantes para los selects
const OPCIONES_EPS = [
  "CAJA COPI",
  "CAPITAL SALUD",
  "COMPENSAR",
  "COOSALUD",
  "EPS SURA",
  "FAMISANAR",
  "FAMISANAR COLSUBCIDIO",
  "MEDIMAS",
  "NUEVA EPS",
  "SALUD TOTAL",
  "SANITAS EPS",
  "SURAMERICANA",
  "ASMET SALUD ESS",
  "CAFAM",
  "COMFAMILIAR HUILA",
  "COSALUD",
  "DUSAKAWI EPS",
  "EMSSANAR",
  "CONVIDA EPS",
  "MUTUALSER"
];

const OPCIONES_AFP = [
  "COLFONDOS",
  "COLPENSIONES",
  "PORVENIR",
  "PROTECCION",
  "HORIZONTE"
];

const OPCIONES_SERVICIO_FUNERARIO = [
  "ACTIVO INDIVIDUAL",
  "COORSERPARK",
  "ENVIADA",
  "PENDIENTE"
];

const TALLAS_CAMISA = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
const TALLAS_PANTALON = ["28", "30", "32", "34", "36", "38", "40", "42", "44", "46", "48"];
const TALLAS_ZAPATOS = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];

const TIPOS_DOCUMENTO = [
  "Contrato",
  "Hoja de Vida",
  "Cédula",
  "Certificados Académicos",
  "EPS",
  "AFP",
  "Exámenes Médicos",
  "Certificados Laborales",
  "Fotocopia Cédula",
  "Fotocopia Libreta Militar",
  "Certificado de Estudios",
  "Certificado de Antecedentes",
  "Certificado EPS",
  "Certificado AFP",
  "Otros"
];

export default function EmpleadosTalentoHumano() {
  const navigate = useNavigate();
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [empleadoDetalle, setEmpleadoDetalle] = useState(null);
  const [modoDetalle, setModoDetalle] = useState("ver"); // "ver" o "editar"
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedEstado, setSelectedEstado] = useState("todos");
  const [sortField, setSortField] = useState("apellidos");
  const [sortDirection, setSortDirection] = useState("asc");
  
  // Ref para búsqueda
  const searchInputRef = useRef(null);

  // Debounce para búsqueda
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  // Cargar empleados
  useEffect(() => {
    fetchEmpleados();
  }, [debouncedSearchTerm, selectedEstado, sortField, sortDirection]);

  async function fetchEmpleados() {
    setLoading(true);
    try {
      let data = await getEmpleadosTalentoHumano();
      
      // Aplicar filtro de búsqueda
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        data = data.filter(e =>
          e.nombres.toLowerCase().includes(searchLower) ||
          e.apellidos.toLowerCase().includes(searchLower) ||
          e.documento_identidad.includes(searchLower) ||
          e.cargo?.toLowerCase().includes(searchLower)
        );
      }

      // Aplicar filtro de estado
      if (selectedEstado !== "todos") {
        const activoFilter = selectedEstado === "activo";
        data = data.filter(e => e.activo === activoFilter);
      }

      // Aplicar ordenamiento
      data.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (sortField === "apellidos") {
          aVal = a.apellidos.toLowerCase();
          bVal = b.apellidos.toLowerCase();
        } else if (sortField === "salario") {
          aVal = a.empleados_talento_humano?.salario || 0;
          bVal = b.empleados_talento_humano?.salario || 0;
        }

        if (sortDirection === "asc") {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      setEmpleados(data);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Error cargando empleados");
      notify.error("Error cargando empleados");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerDetalle(empleadoId) {
    try {
      const empleado = await getEmpleadoCompleto(empleadoId);
      setEmpleadoDetalle(empleado);
      setModoDetalle("ver");
      notify.success("Detalles del empleado cargados");
    } catch (e) {
      console.error(e);
      notify.error("Error cargando detalle");
    }
  }

  async function handleEditarDetalle(empleadoId) {
    try {
      const empleado = await getEmpleadoCompleto(empleadoId);
      setEmpleadoDetalle(empleado);
      setModoDetalle("editar");
      notify.success("Detalles del empleado cargados para edición");
    } catch (e) {
      console.error(e);
      notify.error("Error cargando detalle para edición");
    }
  }

  async function handleToggleEstado(id, activoActual) {
    const nuevoEstado = !activoActual;
    
    if (!window.confirm(`¿Está seguro de ${nuevoEstado ? 'activar' : 'desactivar'} este empleado?`)) {
      return;
    }

    try {
      const result = await toggleEmpleadoEstado(id, nuevoEstado);
      if (result.error) throw result.error;
      
      // Actualizar estado local
      setEmpleados(prev => prev.map(e =>
        e.id === id ? { ...e, activo: nuevoEstado } : e
      ));
      
      notify.success(`Empleado ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`);
    } catch (error) {
      console.error(error);
      notify.error("Error cambiando estado del empleado");
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (error && empleados.length === 0) {
    return (
      <div className="page-container">
        <div className="card p-12 text-center">
          <div className="alert-error inline-flex items-center justify-center w-20 h-20 rounded-full mb-6">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-semibold mb-2">Error al cargar empleados</h3>
          <p className="text-secondary mb-6">{error}</p>
          <button onClick={fetchEmpleados} className="btn btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="section-header">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <h1 className="section-title">Talento Humano</h1>
              <p className="section-subtitle">
                Gestión integral de empleados y contratación
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={16} />
                Nuevo Empleado
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatsCard
            title="Total Empleados"
            value={empleados.length}
            icon={<User className="w-5 h-5 text-primary" />}
          />
          <StatsCard
            title="Activos"
            value={empleados.filter(e => e.activo).length}
            icon={<CheckCircle className="w-5 h-5 text-success" />}
          />
          <StatsCard
            title="Inactivos"
            value={empleados.filter(e => !e.activo).length}
            icon={<XCircle className="w-5 h-5 text-error" />}
          />
          <StatsCard
            title="Con Contrato"
            value={empleados.filter(e => e.empleados_talento_humano?.tipo_contrato).length}
            icon={<FileText className="w-5 h-5 text-warning" />}
          />
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
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por nombre, apellido o documento..."
                className="form-input pl-10 pr-10 !py-2.5"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setDebouncedSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-primary"
                  type="button"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Filtro por estado */}
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
                size={20}
              />
              <select
                className="form-input pl-10 !py-2.5 appearance-none"
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>

            {/* Botón actualizar */}
            <div className="flex items-center justify-center md:justify-end">
              <button
                onClick={fetchEmpleados}
                className="btn btn-outline flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de Empleados */}
        <div className="card overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">#</th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("apellidos")}
                  >
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Nombre Completo {getSortIcon("apellidos")}
                    </div>
                  </th>
                  <th className="table-header-cell">Documento</th>
                  <th className="table-header-cell">Cargo</th>
                  <th className="table-header-cell">Tipo Contrato</th>
                  <th
                    className="table-header-cell cursor-pointer hover:bg-app"
                    onClick={() => handleSort("salario")}
                  >
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      Salario {getSortIcon("salario")}
                    </div>
                  </th>
                  <th className="table-header-cell">Estado</th>
                  <th className="table-header-cell">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="spinner spinner-lg mx-auto mb-3"></div>
                      <p className="text-muted">Cargando empleados...</p>
                    </td>
                  </tr>
                ) : empleados.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="text-muted">
                        <User size={48} className="mx-auto mb-4 text-border" />
                        <p className="text-lg font-medium mb-2 text-primary">
                          No se encontraron empleados
                        </p>
                        <p className="text-muted">
                          {debouncedSearchTerm || selectedEstado !== "todos"
                            ? "Prueba con otros filtros"
                            : "No hay empleados registrados"}
                        </p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="btn btn-primary mt-4"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Crear Primer Empleado
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  empleados.map((e, index) => (
                    <tr key={e.id} className="table-row hover:bg-app/50">
                      <td className="table-cell">
                        <div className="text-sm text-secondary">{index + 1}</div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-base flex items-center justify-center">
                            <User size={20} className="text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {e.nombres} {e.apellidos}
                            </p>
                            <p className="text-xs text-secondary">{e.correo || "Sin correo"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-mono">{e.documento_identidad}</span>
                      </td>
                      <td className="table-cell">
                        <span className="badge badge-outline">{e.cargo || "Sin cargo"}</span>
                      </td>
                      <td className="table-cell">
                        {e.empleados_talento_humano?.tipo_contrato || (
                          <span className="text-secondary">-</span>
                        )}
                      </td>
                      <td className="table-cell">
                        {e.empleados_talento_humano?.salario ? (
                          <span className="font-medium">
                            ${parseFloat(e.empleados_talento_humano.salario).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-secondary">-</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleToggleEstado(e.id, e.activo)}
                          className={`badge cursor-pointer ${e.activo ? "badge-success" : "badge-error"}`}
                        >
                          {e.activo ? "Activo" : "Inactivo"}
                        </button>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVerDetalle(e.id)}
                            className="btn btn-outline btn-icon"
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEditarDetalle(e.id)}
                            className="btn btn-outline btn-icon"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleEstado(e.id, e.activo)}
                            className="btn btn-outline btn-icon"
                            title={e.activo ? "Desactivar" : "Activar"}
                          >
                            {e.activo ? (
                              <XCircle size={16} className="text-error" />
                            ) : (
                              <CheckCircle size={16} className="text-success" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Detalle */}
      {empleadoDetalle && (
        <EmpleadoDetalleTH
          empleado={empleadoDetalle}
          modo={modoDetalle}
          onClose={() => {
            setEmpleadoDetalle(null);
            setModoDetalle("ver");
          }}
          onRefresh={fetchEmpleados}
          onCambiarModo={(nuevoModo) => setModoDetalle(nuevoModo)}
        />
      )}

      {/* Modal de Creación */}
      {showCreateModal && (
        <CrearEmpleadoModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchEmpleados();
          }}
        />
      )}
    </div>
  );
}

// Componente de Estadísticas
function StatsCard({ title, value, icon }) {
  return (
    <div className="card-hover p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-secondary mb-1">{title}</p>
          <p className="text-2xl font-bold text-primary">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-base flex items-center justify-center bg-surface">
          {icon}
        </div>
      </div>
    </div>
  );
}

// Modal de Detalle Mejorado
function EmpleadoDetalleTH({ empleado, modo = "ver", onClose, onRefresh, onCambiarModo }) {
  const [activeTab, setActiveTab] = useState("general");
  const [empleadoData, setEmpleadoData] = useState({});
  const [talentoHumanoData, setTalentoHumanoData] = useState({});
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    file: null,
    tipo_documento: "",
    area: "TH"
  });

  const esModoEdicion = modo === "editar";

  // Cargar documentos al abrir
  useEffect(() => {
    if (empleado?.id) {
      loadDocumentos();
    }
  }, [empleado]);

  useEffect(() => {
    if (empleado) {
      setEmpleadoData({
        nombres: empleado.nombres || "",
        apellidos: empleado.apellidos || "",
        correo: empleado.correo || "",
        telefono: empleado.telefono || "",
        direccion: empleado.direccion || "",
        cargo: empleado.cargo || "",
        tipo_vinculacion: empleado.tipo_vinculacion || "",
        tipo_empleado: empleado.tipo_empleado || "",
        fecha_ingreso: empleado.fecha_ingreso || "",
        activo: empleado.activo || true,
        codigo_unidad: empleado.codigo_unidad || ""
      });

      if (empleado.empleados_talento_humano) {
        setTalentoHumanoData(empleado.empleados_talento_humano);
      }
    }
  }, [empleado]);

  async function loadDocumentos() {
    try {
      const docs = await getEmpleadoDocumentos(empleado.id);
      setDocumentos(docs || []);
    } catch (error) {
      console.error("Error cargando documentos:", error);
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      await updateEmpleado(empleado.id, empleadoData);
      await updateTalentoHumano(empleado.id, talentoHumanoData);
      notify.success("Cambios guardados exitosamente");
      onRefresh?.();
      onCambiarModo?.("ver");
    } catch (error) {
      console.error("Error guardando cambios:", error);
      notify.error("Error al guardar cambios");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload() {
    if (!newDocument.file || !newDocument.tipo_documento) {
      notify.error("Seleccione un archivo y tipo de documento");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadEmpleadoDocumento(
        empleado.id,
        newDocument.file,
        newDocument.tipo_documento,
        newDocument.area
      );

      if (result.error) throw result.error;

      setShowUploadModal(false);
      setNewDocument({ file: null, tipo_documento: "", area: "TH" });
      loadDocumentos();
      notify.success("Documento subido exitosamente");
    } catch (error) {
      console.error("Error subiendo documento:", error);
      notify.error("Error al subir el documento");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocumento(docId, archivoPath) {
    if (!window.confirm("¿Está seguro de eliminar este documento?")) return;

    try {
      const result = await deleteEmpleadoDocumento(docId, archivoPath);
      if (result.error) throw result.error;
      loadDocumentos();
      notify.success("Documento eliminado exitosamente");
    } catch (error) {
      console.error("Error eliminando documento:", error);
      notify.error("Error al eliminar el documento");
    }
  }

  const handleInputChange = (setter) => (e) => {
    const { name, value, type, checked } = e.target;
    setter(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const formatCurrency = (value) => {
    if (!value) return "";
    return `$${parseFloat(value).toLocaleString('es-CO')}`;
  };

  // Función para extraer el nombre del archivo (maneja array o string)
  const getNombreArchivo = (doc) => {
    if (Array.isArray(doc.nombre_archivo)) {
      return doc.nombre_archivo[0] || 'Sin nombre';
    }
    return doc.nombre_archivo || 'Sin nombre';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-card shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="card-header">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">
                {empleado.nombres} {empleado.apellidos}
              </h2>
              <p className="text-secondary">
                Documento: {empleado.documento_identidad} • 
                Cargo: {empleado.cargo} • 
                Estado: 
                <span className={`badge ml-2 ${empleado.activo ? "badge-success" : "badge-error"}`}>
                  {empleado.activo ? "Activo" : "Inactivo"}
                </span>
                {esModoEdicion && <span className="ml-2 badge badge-warning">Modo Edición</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!esModoEdicion ? (
                <button
                  onClick={() => onCambiarModo?.("editar")}
                  className="btn btn-outline flex items-center gap-2"
                >
                  <Edit size={16} />
                  Editar
                </button>
              ) : null}
              <button onClick={onClose} className="btn btn-icon btn-outline">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-base">
          <div className="flex px-6">
            <button
              className={`px-4 py-3 font-medium ${activeTab === "general" ? "text-primary border-b-2 border-primary" : "text-secondary"}`}
              onClick={() => setActiveTab("general")}
            >
              <User className="inline-block w-4 h-4 mr-2" />
              Información General
            </button>
            <button
              className={`px-4 py-3 font-medium ${activeTab === "documentos" ? "text-primary border-b-2 border-primary" : "text-secondary"}`}
              onClick={() => setActiveTab("documentos")}
            >
              <FileText className="inline-block w-4 h-4 mr-2" />
              Documentos ({documentos.length})
            </button>
            <button
              className={`px-4 py-3 font-medium ${activeTab === "sst" ? "text-primary border-b-2 border-primary" : "text-secondary"}`}
              onClick={() => setActiveTab("sst")}
            >
              <Shield className="inline-block w-4 h-4 mr-2" />
              SST
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "general" ? (
            <div className="space-y-6">
              {/* Datos Personales */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Datos Personales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Nombres *</label>
                    <input
                      name="nombres"
                      value={empleadoData.nombres}
                      onChange={handleInputChange(setEmpleadoData)}
                      className="form-input"
                      required
                      disabled={!esModoEdicion}
                    />
                  </div>
                  <div>
                    <label className="form-label">Apellidos *</label>
                    <input
                      name="apellidos"
                      value={empleadoData.apellidos}
                      onChange={handleInputChange(setEmpleadoData)}
                      className="form-input"
                      required
                      disabled={!esModoEdicion}
                    />
                  </div>
                  <div>
                    <label className="form-label">Documento</label>
                    <input
                      value={empleado.documento_identidad}
                      className="form-input bg-muted"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="form-label">Correo Electrónico</label>
                    <input
                      type="email"
                      name="correo"
                      value={empleadoData.correo}
                      onChange={handleInputChange(setEmpleadoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    />
                  </div>
                  <div>
                    <label className="form-label">Teléfono</label>
                    <input
                      name="telefono"
                      value={empleadoData.telefono}
                      onChange={handleInputChange(setEmpleadoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    />
                  </div>
                  <div>
                    <label className="form-label">Dirección</label>
                    <input
                      name="direccion"
                      value={empleadoData.direccion}
                      onChange={handleInputChange(setEmpleadoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    />
                  </div>
                </div>
              </section>

              {/* Datos Laborales */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Datos Laborales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Cargo</label>
                    <input
                      name="cargo"
                      value={empleadoData.cargo}
                      onChange={handleInputChange(setEmpleadoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    />
                  </div>
                  <div>
                    <label className="form-label">Tipo Empleado</label>
                    <select
                      name="tipo_empleado"
                      value={empleadoData.tipo_empleado}
                      onChange={handleInputChange(setEmpleadoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Administración">Administración</option>
                      <option value="Producción">Producción</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Tipo Vinculación</label>
                    <select
                      name="tipo_vinculacion"
                      value={empleadoData.tipo_vinculacion}
                      onChange={handleInputChange(setEmpleadoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="indefinido">Empleado</option>
                      <option value="fijo">Aprendiz</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Fecha Ingreso</label>
                    <input
                      type="date"
                      name="fecha_ingreso"
                      value={empleadoData.fecha_ingreso}
                      onChange={handleInputChange(setEmpleadoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    />
                  </div>
                  <div>
                    <label className="form-label">Estado</label>
                    <div className="flex items-center gap-2 p-2">
                      <input
                        type="checkbox"
                        name="activo"
                        checked={empleadoData.activo}
                        onChange={handleInputChange(setEmpleadoData)}
                        className="checkbox"
                        id="estadoActivo"
                        disabled={!esModoEdicion}
                      />
                      <label htmlFor="estadoActivo" className="cursor-pointer">
                        Empleado Activo
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              {/* Datos de Talento Humano */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Talento Humano
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Tipo Contrato</label>
                    <select
                      name="tipo_contrato"
                      value={talentoHumanoData.tipo_contrato}
                      onChange={handleInputChange(setTalentoHumanoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Contratistas">Contratistas</option>
                      <option value="Contrato aprendizaje">Contrato aprendizaje</option>
                      <option value="Fijo">Fijo</option>
                      <option value="Indefinido">Indefinido</option>
                      <option value="Obra o Labor">Obra o Labor</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Salario</label>
                    <input
                      type="number"
                      name="salario"
                      value={talentoHumanoData.salario}
                      onChange={handleInputChange(setTalentoHumanoData)}
                      className="form-input"
                      min="0"
                      step="0.01"
                      disabled={!esModoEdicion}
                    />
                  </div>
                  <div>
                    <label className="form-label">Fecha Nacimiento</label>
                    <input
                      type="date"
                      name="fecha_nacimiento"
                      value={talentoHumanoData.fecha_nacimiento}
                      onChange={handleInputChange(setTalentoHumanoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    />
                  </div>
                  <div>
                    <label className="form-label">EPS</label>
                    <select
                      name="eps"
                      value={talentoHumanoData.eps}
                      onChange={handleInputChange(setTalentoHumanoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    >
                      <option value="">Seleccionar EPS...</option>
                      {OPCIONES_EPS.map((eps) => (
                        <option key={eps} value={eps}>{eps}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">AFP</label>
                    <select
                      name="afp"
                      value={talentoHumanoData.afp}
                      onChange={handleInputChange(setTalentoHumanoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    >
                      <option value="">Seleccionar AFP...</option>
                      {OPCIONES_AFP.map((afp) => (
                        <option key={afp} value={afp}>{afp}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Servicio Funerario</label>
                    <select
                      name="entidad_fa"
                      value={talentoHumanoData.entidad_fa}
                      onChange={handleInputChange(setTalentoHumanoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    >
                      <option value="">Seleccionar...</option>
                      {OPCIONES_SERVICIO_FUNERARIO.map((opcion) => (
                        <option key={opcion} value={opcion}>{opcion}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tallas y Observaciones */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="form-label">Talla Camisa</label>
                    <select
                      name="talla_camisa"
                      value={talentoHumanoData.talla_camisa}
                      onChange={handleInputChange(setTalentoHumanoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    >
                      <option value="">Seleccionar talla...</option>
                      {TALLAS_CAMISA.map((talla) => (
                        <option key={talla} value={talla}>{talla}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Talla Pantalón</label>
                    <select
                      name="talla_pantalon"
                      value={talentoHumanoData.talla_pantalon}
                      onChange={handleInputChange(setTalentoHumanoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    >
                      <option value="">Seleccionar talla...</option>
                      {TALLAS_PANTALON.map((talla) => (
                        <option key={talla} value={talla}>{talla}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Talla Zapatos</label>
                    <select
                      name="talla_zapatos"
                      value={talentoHumanoData.talla_zapatos}
                      onChange={handleInputChange(setTalentoHumanoData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    >
                      <option value="">Seleccionar talla...</option>
                      {TALLAS_ZAPATOS.map((talla) => (
                        <option key={talla} value={talla}>{talla}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sección de Prórrogas */}
                <section className="mt-6">
                  <h4 className="font-semibold mb-3">Prórrogas de Contrato</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((num) => {
                      const isEnabled = num === 1 || talentoHumanoData[`prorroga_${num - 1}`];
                      const isDisabled = !esModoEdicion || !isEnabled;
                      
                      return (
                        <div key={`prorroga-${num}`}>
                          <label className="form-label">Prórroga {num}</label>
                          <input
                            type="date"
                            name={`prorroga_${num}`}
                            value={talentoHumanoData[`prorroga_${num}`] || ''}
                            onChange={handleInputChange(setTalentoHumanoData)}
                            className={`form-input ${isDisabled ? 'bg-muted text-secondary' : ''}`}
                            disabled={isDisabled}
                          />
                          {isDisabled && num > 1 && !talentoHumanoData[`prorroga_${num - 1}`] && (
                            <p className="text-xs text-secondary mt-1">
                              Requiere fecha en prórroga {num - 1}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <div className="mt-4">
                  <label className="form-label">Observaciones</label>
                  <textarea
                    name="observaciones"
                    value={talentoHumanoData.observaciones}
                    onChange={handleInputChange(setTalentoHumanoData)}
                    className="form-input"
                    rows={3}
                    disabled={!esModoEdicion}
                  />
                </div>
              </section>
            </div>
          ) : activeTab === "documentos" ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Documentos del Empleado</h3>
                {esModoEdicion && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Subir Documento
                  </button>
                )}
              </div>

              {documentos.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-light rounded-base">
                  <FileText className="w-12 h-12 text-border mx-auto mb-4" />
                  <p className="text-muted">No hay documentos cargados</p>
                  {esModoEdicion && (
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="btn btn-outline mt-4"
                    >
                      Subir Primer Documento
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documentos.map((doc) => (
                    <div key={doc.id} className="card-hover p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-base flex items-center justify-center">
                            <File className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.tipo_documento}</p>
                            <p className="text-xs text-secondary">{doc.area}</p>
                            {/* Mostrar nombre del archivo usando la función helper */}
                            <p className="text-xs text-muted">
                              {getNombreArchivo(doc)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <a
                            href={doc.archivo_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-icon btn-outline"
                            title="Ver"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <a
                            href={doc.archivo_path}
                            download
                            className="btn btn-icon btn-outline"
                            title="Descargar"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          {esModoEdicion && (
                            <button
                              onClick={() => handleDeleteDocumento(doc.id, doc.archivo_path)}
                              className="btn btn-icon btn-outline"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted truncate">
                        Subido: {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Información de Seguridad y Salud en el Trabajo
              </h3>
              
              {empleado.empleados_sst ? (
                <div className="space-y-6">
                  {/* Exámenes Médicos */}
                  <section>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Syringe className="w-4 h-4" />
                      Exámenes Médicos
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-secondary">Exámenes Realizados</p>
                        <p className="font-medium">
                          {empleado.empleados_sst.examenes_medicos ? (
                            <span className="badge badge-success">Sí</span>
                          ) : (
                            <span className="badge badge-error">No</span>
                          )}
                        </p>
                      </div>
                      {empleado.empleados_sst.fecha_examen && (
                        <div>
                          <p className="text-sm text-secondary">Fecha Examen</p>
                          <p className="font-medium">
                            {new Date(empleado.empleados_sst.fecha_examen).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {empleado.empleados_sst.estado_examen && (
                        <div>
                          <p className="text-sm text-secondary">Estado Examen</p>
                          <p className="font-medium">{empleado.empleados_sst.estado_examen}</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Capacitaciones */}
                  <section>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Capacitaciones
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-secondary">Curso Manipulación</p>
                        <p className="font-medium">
                          {empleado.empleados_sst.curso_manipulacion ? (
                            <span className="badge badge-success">Sí</span>
                          ) : (
                            <span className="badge badge-error">No</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary">Inducción</p>
                        <p className="font-medium">
                          {empleado.empleados_sst.induccion ? (
                            <span className="badge badge-success">Sí</span>
                          ) : (
                            <span className="badge badge-error">No</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary">Reinducción</p>
                        <p className="font-medium">
                          {empleado.empleados_sst.reinduccion ? (
                            <span className="badge badge-success">Sí</span>
                          ) : (
                            <span className="badge badge-error">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Vacunas */}
                  <section>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Syringe className="w-4 h-4" />
                      Vacunas
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-secondary">COVID-19</p>
                        <p className="font-medium">
                          {empleado.empleados_sst.covid ? (
                            <span className="badge badge-success">Sí</span>
                          ) : (
                            <span className="badge badge-error">No</span>
                          )}
                        </p>
                      </div>
                      {empleado.empleados_sst.covid_dosis && (
                        <div>
                          <p className="text-sm text-secondary">Dosis COVID</p>
                          <p className="font-medium">{empleado.empleados_sst.covid_dosis}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-secondary">Hepatitis A</p>
                        <p className="font-medium">
                          {empleado.empleados_sst.hepatitis_a ? (
                            <span className="badge badge-success">Sí</span>
                          ) : (
                            <span className="badge badge-error">No</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-secondary">Tétano</p>
                        <p className="font-medium">
                          {empleado.empleados_sst.tetano ? (
                            <span className="badge badge-success">Sí</span>
                          ) : (
                            <span className="badge badge-error">No</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Seguridad Social */}
                  <section>
                    <h4 className="font-semibold mb-3">Seguridad Social</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {empleado.empleados_sst.arl && (
                        <div>
                          <p className="text-sm text-secondary">ARL</p>
                          <p className="font-medium">{empleado.empleados_sst.arl}</p>
                        </div>
                      )}
                      {empleado.empleados_sst.caja_compensacion && (
                        <div>
                          <p className="text-sm text-secondary">Caja Compensación</p>
                          <p className="font-medium">{empleado.empleados_sst.caja_compensacion}</p>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Observaciones */}
                  {empleado.empleados_sst.observaciones && (
                    <section>
                      <h4 className="font-semibold mb-3">Observaciones SST</h4>
                      <div className="p-4 bg-surface rounded-base border border-light">
                        <p className="text-sm">{empleado.empleados_sst.observaciones}</p>
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-light rounded-base">
                  <Shield className="w-12 h-12 text-border mx-auto mb-4" />
                  <p className="text-muted">No hay información de SST registrada</p>
                  <p className="text-sm text-secondary mt-2">
                    Esta información debe ser gestionada desde la vista específica de SST
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer flex justify-between items-center">
          <div className="text-sm text-secondary">
            Última actualización: {empleado.updated_at ?
              new Date(empleado.updated_at).toLocaleDateString() : 'Nunca'}
          </div>
          <div className="flex gap-3">
            {esModoEdicion ? (
              <>
                <button 
                  onClick={() => onCambiarModo?.("ver")}
                  className="btn btn-outline"
                >
                  Cancelar Edición
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar cambios
                </button>
              </>
            ) : (
              <button onClick={onClose} className="btn btn-outline">
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal para subir documento */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-surface rounded-card shadow-xl max-w-md w-full">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Subir Documento</h3>
              <button onClick={() => setShowUploadModal(false)} className="btn btn-icon btn-outline">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Tipo de Documento *</label>
                <select
                  value={newDocument.tipo_documento}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, tipo_documento: e.target.value }))}
                  className="form-input"
                  required
                >
                  <option value="">Seleccionar tipo...</option>
                  {TIPOS_DOCUMENTO.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Área *</label>
                <select
                  value={newDocument.area}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, area: e.target.value }))}
                  className="form-input"
                  required
                >
                  <option value="TH">Talento Humano</option>
                  <option value="SST">Salud y Seguridad</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="form-label">Archivo *</label>
                <div className="border-2 border-dashed border-light rounded-base p-6 text-center">
                  <input
                    type="file"
                    onChange={(e) => setNewDocument(prev => ({ ...prev, file: e.target.files[0] }))}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <Upload className="w-12 h-12 text-border mx-auto mb-2" />
                    <p className="text-sm text-muted">
                      {newDocument.file ? newDocument.file.name : 'Haz clic para seleccionar archivo'}
                    </p>
                    <p className="text-xs text-secondary mt-1">PDF, DOC, DOCX, JPG, PNG (Max. 10MB)</p>
                  </label>
                </div>
              </div>
            </div>
            <div className="card-footer flex justify-end gap-3">
              <button onClick={() => setShowUploadModal(false)} className="btn btn-outline">
                Cancelar
              </button>
              <button
                onClick={handleFileUpload}
                disabled={uploading || !newDocument.file || !newDocument.tipo_documento}
                className="btn btn-primary flex items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Subir Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal de Creación de Empleado (mejorado)
function CrearEmpleadoModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    documento_identidad: "",
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
    cargo: "",
    tipo_vinculacion: "",
    tipo_empleado: "",
    fecha_ingreso: "",
    codigo_unidad: ""
  });

  const [talentoHumanoData, setTalentoHumanoData] = useState({
    tipo_contrato: "",
    salario: "",
    fecha_nacimiento: null,
    eps: "",
    afp: "",
    entidad_fa: "",
    talla_camisa: "",
    talla_pantalon: "",
    talla_zapatos: "",
    observaciones: "",
    prorroga_1: null,
    prorroga_2: null,
    prorroga_3: null,
    prorroga_4: null
  });

  const handleChange = (setter) => (e) => {
    const { name, value } = e.target;
    // Para campos de fecha, mantener null si está vacío
    if (name.includes('fecha') || name.includes('prorroga')) {
      setter(prev => ({ ...prev, [name]: value || null }));
    } else {
      setter(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validaciones básicas
    const errores = [];
    
    if (!formData.documento_identidad) errores.push('Documento de identidad');
    if (!formData.nombres) errores.push('Nombres');
    if (!formData.apellidos) errores.push('Apellidos');
    if (!formData.codigo_unidad) errores.push('Código de unidad');
    if (!formData.fecha_ingreso) errores.push('Fecha de ingreso');
    
    if (errores.length > 0) {
      notify.error(`Campos obligatorios faltantes: ${errores.join(', ')}`);
      setLoading(false);
      return;
    }

    // Validar formato de documento (solo números)
    if (!/^\d+$/.test(formData.documento_identidad)) {
      notify.error('El documento debe contener solo números');
      setLoading(false);
      return;
    }

    // Validar email si está presente
    if (formData.correo && !/^\S+@\S+\.\S+$/.test(formData.correo)) {
      notify.error('Formato de correo electrónico inválido');
      setLoading(false);
      return;
    }

    // Validar que las prórrogas sean secuenciales
    for (let i = 2; i <= 4; i++) {
      if (talentoHumanoData[`prorroga_${i}`] && !talentoHumanoData[`prorroga_${i-1}`]) {
        notify.error(`La prórroga ${i} requiere que la prórroga ${i-1} tenga fecha`);
        setLoading(false);
        return;
      }
    }

    try {
      // Limpiar datos de talento humano - convertir campos vacíos a null
      const cleanedTalentoHumanoData = { ...talentoHumanoData };
      
      // Convertir cadenas vacías a null para campos de fecha (ya deberían ser null, pero por si acaso)
      const fechaFields = ['fecha_nacimiento', 'prorroga_1', 'prorroga_2', 'prorroga_3', 'prorroga_4'];
      fechaFields.forEach(field => {
        if (cleanedTalentoHumanoData[field] === '') {
          cleanedTalentoHumanoData[field] = null;
        }
      });
      
      // Convertir campos numéricos vacíos a null
      if (cleanedTalentoHumanoData.salario === '') {
        cleanedTalentoHumanoData.salario = null;
      }
      
      // Limpiar datos del empleado
      const cleanedEmpleadoData = { ...formData };
      if (cleanedEmpleadoData.telefono === '') {
        cleanedEmpleadoData.telefono = null;
      }
      if (cleanedEmpleadoData.correo === '') {
        cleanedEmpleadoData.correo = null;
      }
      if (cleanedEmpleadoData.direccion === '') {
        cleanedEmpleadoData.direccion = null;
      }
      if (cleanedEmpleadoData.cargo === '') {
        cleanedEmpleadoData.cargo = null;
      }
      if (cleanedEmpleadoData.tipo_empleado === '') {
        cleanedEmpleadoData.tipo_empleado = null;
      }
      if (cleanedEmpleadoData.tipo_vinculacion === '') {
        cleanedEmpleadoData.tipo_vinculacion = null;
      }

      // Crear empleado completo con datos limpios
      const result = await createEmpleadoCompleto(cleanedEmpleadoData, cleanedTalentoHumanoData, null);
      
      if (result.error) {
        console.error("Error detallado:", result.error);
        throw result.error;
      }
      
      notify.success("Empleado creado exitosamente");
      onSuccess();
      setLoading(false);
    } catch (error) {
      console.error("Error al crear el empleado:", error);
      notify.error(`Error al crear el empleado: ${error.message || 'Error desconocido'}`);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-card shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Crear Nuevo Empleado</h2>
            <button onClick={onClose} className="btn btn-icon btn-outline">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <h3 className="font-semibold mb-3">Datos Básicos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Documento de Identidad *</label>
                <input
                  type="text"
                  name="documento_identidad"
                  value={formData.documento_identidad}
                  onChange={handleChange(setFormData)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Código Unidad *</label>
                <input
                  type="text"
                  name="codigo_unidad"
                  value={formData.codigo_unidad}
                  onChange={handleChange(setFormData)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Nombres *</label>
                <input
                  type="text"
                  name="nombres"
                  value={formData.nombres}
                  onChange={handleChange(setFormData)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Apellidos *</label>
                <input
                  type="text"
                  name="apellidos"
                  value={formData.apellidos}
                  onChange={handleChange(setFormData)}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="form-label">Correo Electrónico</label>
                <input
                  type="email"
                  name="correo"
                  value={formData.correo}
                  onChange={handleChange(setFormData)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange(setFormData)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Cargo</label>
                <input
                  type="text"
                  name="cargo"
                  value={formData.cargo}
                  onChange={handleChange(setFormData)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Tipo Empleado</label>
                <select
                  name="tipo_empleado"
                  value={formData.tipo_empleado}
                  onChange={handleChange(setFormData)}
                  className="form-input"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Producción">Producción</option>
                  <option value="Administración">Administración</option>
                </select>
              </div>
              <div>
                <label className="form-label">Fecha de Ingreso *</label>
                <input
                  type="date"
                  name="fecha_ingreso"
                  value={formData.fecha_ingreso}
                  onChange={handleChange(setFormData)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <h3 className="font-semibold mb-3 mt-6">Datos de Talento Humano</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Tipo Contrato</label>
                <select
                  name="tipo_contrato"
                  value={talentoHumanoData.tipo_contrato}
                  onChange={handleChange(setTalentoHumanoData)}
                  className="form-input"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Contratistas">Contratistas</option>
                  <option value="Contrato aprendizaje">Contrato aprendizaje</option>
                  <option value="Fijo">Fijo</option>
                  <option value="Indefinido">Indefinido</option>
                  <option value="Obra o Labor">Obra o Labor</option>
                </select>
              </div>
              <div>
                <label className="form-label">Salario</label>
                <input
                  type="number"
                  name="salario"
                  value={talentoHumanoData.salario}
                  onChange={handleChange(setTalentoHumanoData)}
                  className="form-input"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="form-label">Fecha Nacimiento</label>
                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={talentoHumanoData.fecha_nacimiento || ''}
                  onChange={handleChange(setTalentoHumanoData)}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">EPS</label>
                <select
                  name="eps"
                  value={talentoHumanoData.eps}
                  onChange={handleChange(setTalentoHumanoData)}
                  className="form-input"
                >
                  <option value="">Seleccionar EPS...</option>
                  {OPCIONES_EPS.map((eps) => (
                    <option key={eps} value={eps}>{eps}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">AFP</label>
                <select
                  name="afp"
                  value={talentoHumanoData.afp}
                  onChange={handleChange(setTalentoHumanoData)}
                  className="form-input"
                >
                  <option value="">Seleccionar AFP...</option>
                  {OPCIONES_AFP.map((afp) => (
                    <option key={afp} value={afp}>{afp}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Servicio Funerario</label>
                <select
                  name="entidad_fa"
                  value={talentoHumanoData.entidad_fa}
                  onChange={handleChange(setTalentoHumanoData)}
                  className="form-input"
                >
                  <option value="">Seleccionar...</option>
                  {OPCIONES_SERVICIO_FUNERARIO.map((opcion) => (
                    <option key={opcion} value={opcion}>{opcion}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Talla Camisa</label>
                <select
                  name="talla_camisa"
                  value={talentoHumanoData.talla_camisa}
                  onChange={handleChange(setTalentoHumanoData)}
                  className="form-input"
                >
                  <option value="">Seleccionar talla...</option>
                  {TALLAS_CAMISA.map((talla) => (
                    <option key={talla} value={talla}>{talla}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Talla Pantalón</label>
                <select
                  name="talla_pantalon"
                  value={talentoHumanoData.talla_pantalon}
                  onChange={handleChange(setTalentoHumanoData)}
                  className="form-input"
                >
                  <option value="">Seleccionar talla...</option>
                  {TALLAS_PANTALON.map((talla) => (
                    <option key={talla} value={talla}>{talla}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Talla Zapatos</label>
                <select
                  name="talla_zapatos"
                  value={talentoHumanoData.talla_zapatos}
                  onChange={handleChange(setTalentoHumanoData)}
                  className="form-input"
                >
                  <option value="">Seleccionar talla...</option>
                  {TALLAS_ZAPATOS.map((talla) => (
                    <option key={talla} value={talla}>{talla}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Observaciones</label>
                <textarea
                  name="observaciones"
                  value={talentoHumanoData.observaciones}
                  onChange={handleChange(setTalentoHumanoData)}
                  className="form-input"
                  rows={3}
                />
              </div>
            </div>

            {/* Prórrogas en modal de creación */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-3">Prórrogas de Contrato</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((num) => (
                  <div key={`prorroga-${num}`}>
                    <label className="form-label">Prórroga {num}</label>
                    <input
                      type="date"
                      name={`prorroga_${num}`}
                      value={talentoHumanoData[`prorroga_${num}`] || ''}
                      onChange={handleChange(setTalentoHumanoData)}
                      className="form-input"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </form>

        <div className="card-footer flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-outline">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Crear Empleado
          </button>
        </div>
      </div>
    </div>
  );
}