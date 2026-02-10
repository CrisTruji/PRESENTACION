// src/services/arbolRecetasService.js
// Servicio para Árbol de Recetas
// REFACTORIZADO: Extiende BaseArbolService (elimina ~150 líneas duplicadas)

import { supabase } from '@/shared/api';
import { BaseArbolService } from './BaseArbolService';

/**
 * Servicio para gestionar el Árbol de Recetas
 * Hereda operaciones CRUD de BaseArbolService
 * Solo define métodos específicos de recetas
 *
 * Estructura:
 * - Nivel 1: Conector (enlace con plato 2.X)
 * - Nivel 2: Receta estándar (3.X)
 * - Nivel 3: Receta local por unidad médica (3.X-01, etc.)
 */
class ArbolRecetasService extends BaseArbolService {
  constructor() {
    super('arbol_recetas'); // Nombre de la tabla
  }

  // ========================================
  // MÉTODOS ESPECÍFICOS DE RECETAS
  // ========================================

  /**
   * Obtener conectores (nivel 1)
   */
  async getConectores() {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('nivel_actual', 1)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  }

  /**
   * Obtener recetas estándar (nivel 2)
   */
  async getRecetasNivel2() {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('nivel_actual', 2)
      .eq('activo', true)
      .order('codigo');

    return { data, error };
  }

  /**
   * Obtener todas las recetas de un plato
   */
  async getRecetasPorPlato(platoId) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('plato_id', platoId)
      .eq('activo', true)
      .order('nivel_actual, codigo');

    return { data, error };
  }

  /**
   * Obtener ingredientes de una receta (con JOIN a materia prima)
   */
  async getIngredientes(recetaId) {
    const { data, error } = await supabase
      .from('receta_ingredientes')
      .select(`
        *,
        materia_prima:materia_prima_id (
          id, codigo, nombre, costo_promedio
        )
      `)
      .eq('receta_id', recetaId)
      .order('orden');

    return { data, error };
  }

  /**
   * Agregar ingrediente a receta
   */
  async agregarIngrediente(datos) {
    const { data, error } = await supabase
      .from('receta_ingredientes')
      .insert(datos)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Actualizar ingrediente
   */
  async actualizarIngrediente(id, datos) {
    const { data, error } = await supabase
      .from('receta_ingredientes')
      .update({ ...datos, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Eliminar ingrediente
   */
  async eliminarIngrediente(id) {
    const { data, error } = await supabase
      .from('receta_ingredientes')
      .delete()
      .eq('id', id);

    return { data, error };
  }

  /**
   * Duplicar receta completa (con ingredientes)
   */
  async duplicarReceta(recetaId, nuevoNombre) {
    // Obtener receta original
    const { data: original, error: errOriginal } = await this.getPorId(recetaId);
    if (errOriginal) return { data: null, error: errOriginal };

    // Generar código único
    const timestamp = Date.now().toString().slice(-4);
    const nuevoCodigo = `${original.codigo}.V${timestamp}`;

    // Crear nueva receta
    const nuevaReceta = {
      codigo: nuevoCodigo,
      nombre: nuevoNombre,
      descripcion: `Variante de: ${original.nombre}`,
      plato_id: original.plato_id,
      nivel_actual: original.nivel_actual,
      parent_id: original.parent_id,
      rendimiento: original.rendimiento,
      version: 1,
      activo: true
    };

    const { data: recetaCreada, error: errCrear } = await this.crear(nuevaReceta);
    if (errCrear) return { data: null, error: errCrear };

    // Copiar ingredientes
    const { data: ingredientes } = await this.getIngredientes(recetaId);
    if (ingredientes && ingredientes.length > 0) {
      for (const ing of ingredientes) {
        await this.agregarIngrediente({
          receta_id: recetaCreada.id,
          materia_prima_id: ing.materia_prima_id,
          cantidad_requerida: ing.cantidad_requerida,
          unidad_medida: ing.unidad_medida,
          orden: ing.orden
        });
      }
    }

    return { data: recetaCreada, error: null };
  }

  // ========================================
  // ALIASES PARA COMPATIBILIDAD CON UI
  // (Mantener nombres de métodos que usa el código existente)
  // ========================================

  async getRecetaPorId(id) {
    return this.getPorId(id);
  }

  async getRecetaPorCodigo(codigo) {
    return this.getPorCodigo(codigo);
  }

  async buscarRecetas(termino, filtros = {}) {
    return this.buscar(termino, filtros);
  }

  async crearReceta(datos) {
    return this.crear(datos);
  }

  async actualizarReceta(id, datos) {
    return this.actualizar(id, datos);
  }

  async eliminarReceta(id) {
    return this.eliminar(id);
  }
}

// Exportar instancia única (singleton)
export const arbolRecetasService = new ArbolRecetasService();

// También exportar clase por si se necesita extender
export { ArbolRecetasService };
