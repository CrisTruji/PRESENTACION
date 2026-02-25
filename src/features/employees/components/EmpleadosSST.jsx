// src/screens/empleados/EmpleadosSST.jsx
import { useEffect, useState, useRef } from "react";
import { 
  getEmpleadosSST, 
  getEmpleadoCompleto,
  updateSST,
  uploadEmpleadoDocumento,
  getEmpleadoDocumentos,
  deleteEmpleadoDocumento,
  toggleEmpleadoEstado
} from "@/features/employees";
import notify from "@/shared/lib/notifier";
import {
  Search,
  Filter,
  Eye,
  Edit,
  User,
  Briefcase,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Calendar,
  Shield,
  Syringe,
  BookOpen,
  X,
  Save,
  Loader2,
  ChevronUp,
  ChevronDown,
  Plus,
  FileText,
  Upload,
  Download,
  File,
  Trash2,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Clock,
  Thermometer
} from "lucide-react";

const Toggle = ({ checked, onChange, disabled, id, label }) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={`
        relative inline-flex flex-shrink-0 h-5 w-9 border-2 border-transparent rounded-full 
        transition-colors duration-200 ease-in-out focus:outline-none 
        focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)]
        ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        '--tw-ring-color': 'var(--color-primary)' 
      }}
    >
      <span className="sr-only">{label || 'Toggle'}</span>
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 
          transition duration-200 ease-in-out
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </button>
  );
};

// Constantes para selects específicos de SST
const OPCIONES_ARL = [
  "COLSANITAS",
];

const OPCIONES_CAJA_COMPENSACION = [
  "CAFAM",
  "COMFENALCO TOLIMA",
  "COMFACESAR",
  "COMFENALCO CARTAGENA",
];

const OPCIONES_ESTADO_EXAMEN = [
  "VIGENTE",
  "VENCIDO",
  "POR VENCER",
];

const TIPOS_DOCUMENTO_SST = [
  "Exámenes Médicos",
  "Certificado EPS",
  "Certificado ARL",
  "Certificado Manipulación de Alimentos",
  "Certificado Inducción",
  "Certificado Reinducción",
  "Certificado Vacunas",
  "Exámenes Paraclínicos",
  "Historia Clínica Ocupacional",
  "Formato de Ingreso SST",
  "Formato de Egreso SST",
  "Otros (SST)"
];

export default function EmpleadosSST() {
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
  const [selectedExamen, setSelectedExamen] = useState("todos");
  const [selectedCurso, setSelectedCurso] = useState("todos");
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
  }, [debouncedSearchTerm, selectedEstado, selectedExamen, selectedCurso, sortField, sortDirection]);

  async function fetchEmpleados() {
    setLoading(true);
    try {
      let data = await getEmpleadosSST();
      
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

      // Aplicar filtro de exámenes
      if (selectedExamen !== "todos") {
        const examenFilter = selectedExamen === "si";
        data = data.filter(e => e.empleados_sst?.examenes_medicos === examenFilter);
      }

      // Aplicar filtro de curso
      if (selectedCurso !== "todos") {
        const cursoFilter = selectedCurso === "si";
        data = data.filter(e => e.empleados_sst?.curso_manipulacion === cursoFilter);
      }

      // Aplicar ordenamiento
      data.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (sortField === "apellidos") {
          aVal = a.apellidos.toLowerCase();
          bVal = b.apellidos.toLowerCase();
        } else if (sortField === "fecha_examen") {
          aVal = a.empleados_sst?.fecha_examen || "";
          bVal = b.empleados_sst?.fecha_examen || "";
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
      setError("Error cargando empleados SST");
      notify.error("Error cargando empleados SST");
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
          <h3 className="text-xl font-semibold mb-2">Error al cargar empleados SST</h3>
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
              <h1 className="section-title">Seguridad y Salud en el Trabajo</h1>
              <p className="section-subtitle">
                Gestión de exámenes médicos, capacitaciones y elementos de protección
              </p>
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
            title="Con Exámenes"
            value={empleados.filter(e => e.empleados_sst?.examenes_medicos).length}
            icon={<CheckCircle className="w-5 h-5 text-success" />}
          />
          <StatsCard
            title="Con Curso"
            value={empleados.filter(e => e.empleados_sst?.curso_manipulacion).length}
            icon={<BookOpen className="w-5 h-5 text-warning" />}
          />
          <StatsCard
            title="Con Inducción"
            value={empleados.filter(e => e.empleados_sst?.induccion).length}
            icon={<Shield className="w-5 h-5 text-info" />}
          />
        </div>

        {/* Filtros */}
        <div className="card p-compact mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
                size={20}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar..."
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
                <option value="todos">Estados: Todos</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>

            {/* Filtro por exámenes */}
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
                size={20}
              />
              <select
                className="form-input pl-10 !py-2.5 appearance-none"
                value={selectedExamen}
                onChange={(e) => setSelectedExamen(e.target.value)}
              >
                <option value="todos">Exámenes: Todos</option>
                <option value="si">Con exámenes</option>
                <option value="no">Sin exámenes</option>
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

        {/* Tabla de Empleados SST - OPTIMIZADA PARA ESPACIO */}
        <div className="card overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-bg-hover)] border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider w-10">#</th>
                  <th
                    className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider cursor-pointer hover:bg-app min-w-[200px]"
                    onClick={() => handleSort("apellidos")}
                  >
                    <div className="flex items-center gap-1">
                      Nombre {getSortIcon("apellidos")}
                    </div>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Doc.</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Cargo</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-secondary uppercase tracking-wider w-24">Exám. Med</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-secondary uppercase tracking-wider w-24">Curso</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-secondary uppercase tracking-wider w-24">Inducción</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">ARL</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider w-24">Estado</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-secondary uppercase tracking-wider w-32">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center">
                      <div className="spinner spinner-lg mx-auto mb-3"></div>
                      <p className="text-muted">Cargando...</p>
                    </td>
                  </tr>
                ) : empleados.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center">
                      <div className="text-muted">
                        <Shield size={48} className="mx-auto mb-4 text-border" />
                        <p className="text-lg font-medium mb-2 text-primary">
                          No se encontraron empleados
                        </p>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="btn btn-primary mt-4"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Crear Registro
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  empleados.map((e, index) => (
                    <tr key={e.id} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-bg-active)] transition-colors">
                      <td className="px-3 py-2 text-sm text-secondary">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 max-w-[220px]">
                          <div className="w-8 h-8 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                            <User size={16} className="text-primary" />
                          </div>
                          <div className="truncate">
                            <p className="font-medium text-sm text-primary truncate">
                              {e.nombres} {e.apellidos}
                            </p>
                            <p className="text-xs text-secondary truncate">{e.correo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm font-mono text-secondary whitespace-nowrap">
                        {e.documento_identidad}
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-[150px] truncate" title={e.cargo}>
                          <span className="badge badge-outline text-xs">{e.cargo || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {e.empleados_sst?.examenes_medicos ? (
                          <CheckCircle size={18} className="text-success mx-auto" />
                        ) : (
                          <XCircle size={18} className="text-error mx-auto opacity-50" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {e.empleados_sst?.curso_manipulacion ? (
                          <CheckCircle size={18} className="text-success mx-auto" />
                        ) : (
                          <XCircle size={18} className="text-error mx-auto opacity-50" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {e.empleados_sst?.induccion ? (
                          <CheckCircle size={18} className="text-success mx-auto" />
                        ) : (
                          <XCircle size={18} className="text-error mx-auto opacity-50" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {e.empleados_sst?.arl ? (
                          <span className="text-xs font-medium text-success truncate block max-w-[100px]" title={e.empleados_sst.arl}>
                            {e.empleados_sst.arl}
                          </span>
                        ) : (
                          <span className="text-secondary text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span 
                          onClick={() => handleToggleEstado(e.id, e.activo)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                            e.activo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {e.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleVerDetalle(e.id)}
                            className="p-1.5 text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleEditarDetalle(e.id)}
                            className="p-1.5 text-secondary hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleEstado(e.id, e.activo)}
                            className="p-1.5 text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
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
        <EmpleadoDetalleSST
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

      {/* Modal de Creación de Registro SST */}
      {showCreateModal && (
        <CrearRegistroSSTModal
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

// Modal de Detalle Mejorado para SST
function EmpleadoDetalleSST({ empleado, modo = "ver", onClose, onRefresh, onCambiarModo }) {
  const [activeTab, setActiveTab] = useState("general");
  const [empleadoData, setEmpleadoData] = useState({});
  const [sstData, setSstData] = useState({});
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    file: null,
    tipo_documento: "",
    area: "SST"
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

      if (empleado.empleados_sst) {
        setSstData(empleado.empleados_sst);
      } else {
        // Inicializar datos SST si no existen
        setSstData({
          examenes_medicos: false,
          fecha_examen: "",
          estado_examen: "",
          curso_manipulacion: false,
          induccion: false,
          reinduccion: false,
          covid: false,
          covid_dosis: 0,
          hepatitis_a: false,
          tetano: false,
          arl: "",
          caja_compensacion: "",
          observaciones: ""
        });
      }
    }
  }, [empleado]);

  async function loadDocumentos() {
    try {
      const docs = await getEmpleadoDocumentos(empleado.id);
      // Filtrar solo documentos de área SST
      const docsSST = docs.filter(doc => doc.area === "SST");
      setDocumentos(docsSST || []);
    } catch (error) {
      console.error("Error cargando documentos:", error);
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      await updateSST(empleado.id, sstData);
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
      setNewDocument({ file: null, tipo_documento: "", area: "SST" });
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

  // Función auxiliar para manejar cambios del toggle (simula evento de checkbox)
  const handleToggleChange = (setter, name, newChecked) => {
    const syntheticEvent = {
      target: {
        name,
        type: 'checkbox',
        checked: newChecked
      }
    };
    handleInputChange(setter)(syntheticEvent);
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
              className={`px-4 py-3 font-medium ${activeTab === "sst" ? "text-primary border-b-2 border-primary" : "text-secondary"}`}
              onClick={() => setActiveTab("sst")}
            >
              <Shield className="inline-block w-4 h-4 mr-2" />
              Seguridad y Salud en el Trabajo
            </button>
            <button
              className={`px-4 py-3 font-medium ${activeTab === "documentos" ? "text-primary border-b-2 border-primary" : "text-secondary"}`}
              onClick={() => setActiveTab("documentos")}
            >
              <FileText className="inline-block w-4 h-4 mr-2" />
              Documentos SST ({documentos.length})
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "general" ? (
            <div className="space-y-6">
              {/* Datos Personales (solo lectura) */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Datos Personales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Nombres</label>
                    <input
                      value={empleadoData.nombres}
                      className="form-input bg-muted"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="form-label">Apellidos</label>
                    <input
                      value={empleadoData.apellidos}
                      className="form-input bg-muted"
                      disabled
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
                      value={empleadoData.correo}
                      className="form-input bg-muted"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="form-label">Teléfono</label>
                    <input
                      value={empleadoData.telefono}
                      className="form-input bg-muted"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="form-label">Dirección</label>
                    <input
                      value={empleadoData.direccion}
                      className="form-input bg-muted"
                      disabled
                    />
                  </div>
                </div>
              </section>

              {/* Datos Laborales (solo lectura) */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Datos Laborales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Cargo</label>
                    <input
                      value={empleadoData.cargo}
                      className="form-input bg-muted"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="form-label">Tipo Empleado</label>
                    <input
                      value={empleadoData.tipo_empleado}
                      className="form-input bg-muted"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="form-label">Fecha Ingreso</label>
                    <input
                      value={empleadoData.fecha_ingreso}
                      className="form-input bg-muted"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="form-label">Estado</label>
                    <div className="flex items-center gap-2 p-2">
                      <Toggle
                        id="estadoActivo"
                        checked={empleadoData.activo}
                        onChange={() => {}} // Solo lectura, no cambia
                        disabled={true}
                        label="Empleado Activo"
                      />
                      <label htmlFor="estadoActivo" className="cursor-pointer text-sm">
                        Empleado Activo
                      </label>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : activeTab === "sst" ? (
            <div className="space-y-6">
              {/* Exámenes Médicos */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Syringe className="w-5 h-5" />
                  Exámenes Médicos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Toggle
                      id="examenes_medicos"
                      checked={sstData.examenes_medicos || false}
                      onChange={(newChecked) => handleToggleChange(setSstData, 'examenes_medicos', newChecked)}
                      disabled={!esModoEdicion}
                      label="Exámenes Médicos Realizados"
                    />
                    <label htmlFor="examenes_medicos" className="cursor-pointer text-sm">
                      Exámenes Médicos Realizados
                    </label>
                  </div>
                  <div>
                    <label className="form-label">Fecha Examen</label>
                    <input
                      type="date"
                      name="fecha_examen"
                      value={sstData.fecha_examen || ""}
                      onChange={handleInputChange(setSstData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    />
                  </div>
                  <div>
                    <label className="form-label">Estado Examen</label>
                    <select
                      name="estado_examen"
                      value={sstData.estado_examen || ""}
                      onChange={handleInputChange(setSstData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    >
                      <option value="">Seleccionar...</option>
                      {OPCIONES_ESTADO_EXAMEN.map((estado) => (
                        <option key={estado} value={estado}>{estado}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Capacitaciones */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Capacitaciones
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Toggle
                      id="curso_manipulacion"
                      checked={sstData.curso_manipulacion || false}
                      onChange={(newChecked) => handleToggleChange(setSstData, 'curso_manipulacion', newChecked)}
                      disabled={!esModoEdicion}
                      label="Curso Manipulación de Alimentos"
                    />
                    <label htmlFor="curso_manipulacion" className="cursor-pointer text-sm">
                      Curso Manipulación de Alimentos
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle
                      id="induccion"
                      checked={sstData.induccion || false}
                      onChange={(newChecked) => handleToggleChange(setSstData, 'induccion', newChecked)}
                      disabled={!esModoEdicion}
                      label="Inducción realizada"
                    />
                    <label htmlFor="induccion" className="cursor-pointer text-sm">
                      Inducción realizada
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle
                      id="reinduccion"
                      checked={sstData.reinduccion || false}
                      onChange={(newChecked) => handleToggleChange(setSstData, 'reinduccion', newChecked)}
                      disabled={!esModoEdicion}
                      label="Reinducción necesaria"
                    />
                    <label htmlFor="reinduccion" className="cursor-pointer text-sm">
                      Reinducción necesaria
                    </label>
                  </div>
                </div>
              </section>

              {/* Vacunas */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Syringe className="w-5 h-5" />
                  Vacunas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Toggle
                      id="covid"
                      checked={sstData.covid || false}
                      onChange={(newChecked) => handleToggleChange(setSstData, 'covid', newChecked)}
                      disabled={!esModoEdicion}
                      label="Vacuna COVID-19"
                    />
                    <label htmlFor="covid" className="cursor-pointer text-sm">
                      Vacuna COVID-19
                    </label>
                  </div>
                  <div>
                    <label className="form-label">Dosis COVID</label>
                    <input
                      type="number"
                      name="covid_dosis"
                      value={sstData.covid_dosis || 0}
                      onChange={handleInputChange(setSstData)}
                      className="form-input"
                      min="0"
                      disabled={!esModoEdicion}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle
                      id="hepatitis_a"
                      checked={sstData.hepatitis_a || false}
                      onChange={(newChecked) => handleToggleChange(setSstData, 'hepatitis_a', newChecked)}
                      disabled={!esModoEdicion}
                      label="Hepatitis A"
                    />
                    <label htmlFor="hepatitis_a" className="cursor-pointer text-sm">
                      Hepatitis A
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle
                      id="tetano"
                      checked={sstData.tetano || false}
                      onChange={(newChecked) => handleToggleChange(setSstData, 'tetano', newChecked)}
                      disabled={!esModoEdicion}
                      label="Tétano"
                    />
                    <label htmlFor="tetano" className="cursor-pointer text-sm">
                      Tétano
                    </label>
                  </div>
                </div>
              </section>

              {/* Seguridad Social */}
              <section>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Seguridad Social
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">ARL</label>
                    <select
                      name="arl"
                      value={sstData.arl || ""}
                      onChange={handleInputChange(setSstData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    >
                      <option value="">Seleccionar ARL...</option>
                      {OPCIONES_ARL.map((arl) => (
                        <option key={arl} value={arl}>{arl}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Caja Compensación</label>
                    <select
                      name="caja_compensacion"
                      value={sstData.caja_compensacion || ""}
                      onChange={handleInputChange(setSstData)}
                      className="form-input"
                      disabled={!esModoEdicion}
                    >
                      <option value="">Seleccionar Caja...</option>
                      {OPCIONES_CAJA_COMPENSACION.map((caja) => (
                        <option key={caja} value={caja}>{caja}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Observaciones */}
              <section>
                <label className="form-label">Observaciones SST</label>
                <textarea
                  name="observaciones"
                  value={sstData.observaciones || ""}
                  onChange={handleInputChange(setSstData)}
                  className="form-input"
                  rows={3}
                  disabled={!esModoEdicion}
                />
              </section>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Documentos de SST del Empleado</h3>
                {esModoEdicion && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Subir Documento SST
                  </button>
                )}
              </div>

              {documentos.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-light rounded-base">
                  <FileText className="w-12 h-12 text-border mx-auto mb-4" />
                  <p className="text-muted">No hay documentos de SST cargados</p>
                  {esModoEdicion && (
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="btn btn-outline mt-4"
                    >
                      Subir Primer Documento SST
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

      {/* Modal para subir documento SST */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-surface rounded-card shadow-xl max-w-md w-full">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Subir Documento SST</h3>
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
                  {TIPOS_DOCUMENTO_SST.map((tipo) => (
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
                  disabled
                >
                  <option value="SST">Seguridad y Salud en el Trabajo</option>
                </select>
              </div>
              <div>
                <label className="form-label">Archivo *</label>
                <div className="border-2 border-dashed border-light rounded-base p-6 text-center">
                  <input
                    type="file"
                    onChange={(e) => setNewDocument(prev => ({ ...prev, file: e.target.files[0] }))}
                    className="hidden"
                    id="file-upload-sst"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="file-upload-sst" className="cursor-pointer block">
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

// Modal de Creación de Registro SST (solo para empleados existentes)
function CrearRegistroSSTModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null);
  const [sstData, setSstData] = useState({
    examenes_medicos: false,
    fecha_examen: "",
    estado_examen: "",
    curso_manipulacion: false,
    induccion: false,
    reinduccion: false,
    covid: false,
    covid_dosis: 0,
    hepatitis_a: false,
    tetano: false,
    arl: "",
    caja_compensacion: "",
    observaciones: ""
  });

  // Buscar empleados disponibles
  useEffect(() => {
    const buscarEmpleados = async () => {
      if (searchTerm.length > 2) {
        try {
          const response = await getEmpleadosSST();
          const filtrados = response.filter(e => 
            e.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.documento_identidad.includes(searchTerm)
          );
          setEmpleadosDisponibles(filtrados);
        } catch (error) {
          console.error("Error buscando empleados:", error);
        }
      } else {
        setEmpleadosDisponibles([]);
      }
    };

    buscarEmpleados();
  }, [searchTerm]);

  const handleSeleccionarEmpleado = (empleado) => {
    setEmpleadoSeleccionado(empleado);
    setSearchTerm("");
    setEmpleadosDisponibles([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!empleadoSeleccionado) {
      notify.error("Debe seleccionar un empleado");
      return;
    }

    setLoading(true);
    try {
      await updateSST(empleadoSeleccionado.id, sstData);
      notify.success("Registro SST creado exitosamente");
      onSuccess();
    } catch (error) {
      console.error("Error creando registro SST:", error);
      notify.error("Error al crear el registro SST");
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSstData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleToggleChange = (name, newChecked) => {
    const syntheticEvent = {
      target: {
        name,
        type: 'checkbox',
        checked: newChecked
      }
    };
    handleChange(syntheticEvent);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-surface rounded-card shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Crear Nuevo Registro SST</h2>
            <button onClick={onClose} className="btn btn-icon btn-outline">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Buscar empleado */}
            <section>
              <h3 className="font-semibold mb-3">Seleccionar Empleado</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={20} />
                <input
                  type="text"
                  placeholder="Buscar empleado por nombre, apellido o documento..."
                  className="form-input pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {empleadoSeleccionado ? (
                <div className="mt-4 p-4 border border-light rounded-base">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{empleadoSeleccionado.nombres} {empleadoSeleccionado.apellidos}</p>
                      <p className="text-sm text-secondary">Documento: {empleadoSeleccionado.documento_identidad}</p>
                      <p className="text-sm text-secondary">Cargo: {empleadoSeleccionado.cargo}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmpleadoSeleccionado(null)}
                      className="btn btn-outline btn-sm"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  {empleadosDisponibles.length > 0 && (
                    <div className="border border-light rounded-base max-h-60 overflow-y-auto">
                      {empleadosDisponibles.map(empleado => (
                        <div
                          key={empleado.id}
                          className="p-3 hover:bg-app cursor-pointer border-b border-light last:border-b-0"
                          onClick={() => handleSeleccionarEmpleado(empleado)}
                        >
                          <p className="font-medium">{empleado.nombres} {empleado.apellidos}</p>
                          <p className="text-sm text-secondary">Documento: {empleado.documento_identidad} • Cargo: {empleado.cargo}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchTerm && empleadosDisponibles.length === 0 && (
                    <p className="text-center py-4 text-muted">No se encontraron empleados</p>
                  )}
                </div>
              )}
            </section>

            {empleadoSeleccionado && (
              <>
                {/* Exámenes Médicos */}
                <section>
                  <h3 className="font-semibold mb-3">Exámenes Médicos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Toggle
                        id="examenes_medicos"
                        checked={sstData.examenes_medicos}
                        onChange={(newChecked) => handleToggleChange('examenes_medicos', newChecked)}
                        disabled={false}
                        label="Exámenes Médicos Realizados"
                      />
                      <label htmlFor="examenes_medicos" className="cursor-pointer text-sm">
                        Exámenes Médicos Realizados
                      </label>
                    </div>
                    <div>
                      <label className="form-label">Fecha Examen</label>
                      <input
                        type="date"
                        name="fecha_examen"
                        value={sstData.fecha_examen}
                        onChange={handleChange}
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label className="form-label">Estado Examen</label>
                      <select
                        name="estado_examen"
                        value={sstData.estado_examen}
                        onChange={handleChange}
                        className="form-input"
                      >
                        <option value="">Seleccionar...</option>
                        {OPCIONES_ESTADO_EXAMEN.map((estado) => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* Capacitaciones */}
                <section>
                  <h3 className="font-semibold mb-3">Capacitaciones</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Toggle
                        id="curso_manipulacion"
                        checked={sstData.curso_manipulacion}
                        onChange={(newChecked) => handleToggleChange('curso_manipulacion', newChecked)}
                        disabled={false}
                        label="Curso Manipulación de Alimentos"
                      />
                      <label htmlFor="curso_manipulacion" className="cursor-pointer text-sm">
                        Curso Manipulación de Alimentos
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Toggle
                        id="induccion"
                        checked={sstData.induccion}
                        onChange={(newChecked) => handleToggleChange('induccion', newChecked)}
                        disabled={false}
                        label="Inducción realizada"
                      />
                      <label htmlFor="induccion" className="cursor-pointer text-sm">
                        Inducción realizada
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Toggle
                        id="reinduccion"
                        checked={sstData.reinduccion}
                        onChange={(newChecked) => handleToggleChange('reinduccion', newChecked)}
                        disabled={false}
                        label="Reinducción necesaria"
                      />
                      <label htmlFor="reinduccion" className="cursor-pointer text-sm">
                        Reinducción necesaria
                      </label>
                    </div>
                  </div>
                </section>

                {/* Vacunas */}
                <section>
                  <h3 className="font-semibold mb-3">Vacunas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Toggle
                        id="covid"
                        checked={sstData.covid}
                        onChange={(newChecked) => handleToggleChange('covid', newChecked)}
                        disabled={false}
                        label="Vacuna COVID-19"
                      />
                      <label htmlFor="covid" className="cursor-pointer text-sm">
                        Vacuna COVID-19
                      </label>
                    </div>
                    <div>
                      <label className="form-label">Dosis COVID</label>
                      <input
                        type="number"
                        name="covid_dosis"
                        value={sstData.covid_dosis}
                        onChange={handleChange}
                        className="form-input"
                        min="0"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Toggle
                        id="hepatitis_a"
                        checked={sstData.hepatitis_a}
                        onChange={(newChecked) => handleToggleChange('hepatitis_a', newChecked)}
                        disabled={false}
                        label="Hepatitis A"
                      />
                      <label htmlFor="hepatitis_a" className="cursor-pointer text-sm">
                        Hepatitis A
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Toggle
                        id="tetano"
                        checked={sstData.tetano}
                        onChange={(newChecked) => handleToggleChange('tetano', newChecked)}
                        disabled={false}
                        label="Tétano"
                      />
                      <label htmlFor="tetano" className="cursor-pointer text-sm">
                        Tétano
                      </label>
                    </div>
                  </div>
                </section>

                {/* Seguridad Social */}
                <section>
                  <h3 className="font-semibold mb-3">Seguridad Social</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">ARL</label>
                      <select
                        name="arl"
                        value={sstData.arl}
                        onChange={handleChange}
                        className="form-input"
                      >
                        <option value="">Seleccionar ARL...</option>
                        {OPCIONES_ARL.map((arl) => (
                          <option key={arl} value={arl}>{arl}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Caja Compensación</label>
                      <select
                        name="caja_compensacion"
                        value={sstData.caja_compensacion}
                        onChange={handleChange}
                        className="form-input"
                      >
                        <option value="">Seleccionar Caja...</option>
                        {OPCIONES_CAJA_COMPENSACION.map((caja) => (
                          <option key={caja} value={caja}>{caja}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* Observaciones */}
                <section>
                  <label className="form-label">Observaciones SST</label>
                  <textarea
                    name="observaciones"
                    value={sstData.observaciones}
                    onChange={handleChange}
                    className="form-input"
                    rows={3}
                  />
                </section>
              </>
            )}
          </div>
        </form>

        <div className="card-footer flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-outline">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !empleadoSeleccionado}
            className="btn btn-primary flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Crear Registro SST
          </button>
        </div>
      </div>
    </div>
  );
}