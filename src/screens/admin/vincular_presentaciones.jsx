import React, { useState, useEffect } from 'react';
import { proveedorPresentacionesService } from '../../services/proveedorPresentacionesService';
import { supabase } from '../../lib/supabase';

/**
 * Pantalla para vincular presentaciones (nivel 6) a proveedores
 * Permite gestionar qué productos puede ofrecer cada proveedor
 */
const VincularPresentaciones = () => {
  // Estado principal
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [presentacionesVinculadas, setPresentacionesVinculadas] = useState([]);
  const [presentacionesDisponibles, setPresentacionesDisponibles] = useState([]);

  // Estado de búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);

  // Estado de carga
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // Modal para editar precio
  const [modalPrecio, setModalPrecio] = useState({ abierto: false, vinculacion: null });
  const [precioTemp, setPrecioTemp] = useState('');
  const [codigoTemp, setCodigoTemp] = useState('');

  // Cargar proveedores al iniciar
  useEffect(() => {
    cargarProveedores();
  }, []);

  // Cargar presentaciones cuando se selecciona un proveedor
  useEffect(() => {
    if (proveedorSeleccionado) {
      cargarPresentacionesVinculadas();
      buscarPresentacionesDisponibles();
    }
  }, [proveedorSeleccionado]);

  // Búsqueda con debounce
  useEffect(() => {
    if (!proveedorSeleccionado) return;

    const timer = setTimeout(() => {
      buscarPresentacionesDisponibles();
    }, 300);

    return () => clearTimeout(timer);
  }, [busqueda]);

  const cargarProveedores = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('id, nombre, nit')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setProveedores(data || []);
    } catch (err) {
      setError('Error al cargar proveedores');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const cargarPresentacionesVinculadas = async () => {
    if (!proveedorSeleccionado) return;

    const { data, error } = await proveedorPresentacionesService.getPresentacionesByProveedor(
      proveedorSeleccionado.id
    );

    if (error) {
      console.error('Error cargando vinculaciones:', error);
    } else {
      setPresentacionesVinculadas(data || []);
    }
  };

  const buscarPresentacionesDisponibles = async () => {
    if (!proveedorSeleccionado) return;

    setBuscando(true);
    const { data, error } = await proveedorPresentacionesService.buscarPresentacionesDisponibles(
      proveedorSeleccionado.id,
      busqueda
    );

    if (error) {
      console.error('Error buscando presentaciones:', error);
    } else {
      setPresentacionesDisponibles(data || []);
    }
    setBuscando(false);
  };

  const vincularPresentacion = async (presentacion) => {
    setGuardando(true);
    const { error } = await proveedorPresentacionesService.vincularPresentacion(
      proveedorSeleccionado.id,
      presentacion.id
    );

    if (error) {
      alert('Error al vincular: ' + error.message);
    } else {
      await cargarPresentacionesVinculadas();
      await buscarPresentacionesDisponibles();
    }
    setGuardando(false);
  };

  const desvincularPresentacion = async (vinculacion) => {
    if (!confirm('¿Está seguro de desvincular esta presentación?')) return;

    setGuardando(true);
    const { error } = await proveedorPresentacionesService.desvincularPresentacion(
      proveedorSeleccionado.id,
      vinculacion.presentacion.id
    );

    if (error) {
      alert('Error al desvincular: ' + error.message);
    } else {
      await cargarPresentacionesVinculadas();
      await buscarPresentacionesDisponibles();
    }
    setGuardando(false);
  };

  const abrirModalPrecio = (vinculacion) => {
    setPrecioTemp(vinculacion.precio_referencia || '');
    setCodigoTemp(vinculacion.codigo_proveedor || '');
    setModalPrecio({ abierto: true, vinculacion });
  };

  const guardarPrecio = async () => {
    if (!modalPrecio.vinculacion) return;

    setGuardando(true);
    const { error } = await proveedorPresentacionesService.actualizarVinculacion(
      modalPrecio.vinculacion.id,
      {
        precio_referencia: precioTemp ? parseFloat(precioTemp) : null,
        codigo_proveedor: codigoTemp || null
      }
    );

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      setModalPrecio({ abierto: false, vinculacion: null });
      await cargarPresentacionesVinculadas();
    }
    setGuardando(false);
  };

  const formatearPrecio = (precio) => {
    if (!precio) return '-';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <span className="text-4xl">🔗</span>
            Vincular Presentaciones a Proveedores
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Asocia las presentaciones del árbol de materia prima con los proveedores que las ofrecen
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Proveedores */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🏢</span> Proveedores
              </h2>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              {cargando ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : proveedores.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay proveedores</p>
              ) : (
                <div className="space-y-2">
                  {proveedores.map(proveedor => (
                    <button
                      key={proveedor.id}
                      onClick={() => setProveedorSeleccionado(proveedor)}
                      className={`w-full text-left p-4 rounded-xl transition-all ${
                        proveedorSeleccionado?.id === proveedor.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                      }`}
                    >
                      <p className="font-semibold text-gray-800 dark:text-white">
                        {proveedor.nombre}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        NIT: {proveedor.nit || 'N/A'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel de Presentaciones Vinculadas */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>✅</span> Vinculadas
                {presentacionesVinculadas.length > 0 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                    {presentacionesVinculadas.length}
                  </span>
                )}
              </h2>
            </div>
            <div className="p-4 max-h-[600px] overflow-y-auto">
              {!proveedorSeleccionado ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Selecciona un proveedor
                </p>
              ) : presentacionesVinculadas.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No hay presentaciones vinculadas
                </p>
              ) : (
                <div className="space-y-3">
                  {presentacionesVinculadas.map(vinc => (
                    <div
                      key={vinc.id}
                      className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 dark:text-white">
                            {vinc.presentacion?.nombre}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {vinc.presentacion?.contenido_unidad} {vinc.presentacion?.unidad_contenido}
                          </p>
                          {vinc.producto && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              📦 {vinc.producto.nombre}
                            </p>
                          )}
                          {vinc.precio_referencia && (
                            <p className="text-sm font-medium text-green-700 dark:text-green-300 mt-2">
                              💰 {formatearPrecio(vinc.precio_referencia)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => abrirModalPrecio(vinc)}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Editar precio"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => desvincularPresentacion(vinc)}
                            disabled={guardando}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                            title="Desvincular"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel de Presentaciones Disponibles */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📦</span> Disponibles
              </h2>
            </div>
            <div className="p-4">
              {/* Buscador */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar presentaciones..."
                  disabled={!proveedorSeleccionado}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:ring-2 focus:ring-amber-500 focus:border-transparent
                             disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {buscando && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent"></div>
                  </div>
                )}
              </div>

              {/* Lista de presentaciones */}
              <div className="max-h-[500px] overflow-y-auto">
                {!proveedorSeleccionado ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    Selecciona un proveedor primero
                  </p>
                ) : presentacionesDisponibles.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {busqueda ? 'No se encontraron resultados' : 'No hay presentaciones disponibles'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {presentacionesDisponibles.map(pres => (
                      <div
                        key={pres.id}
                        className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {pres.nombre}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {pres.contenido_unidad} {pres.unidad_contenido}
                            {pres.producto && (
                              <span className="ml-2 text-amber-600 dark:text-amber-400">
                                • {pres.producto.nombre}
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => vincularPresentacion(pres)}
                          disabled={guardando}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg
                                     transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Vincular
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para editar precio */}
      {modalPrecio.abierto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 rounded-t-2xl">
              <h3 className="text-xl font-bold text-white">Editar Vinculación</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="font-medium text-gray-800 dark:text-white mb-1">
                  {modalPrecio.vinculacion?.presentacion?.nombre}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {modalPrecio.vinculacion?.presentacion?.contenido_unidad} {modalPrecio.vinculacion?.presentacion?.unidad_contenido}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Precio de Referencia
                </label>
                <input
                  type="number"
                  value={precioTemp}
                  onChange={(e) => setPrecioTemp(e.target.value)}
                  placeholder="Ej: 15000"
                  className="w-full px-4 py-2.5 rounded-xl border dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código del Proveedor (opcional)
                </label>
                <input
                  type="text"
                  value={codigoTemp}
                  onChange={(e) => setCodigoTemp(e.target.value)}
                  placeholder="Ej: SKU-12345"
                  className="w-full px-4 py-2.5 rounded-xl border dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setModalPrecio({ abierto: false, vinculacion: null })}
                className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPrecio}
                disabled={guardando}
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {guardando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VincularPresentaciones;
