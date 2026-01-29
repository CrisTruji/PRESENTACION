// src/screens/planta/verificarsolicitud.jsx
import React, { useEffect, useState } from "react";
import { useRouter } from "../../context/roleroutercontext";
import { useAuth } from "../../context/auth";
import { 
  getSolicitudById,
  actualizarItem,
  eliminarItem,
  reenviarSolicitud
} from "../../services/solicitudes";
import { 
  ESTADOS_SOLICITUD,
  ESTADOS_ITEM,
  ETIQUETAS_ESTADO_ITEM,
  getEstadoClasses,
  getEstadoIcon 
} from "../../lib/estados";
import notify from "../../utils/notifier";
import {
  Edit,
  Trash2,
  Send,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  User,
  MessageSquare,
  AlertTriangle,
  Save,
  X,
  Package,
  Eye,
  FileText,
  RefreshCw,
  Info
} from "lucide-react";

export default function VerificarSolicitud() {
  const { currentScreen, navigate } = useRouter();
  const { roleName } = useAuth();
  const id = currentScreen?.params?.id;

  // Estados
  const [solicitud, setSolicitud] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Modo edición
  const [itemEditando, setItemEditando] = useState(null);
  const [formEdicion, setFormEdicion] = useState({});

  // Modal de confirmación
  const [modalReenvio, setModalReenvio] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(null);

  // Permisos
  const esJefeDePlanta = roleName === 'jefe_de_planta';
  const esDevuelta = solicitud && [
    ESTADOS_SOLICITUD.DEVUELTA_JEFE_PLANTA,
    ESTADOS_SOLICITUD.RECHAZADO_AUXILIAR
  ].includes(solicitud.estado);
  const puedeEditar = esJefeDePlanta && esDevuelta;

  // Cargar solicitud
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    cargarSolicitud();
  }, [id]);

  async function cargarSolicitud() {
    try {
      const data = await getSolicitudById(id);
      setSolicitud(data);
      setItems(data?.solicitud_items || []);
    } catch (err) {
      notify.error('Error al cargar la solicitud');
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // EDICIÓN DE ITEM
  // ============================================================

  function iniciarEdicion(item) {
    setItemEditando(item.id);
    setFormEdicion({
      cantidad_solicitada: item.cantidad_solicitada,
      unidad: item.unidad,
      observaciones: item.observaciones || ''
    });
  }

  function cancelarEdicion() {
    setItemEditando(null);
    setFormEdicion({});
  }

  async function guardarEdicion(itemId) {
    if (!formEdicion.cantidad_solicitada || formEdicion.cantidad_solicitada <= 0) {
      notify.warning('La cantidad debe ser mayor a 0');
      return;
    }

    try {
      await actualizarItem(itemId, formEdicion);
      
      setItems(prev =>
        prev.map(item =>
          item.id === itemId
            ? { ...item, ...formEdicion }
            : item
        )
      );

      notify.success('Producto actualizado');
      cancelarEdicion();
    } catch (error) {
      notify.error('Error al actualizar el producto');
    }
  }

  // ============================================================
  // ELIMINAR ITEM
  // ============================================================

  async function confirmarEliminar() {
    if (!modalEliminar) return;

    try {
      await eliminarItem(modalEliminar.id);
      
      setItems(prev => prev.filter(item => item.id !== modalEliminar.id));
      
      notify.success('Producto eliminado');
      setModalEliminar(null);
    } catch (error) {
      notify.error('Error al eliminar el producto');
    }
  }

  // ============================================================
  // REENVIAR SOLICITUD
  // ============================================================

  async function handleReenviar() {
    if (items.length === 0) {
      notify.error('La solicitud debe tener al menos un producto');
      return;
    }

    setModalReenvio(false);
    setGuardando(true);

    try {
      const resultado = await reenviarSolicitud(id);
      
      notify.success(resultado.mensaje);
      
      setTimeout(() => {
        navigate('solicitudes_planta');
      }, 2000);
    } catch (error) {
      notify.error(error.message || 'Error al reenviar');
      setGuardando(false);
    }
  }

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

  const stats = {
    total: items.length,
    rechazados: items.filter(i => i.estado_item === ESTADOS_ITEM.RECHAZADO_AUXILIAR).length,
    aprobados: items.filter(i => i.estado_item === ESTADOS_ITEM.APROBADO_AUXILIAR).length,
    pendientes: items.filter(i => i.estado_item === ESTADOS_ITEM.PENDIENTE_AUXILIAR).length
  };

  // ============================================================
  // LOADING / ERROR
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-content flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4"></div>
          <p className="text-muted">Cargando solicitud...</p>
        </div>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="min-h-content flex flex-col items-center justify-center">
        <div className="w-16 h-16 alert-error rounded-full flex items-center justify-center mb-4">
          <XCircle size={32} className="text-error" />
        </div>
        <h3 className="section-title mb-3">Solicitud no encontrada</h3>
        <p className="text-muted mb-6">La solicitud que buscas no existe o no tienes permiso para verla.</p>
        <button
          onClick={() => navigate('solicitudes_planta')}
          className="btn btn-primary"
        >
          <ArrowLeft size={18} />
          Volver a solicitudes
        </button>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-content p-compact">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="card card-hover mb-6">
          <div className="card-header">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="section-title">
                  {puedeEditar ? 'Corregir Solicitud' : 'Ver Solicitud'} #{solicitud.id}
                </h1>
                <p className="section-subtitle">
                  {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className={`badge text-sm font-medium px-3 py-1 ${
                  getEstadoClasses(solicitud.estado, 'solicitud')
                }`}>
                  {getEstadoIcon(solicitud.estado, 'solicitud')}
                  {solicitud.estado}
                </div>
                <button
                  onClick={() => navigate('solicitudes_planta')}
                  className="btn btn-outline flex items-center gap-2"
                  disabled={guardando}
                >
                  <ArrowLeft size={18} />
                  Volver
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-base bg-primary/10 flex items-center justify-center">
                  <Building size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted">Proveedor</p>
                  <p className="font-medium">{solicitud.proveedor?.nombre || 'Sin proveedor'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-base bg-primary/10 flex items-center justify-center">
                  <User size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted">Creada por</p>
                  <p className="font-medium">{solicitud.email_creador || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-base bg-primary/10 flex items-center justify-center">
                  <FileText size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted">Estado</p>
                  <p className="font-medium">{solicitud.estado}</p>
                </div>
              </div>
            </div>

            {solicitud.observaciones && (
              <div className="mt-4 p-3 alert alert-success">
                <div className="flex items-start gap-2">
                  <MessageSquare size={16} className="text-success" />
                  <div>
                    <p className="text-xs text-success font-medium mb-1">Observaciones:</p>
                    <p className="text-sm text-success">{solicitud.observaciones}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alerta de corrección */}
        {puedeEditar && (
          <div className="alert alert-warning mb-6">
            <div className="flex gap-3">
              <AlertTriangle size={24} className="text-warning" />
              <div className="flex-1">
                <h3 className="font-bold text-warning mb-2">
                  Esta solicitud fue devuelta para corrección
                </h3>
                <p className="text-sm text-warning mb-3">
                  Revisa los motivos de rechazo, corrige los productos señalados y reenvía la solicitud.
                </p>
                <ul className="text-sm text-warning space-y-1">
                  <li className="flex items-center gap-2">
                    <Edit size={14} />
                    Puedes editar las cantidades y observaciones
                  </li>
                  <li className="flex items-center gap-2">
                    <Trash2 size={14} />
                    Puedes eliminar productos rechazados
                  </li>
                  <li className="flex items-center gap-2">
                    <Package size={14} />
                    Puedes agregar nuevos productos
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="w-10 h-10 rounded-base bg-primary/10 flex items-center justify-center">
                  <Package size={18} className="text-primary" />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-success">Aprobados</p>
                  <p className="text-2xl font-bold text-success">{stats.aprobados}</p>
                </div>
                <div className="w-10 h-10 rounded-base bg-success/10 flex items-center justify-center">
                  <CheckCircle size={18} className="text-success" />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-error">Rechazados</p>
                  <p className="text-2xl font-bold text-error">{stats.rechazados}</p>
                </div>
                <div className="w-10 h-10 rounded-base bg-error/10 flex items-center justify-center">
                  <XCircle size={18} className="text-error" />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-warning">Pendientes</p>
                  <p className="text-2xl font-bold text-warning">{stats.pendientes}</p>
                </div>
                <div className="w-10 h-10 rounded-base bg-warning/10 flex items-center justify-center">
                  <Clock size={18} className="text-warning" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de productos */}
        <div className="space-y-3 mb-6">
          {items.map(item => {
            const esRechazado = item.estado_item === ESTADOS_ITEM.RECHAZADO_AUXILIAR;
            const estaEditando = itemEditando === item.id;

            return (
              <div
                key={item.id}
                className={`card ${esRechazado ? 'border-error' : ''}`}
              >
                <div className="p-4">
                  {estaEditando ? (
                    // MODO EDICIÓN
                    <div>
                      <h3 className="section-title text-lg mb-4">
                        <Edit size={18} className="inline mr-2" />
                        Editando: {item.catalogo_productos?.nombre}
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="form-label">Cantidad *</label>
                          <input
                            type="number"
                            value={formEdicion.cantidad_solicitada}
                            onChange={(e) => setFormEdicion(prev => ({
                              ...prev,
                              cantidad_solicitada: parseFloat(e.target.value)
                            }))}
                            className="form-input"
                            min="0.01"
                            step="0.01"
                          />
                        </div>
                        
                        <div>
                          <label className="form-label">Unidad *</label>
                          <input
                            type="text"
                            value={formEdicion.unidad}
                            onChange={(e) => setFormEdicion(prev => ({
                              ...prev,
                              unidad: e.target.value
                            }))}
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label">Observaciones</label>
                        <textarea
                          value={formEdicion.observaciones}
                          onChange={(e) => setFormEdicion(prev => ({
                            ...prev,
                            observaciones: e.target.value
                          }))}
                          rows="2"
                          className="form-input"
                          placeholder="Agrega detalles adicionales..."
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => guardarEdicion(item.id)}
                          className="btn btn-primary flex items-center gap-2"
                        >
                          <Save size={18} />
                          Guardar
                        </button>
                        <button
                          onClick={cancelarEdicion}
                          className="btn btn-outline flex items-center gap-2"
                        >
                          <X size={18} />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // MODO VISTA
                    <div>
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-base flex items-center justify-center flex-shrink-0 ${
                              esRechazado ? 'bg-error/10' : 'bg-primary/10'
                            }`}>
                              <Package size={20} className={esRechazado ? 'text-error' : 'text-primary'} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold text-base truncate">
                                {item.catalogo_productos?.nombre || 'Producto sin nombre'}
                              </h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-muted">
                                  {item.cantidad_solicitada} {item.unidad}
                                </span>
                                {item.catalogo_productos?.categoria && (
                                  <span className="badge badge-primary text-xs">
                                    {item.catalogo_productos.categoria}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Badge de estado */}
                        <div className={`badge px-3 py-1 text-sm font-medium ${
                          getEstadoClasses(item.estado_item, 'item')
                        }`}>
                          {getEstadoIcon(item.estado_item, 'item')}
                          {ETIQUETAS_ESTADO_ITEM[item.estado_item]}
                        </div>
                      </div>

                      {/* Observaciones del producto */}
                      {item.observaciones && (
                        <div className="mb-3 p-3 bg-surface border border-base rounded-base">
                          <p className="text-xs text-muted mb-1">Observación:</p>
                          <p className="text-sm">{item.observaciones}</p>
                        </div>
                      )}

                      {/* Motivo de rechazo */}
                      {esRechazado && item.motivo_rechazo && (
                        <div className="mb-3 p-3 alert alert-error">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={16} className="text-error" />
                            <div>
                              <p className="text-xs text-error font-medium mb-1">MOTIVO DE RECHAZO:</p>
                              <p className="text-sm text-error">{item.motivo_rechazo}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Acciones */}
                      {puedeEditar && (
                        <div className="flex gap-2 mt-4 pt-3 border-t border-base">
                          <button
                            onClick={() => iniciarEdicion(item)}
                            className="btn btn-outline flex items-center gap-2"
                            disabled={guardando}
                          >
                            <Edit size={16} />
                            Editar
                          </button>
                          
                          {esRechazado && (
                            <button
                              onClick={() => setModalEliminar(item)}
                              className="btn btn-outline text-error hover:bg-error/10 flex items-center gap-2"
                              disabled={guardando}
                            >
                              <Trash2 size={16} />
                              Eliminar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Botón de reenvío */}
        {puedeEditar && (
          <div className="sticky bottom-0 bg-surface border-t-2 border-base p-4 shadow-card rounded-t-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {items.length === 0 ? (
                  <>
                    <AlertCircle size={20} className="text-error" />
                    <span className="text-error font-medium">Debes tener al menos un producto</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} className="text-success" />
                    <span className="text-success font-medium">Listo para reenviar</span>
                  </>
                )}
              </div>
              
              <button
                onClick={() => setModalReenvio(true)}
                disabled={guardando || items.length === 0}
                className={`btn btn-primary flex items-center gap-2 ${
                  guardando || items.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {guardando ? (
                  <>
                    <div className="spinner-sm"></div>
                    Reenviando...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Reenviar Solicitud
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Modal de confirmación de reenvío */}
        {modalReenvio && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <div className="card-header">
                <h3 className="section-title">Confirmar reenvío</h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <p className="text-muted">
                    ¿Estás seguro de que deseas reenviar esta solicitud? Los productos serán revisados nuevamente por el auxiliar de compras.
                  </p>
                  <div className="alert alert-success">
                    <div className="flex items-start gap-2">
                      <Info size={16} className="text-success" />
                      <p className="text-sm text-success">
                        La solicitud volverá a estado <strong>pendiente</strong> y todos los productos serán marcados para nueva revisión.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setModalReenvio(false)}
                      className="btn btn-outline flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleReenviar}
                      className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      <Send size={18} />
                      Confirmar reenvío
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {modalEliminar && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <div className="card-header">
                <h3 className="section-title text-error">Eliminar producto</h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <p className="text-muted">
                    ¿Estás seguro de que deseas eliminar este producto?
                  </p>
                  <div className="alert alert-error">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-error" />
                      <div>
                        <p className="font-medium text-error">{modalEliminar.catalogo_productos?.nombre}</p>
                        <p className="text-sm text-error mt-1">
                          Cantidad: {modalEliminar.cantidad_solicitada} {modalEliminar.unidad}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setModalEliminar(null)}
                      className="btn btn-outline flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmarEliminar}
                      className="btn text-error border-error hover:bg-error/10 flex-1 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}