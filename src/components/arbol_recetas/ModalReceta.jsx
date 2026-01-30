import React, { useState, useEffect } from 'react';
import { arbolRecetasService } from '../../services/arbolRecetasService';

/**
 * Modal para ver, editar y crear recetas
 * Incluye gestion de ingredientes
 */
const ModalReceta = ({ receta, padre, modo, onCerrar }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    rendimiento: '',
    version: 1
  });
  const [ingredientes, setIngredientes] = useState([]);
  const [cargandoIngredientes, setCargandoIngredientes] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [tabActivo, setTabActivo] = useState('info'); // 'info' | 'ingredientes'

  useEffect(() => {
    if (modo === 'ver' || modo === 'editar') {
      if (receta) {
        setFormData({
          codigo: receta.codigo || '',
          nombre: receta.nombre || '',
          descripcion: receta.descripcion || '',
          rendimiento: receta.rendimiento || '',
          version: receta.version || 1
        });
        if (receta.nivel_actual === 2) {
          cargarIngredientes(receta.id);
        }
      }
    } else if (modo === 'crear' && padre) {
      setFormData(prev => ({
        ...prev,
        codigo: `${padre.codigo}.R${Date.now().toString().slice(-4)}`
      }));
    }
  }, [receta, padre, modo]);

  const cargarIngredientes = async (recetaId) => {
    setCargandoIngredientes(true);
    const { data } = await arbolRecetasService.getIngredientes(recetaId);
    setIngredientes(data || []);
    setCargandoIngredientes(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
        const nuevaReceta = {
          codigo: formData.codigo,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          rendimiento: formData.rendimiento ? parseInt(formData.rendimiento) : null,
          parent_id: padre.id,
          plato_id: padre.plato_id,
          nivel_actual: 2,
          version: 1,
          activo: true
        };
        const { error: err } = await arbolRecetasService.crearReceta(nuevaReceta);
        if (err) throw err;
      } else if (modo === 'editar') {
        const { error: err } = await arbolRecetasService.actualizarReceta(receta.id, {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          rendimiento: formData.rendimiento ? parseInt(formData.rendimiento) : null,
          version: formData.version
        });
        if (err) throw err;
      }
      onCerrar(true);
    } catch (err) {
      console.error('Error guardando:', err);
      setError('Error al guardar la receta');
    } finally {
      setGuardando(false);
    }
  };

  const getTitulo = () => {
    switch (modo) {
      case 'ver': return 'Detalles de la Receta';
      case 'editar': return 'Editar Receta';
      case 'crear': return 'Nueva Receta';
      default: return 'Receta';
    }
  };

  const getIconoModo = () => {
    switch (modo) {
      case 'ver': return '👁️';
      case 'editar': return '✏️';
      case 'crear': return '➕';
      default: return '📋';
    }
  };

  const esReceta = receta?.nivel_actual === 2;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-600 px-6 py-4">
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

          {/* Tabs (solo en modo ver para recetas) */}
          {modo === 'ver' && esReceta && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setTabActivo('info')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  tabActivo === 'info'
                    ? 'bg-white text-orange-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Informacion
              </button>
              <button
                onClick={() => setTabActivo('ingredientes')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  tabActivo === 'ingredientes'
                    ? 'bg-white text-orange-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Ingredientes ({ingredientes.length})
              </button>
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Tab: Informacion */}
          {tabActivo === 'info' && (
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
                  placeholder="Nombre de la receta..."
                  className="w-full px-4 py-2.5 rounded-xl border dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:ring-2 focus:ring-orange-500 focus:border-transparent
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
                  placeholder="Descripcion de la receta..."
                  className="w-full px-4 py-2.5 rounded-xl border dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                             focus:ring-2 focus:ring-orange-500 focus:border-transparent
                             disabled:opacity-60 resize-none"
                />
              </div>

              {/* Rendimiento y Version */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rendimiento (porciones)
                  </label>
                  <input
                    type="number"
                    name="rendimiento"
                    value={formData.rendimiento}
                    onChange={handleChange}
                    disabled={modo === 'ver'}
                    min="1"
                    placeholder="Ej: 10"
                    className="w-full px-4 py-2.5 rounded-xl border dark:border-gray-600
                               bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                               focus:ring-2 focus:ring-orange-500 focus:border-transparent
                               disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Version
                  </label>
                  <input
                    type="number"
                    name="version"
                    value={formData.version}
                    onChange={handleChange}
                    disabled={modo === 'ver'}
                    min="1"
                    className="w-full px-4 py-2.5 rounded-xl border dark:border-gray-600
                               bg-white dark:bg-gray-700 text-gray-800 dark:text-white
                               focus:ring-2 focus:ring-orange-500 focus:border-transparent
                               disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Informacion adicional en modo ver */}
              {modo === 'ver' && receta && (
                <div className="space-y-3 pt-4 border-t dark:border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Nivel:</span>
                    <span className="font-medium text-gray-800 dark:text-white">
                      {receta.nivel_actual === 1 ? 'Conector' : 'Receta'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Estado:</span>
                    <span className={`font-medium ${receta.activo ? 'text-green-600' : 'text-red-600'}`}>
                      {receta.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Ingredientes */}
          {tabActivo === 'ingredientes' && (
            <div className="space-y-4">
              {cargandoIngredientes ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
                </div>
              ) : ingredientes.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-4xl mb-2 block">🥗</span>
                  <p className="text-gray-500 dark:text-gray-400">No hay ingredientes registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ingredientes.map((ing, index) => (
                    <div
                      key={ing.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {ing.materia_prima?.nombre || 'Ingrediente desconocido'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {ing.materia_prima?.codigo}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800 dark:text-white">
                          {ing.cantidad_requerida} {ing.unidad_medida}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Resumen */}
              {ingredientes.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                      Total de ingredientes:
                    </span>
                    <span className="text-lg font-bold text-amber-800 dark:text-amber-200">
                      {ingredientes.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600
                         hover:from-orange-600 hover:to-amber-700
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

export default ModalReceta;
