import React, { useState, useEffect } from 'react';
import { arbolPlatosService } from '../../services/arbolPlatosService';

/**
 * Modal para ver, editar y crear platos
 */
const ModalPlato = ({ plato, padre, modo, onCerrar }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    es_hoja: false
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [recetasAsociadas, setRecetasAsociadas] = useState([]);

  useEffect(() => {
    if (modo === 'ver' || modo === 'editar') {
      if (plato) {
        setFormData({
          codigo: plato.codigo || '',
          nombre: plato.nombre || '',
          descripcion: plato.descripcion || '',
          es_hoja: plato.es_hoja || false
        });
        // Cargar recetas asociadas si es plato hoja
        if (plato.es_hoja) {
          cargarRecetas(plato.id);
        }
      }
    } else if (modo === 'crear' && padre) {
      generarCodigo();
    }
  }, [plato, padre, modo]);

  const cargarRecetas = async (platoId) => {
    const { data } = await arbolPlatosService.getRecetasDelPlato(platoId);
    setRecetasAsociadas(data || []);
  };

  const generarCodigo = async () => {
    if (!padre) return;
    const nuevoNivel = padre.nivel_actual + 1;
    const codigo = await arbolPlatosService.generarSiguienteCodigo(padre.id, nuevoNivel);
    setFormData(prev => ({
      ...prev,
      codigo: codigo || '',
      es_hoja: nuevoNivel === 5
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleGuardar = async () => {
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      if (modo === 'crear') {
        const nuevoNodo = {
          ...formData,
          parent_id: padre.id,
          nivel_actual: padre.nivel_actual + 1,
          activo: true
        };
        const { error: err } = await arbolPlatosService.crearNodo(nuevoNodo);
        if (err) throw err;
      } else if (modo === 'editar') {
        const { error: err } = await arbolPlatosService.actualizarNodo(plato.id, {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          es_hoja: formData.es_hoja
        });
        if (err) throw err;
      }
      onCerrar(true);
    } catch (err) {
      console.error('Error guardando:', err);
      setError('Error al guardar el plato');
    } finally {
      setGuardando(false);
    }
  };

  const getTitulo = () => {
    switch (modo) {
      case 'ver': return 'Detalles del Plato';
      case 'editar': return 'Editar Plato';
      case 'crear': return 'Nuevo Plato';
      default: return 'Plato';
    }
  };

  const getIconoModo = () => {
    switch (modo) {
      case 'ver': return '👁️';
      case 'editar': return '✏️';
      case 'crear': return '➕';
      default: return '🍽️';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getIconoModo()}</span>
              <h2 className="text-xl font-bold text-white">{getTitulo()}</h2>
            </div>
            <button
              onClick={() => onCerrar(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Codigo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Codigo
              </label>
              <input
                type="text"
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                disabled={modo === 'ver' || modo === 'editar'}
                className="w-full px-4 py-2.5 rounded-xl border dark:border-gray-600
                           bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white
                           disabled:opacity-60 font-mono"
              />
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                disabled={modo === 'ver'}
                placeholder="Nombre del plato..."
                className="w-full px-4 py-2.5 rounded-xl border dark:border-gray-600
                           bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:opacity-60"
              />
            </div>

            {/* Descripcion */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripcion
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                disabled={modo === 'ver'}
                rows={3}
                placeholder="Descripcion del plato..."
                className="w-full px-4 py-2.5 rounded-xl border dark:border-gray-600
                           bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:opacity-60 resize-none"
              />
            </div>

            {/* Es hoja (plato final) */}
            {modo !== 'ver' && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <input
                  type="checkbox"
                  id="es_hoja"
                  name="es_hoja"
                  checked={formData.es_hoja}
                  onChange={handleChange}
                  disabled={modo === 'ver'}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="es_hoja" className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Es plato final</span>
                  <span className="block text-xs text-gray-500">Marcar si este es un plato servible (sin subcategorias)</span>
                </label>
              </div>
            )}

            {/* Informacion adicional en modo ver */}
            {modo === 'ver' && plato && (
              <div className="space-y-3 pt-4 border-t dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Nivel:</span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {plato.nivel_actual}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Tipo:</span>
                  <span className={`font-medium ${plato.es_hoja ? 'text-green-600' : 'text-blue-600'}`}>
                    {plato.es_hoja ? 'Plato final' : 'Categoria'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Estado:</span>
                  <span className={`font-medium ${plato.activo ? 'text-green-600' : 'text-red-600'}`}>
                    {plato.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            )}

            {/* Recetas asociadas */}
            {modo === 'ver' && recetasAsociadas.length > 0 && (
              <div className="pt-4 border-t dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <span>📋</span> Recetas Asociadas
                </h3>
                <div className="space-y-2">
                  {recetasAsociadas.map(receta => (
                    <div
                      key={receta.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white text-sm">{receta.nombre}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{receta.codigo}</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
                        {receta.rendimiento || '-'} porciones
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer con botones */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={() => onCerrar(false)}
            className="px-5 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700
                       hover:bg-gray-300 dark:hover:bg-gray-600
                       text-gray-700 dark:text-gray-200 font-medium
                       transition-colors"
          >
            {modo === 'ver' ? 'Cerrar' : 'Cancelar'}
          </button>
          {modo !== 'ver' && (
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600
                         hover:from-blue-600 hover:to-indigo-700
                         text-white font-medium transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
            >
              {guardando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Guardar</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalPlato;
