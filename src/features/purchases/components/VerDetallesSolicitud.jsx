// src/screens/aux_compras/verdetallessolicitudes.jsx
import React, { useEffect, useState } from "react";
import { useRouter } from "@/router";
import { 
  getSolicitudById, 
  cerrarRevisionAuxiliar,
  aprobarItemsAuxiliar,
  rechazarItemsAuxiliar
} from "@/features/purchases";
import notify from "@/shared/lib/notifier";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lightbulb,
  Save,
  Package,
  AlertTriangle,
  Loader2,
  Check,
  X,
  Info
} from "lucide-react";

export default function VerDetallesSolicitud() {
  const { currentScreen, navigate } = useRouter();
  const id = currentScreen?.params?.id;

  // Estados básicos
  const [solicitud, setSolicitud] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Items que el auxiliar quiere RECHAZAR (por defecto ninguno = todos aprobados)
  const [itemsRechazados, setItemsRechazados] = useState([]);
  
  // Motivos de rechazo por item
  const [motivos, setMotivos] = useState({});

  // Modal de confirmación
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);

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
      notify.success("Detalles de solicitud cargados correctamente");
    } catch (err) {
      notify.error("Error al cargar la solicitud");
      console.error("Error cargando solicitud:", err);
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // LÓGICA DE RECHAZO
  // ============================================================

  // Toggle rechazo de un item
  function toggleRechazo(itemId) {
    setItemsRechazados(prev => {
      if (prev.includes(itemId)) {
        // Si lo deselecciona, limpiar su motivo
        setMotivos(m => {
          const nuevo = { ...m };
          delete nuevo[itemId];
          return nuevo;
        });
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  }

  // Actualizar motivo de un item
  function actualizarMotivo(itemId, motivo) {
    setMotivos(prev => ({
      ...prev,
      [itemId]: motivo
    }));
  }

  // Validar antes de cerrar revisión
  function validarRevision() {
    // Si hay items rechazados sin motivo
    const rechazadosSinMotivo = itemsRechazados.filter(
      id => !motivos[id]?.trim()
    );

    if (rechazadosSinMotivo.length > 0) {
      notify.warning("Debes agregar un motivo a todos los ítems rechazados");
      return false;
    }

    return true;
  }

  // ============================================================
  // CERRAR REVISIÓN
  // ============================================================

  async function handleCerrarRevision() {
    if (!validarRevision()) return;

    setMostrarModalConfirmacion(false);
    setGuardando(true);

    try {
      // 1. Aprobar los items que NO están rechazados
      const itemsAprobados = items
        .filter(item => !itemsRechazados.includes(item.id))
        .map(item => item.id);

      if (itemsAprobados.length > 0) {
        await aprobarItemsAuxiliar(itemsAprobados);
      }

      // 2. Rechazar los items seleccionados con sus motivos
      if (itemsRechazados.length > 0) {
        for (const itemId of itemsRechazados) {
          await rechazarItemsAuxiliar([itemId], motivos[itemId]);
        }
      }

      // 3. Cerrar la revisión (esto determina el próximo estado)
      const resultado = await cerrarRevisionAuxiliar(id);

      notify.success(resultado.mensaje || "Revisión cerrada correctamente");
      
      setTimeout(() => {
        navigate("gestion_aux");
      }, 2000);

    } catch (error) {
      notify.error(error.message || "Error al cerrar revisión");
      setGuardando(false);
    }
  }

  // ============================================================
  // LOADING / ERROR
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-content bg-app">
        <div className="page-container">
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4"></div>
              <p className="text-secondary font-medium">Cargando detalles...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!solicitud) {
    return (
      <div className="min-h-content bg-app">
        <div className="page-container">
          <div className="card p-12 text-center">
            <div className="alert-error inline-flex items-center justify-center w-20 h-20 rounded-full mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Solicitud no encontrada</h3>
            <p className="text-secondary mb-6">No se pudo cargar la solicitud solicitada</p>
            <button
              onClick={() => navigate("gestion_aux")}
              className="btn btn-primary"
            >
              Volver a la lista
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

  const stats = {
    total: items.length,
    aprobados: items.length - itemsRechazados.length,
    rechazados: itemsRechazados.length
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-content bg-app">
      <div className="page-container pb-20">
        {/* Header */}
        <div className="section-header">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
            <div>
              <h1 className="section-title">
                Revisión de Solicitud <span className="text-primary">#{solicitud.id}</span>
              </h1>
              <p className="section-subtitle">
                {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <button
              onClick={() => navigate("gestion_aux")}
              className="btn btn-outline flex items-center gap-2 self-start"
              disabled={guardando}
            >
              <ArrowLeft size={18} />
              Volver
            </button>
          </div>
        </div>

        {/* Información de la solicitud */}
        <div className="card p-compact mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-surface rounded-base border border-light">
              <p className="text-sm text-secondary mb-1">Proveedor</p>
              <div className="flex items-center gap-2">
                <Building size={16} className="text-primary" />
                <p className="font-medium">
                  {solicitud.proveedor?.nombre || 'Sin proveedor'}
                </p>
              </div>
            </div>
            <div className="p-3 bg-surface rounded-base border border-light">
              <p className="text-sm text-secondary mb-1">Creada por</p>
              <div className="flex items-center gap-2">
                <User size={16} className="text-primary" />
                <p className="font-medium">
                  {solicitud.email_creador || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {solicitud.observaciones && (
            <div className="mt-4 p-4 bg-surface rounded-base border border-light">
              <div className="flex items-start gap-3">
                <FileText size={20} className="text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">Observaciones:</p>
                  <p className="text-secondary">{solicitud.observaciones}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="card-hover p-4 border-l-4 border-primary">
            <p className="text-sm font-medium text-secondary mb-1">Total de productos</p>
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
          </div>
          <div className="card-hover p-4 border-l-4 border-success">
            <p className="text-sm font-medium text-success mb-1">Se aprobarán</p>
            <p className="text-2xl font-bold text-success">{stats.aprobados}</p>
          </div>
          <div className="card-hover p-4 border-l-4 border-error">
            <p className="text-sm font-medium text-error mb-1">Se rechazarán</p>
            <p className="text-2xl font-bold text-error">{stats.rechazados}</p>
          </div>
        </div>

        {/* Instrucción */}
        <div className="alert alert-warning mb-6">
          <Lightbulb size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold mb-1">Todos los productos están pre-aprobados por defecto</h3>
            <p className="text-sm">
              Solo marca los que quieras <strong className="text-error">rechazar</strong> y escribe el motivo. Los productos sin marcar se aprobarán automáticamente al cerrar la revisión.
            </p>
          </div>
        </div>

        {/* Lista de productos */}
        <div className="space-y-3 mb-6">
          {items.map(item => {
            const estaRechazado = itemsRechazados.includes(item.id);
            
            return (
              <div
                key={item.id}
                className={`card p-4 border-2 transition-all ${
                  estaRechazado 
                    ? 'border-error/30 bg-error/5' 
                    : 'border-success/30 bg-success/5'
                }`}
              >
                {/* Header del item */}
                <div className="flex items-start gap-3">
                  {/* Checkbox de rechazo */}
                  <div className="flex-shrink-0">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={estaRechazado}
                        onChange={() => toggleRechazo(item.id)}
                        className="w-5 h-5 text-error rounded-base focus:ring-2 focus:ring-error/50"
                        disabled={guardando}
                      />
                    </label>
                  </div>

                  {/* Contenido del producto */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg">
                          {item.catalogo_productos?.nombre || 'Producto sin nombre'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <p className="text-sm text-secondary">
                            <strong>Cantidad:</strong> {item.cantidad_solicitada} {item.unidad}
                          </p>
                          {item.catalogo_productos?.categoria && (
                            <span className="badge badge-primary text-xs">
                              {item.catalogo_productos.categoria}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Badge de estado visual */}
                      <span className={`badge ${
                        estaRechazado 
                          ? 'badge-error' 
                          : 'badge-success'
                      }`}>
                        {estaRechazado ? 'Se rechazará' : 'Se aprobará'}
                      </span>
                    </div>

                    {/* Observaciones del producto */}
                    {item.observaciones && (
                      <div className="mb-3 p-3 bg-surface rounded-base border border-light">
                        <p className="text-xs text-secondary mb-1">Observación del solicitante:</p>
                        <p className="text-sm text-secondary">{item.observaciones}</p>
                      </div>
                    )}

                    {/* Input de motivo de rechazo */}
                    {estaRechazado && (
                      <div className="mt-3 p-3 bg-surface rounded-base border-2 border-error/30">
                        <label className="block text-sm font-medium text-error mb-2 flex items-center gap-1">
                          <AlertTriangle size={16} />
                          Motivo del rechazo *
                        </label>
                        <textarea
                          value={motivos[item.id] || ''}
                          onChange={(e) => actualizarMotivo(item.id, e.target.value)}
                          rows="2"
                          className="form-input w-full border-error/50 focus:border-error"
                          placeholder="Ej: Precio muy alto, producto no disponible, cantidad excesiva..."
                          disabled={guardando}
                        />
                        {!motivos[item.id]?.trim() && (
                          <p className="text-xs text-error mt-1">
                            * Este campo es obligatorio para rechazar el producto
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Panel de acciones fijo */}
        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-base p-4 shadow-lg z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="text-sm">
                {stats.rechazados > 0 && (
                  <span className="font-medium text-warning flex items-center gap-1">
                    <AlertTriangle size={16} />
                    Se devolverá la solicitud al jefe de planta
                  </span>
                )}
                {stats.rechazados === 0 && (
                  <span className="font-medium text-success flex items-center gap-1">
                    <Check size={16} />
                    La solicitud será aprobada completamente
                  </span>
                )}
              </div>

              <button
                onClick={() => setMostrarModalConfirmacion(true)}
                disabled={guardando}
                className="btn btn-primary flex items-center gap-2"
              >
                {guardando ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Cerrar revisión
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal de confirmación */}
        {mostrarModalConfirmacion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-surface rounded-card shadow-xl max-w-md w-full p-6">
              <div className="mb-4">
                <h3 className="text-xl font-semibold mb-2">
                  Confirmar revisión
                </h3>
                <p className="text-secondary">
                  Estás a punto de cerrar esta revisión con el siguiente resultado:
                </p>
              </div>

              <div className="bg-surface rounded-base p-4 mb-4 space-y-3 border border-light">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={18} className="text-success" />
                    <span className="text-sm">Productos aprobados:</span>
                  </div>
                  <span className="font-bold text-success">{stats.aprobados}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <XCircle size={18} className="text-error" />
                    <span className="text-sm">Productos rechazados:</span>
                  </div>
                  <span className="font-bold text-error">{stats.rechazados}</span>
                </div>
              </div>

              {stats.rechazados > 0 && (
                <div className="alert alert-warning mb-4">
                  <AlertTriangle size={20} />
                  <div>
                    <p className="text-sm">
                      La solicitud será devuelta al jefe de planta para correcciones.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarModalConfirmacion(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCerrarRevision}
                  className="btn btn-primary flex-1"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}