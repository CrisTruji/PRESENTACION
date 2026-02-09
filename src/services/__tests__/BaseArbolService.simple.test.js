// Tests básicos para BaseArbolService
import { describe, it, expect } from 'vitest';
import { BaseArbolService } from '../BaseArbolService';

describe('BaseArbolService - Constructor', () => {
  it('debe requerir tableName', () => {
    expect(() => new BaseArbolService()).toThrow('BaseArbolService requiere nombre de tabla');
  });

  it('debe almacenar tableName correctamente', () => {
    const service = new BaseArbolService('arbol_recetas');
    expect(service.tableName).toBe('arbol_recetas');
  });

  it('debe crear instancia con tableName válido', () => {
    const service = new BaseArbolService('test_table');
    expect(service).toBeInstanceOf(BaseArbolService);
    expect(service.tableName).toBe('test_table');
  });
});

describe('BaseArbolService - Métodos disponibles', () => {
  let service;

  beforeEach(() => {
    service = new BaseArbolService('test_table');
  });

  it('debe tener método getHijos', () => {
    expect(typeof service.getHijos).toBe('function');
  });

  it('debe tener método getPorId', () => {
    expect(typeof service.getPorId).toBe('function');
  });

  it('debe tener método getPorCodigo', () => {
    expect(typeof service.getPorCodigo).toBe('function');
  });

  it('debe tener método buscar', () => {
    expect(typeof service.buscar).toBe('function');
  });

  it('debe tener método contarPorNivel', () => {
    expect(typeof service.contarPorNivel).toBe('function');
  });

  it('debe tener método crear', () => {
    expect(typeof service.crear).toBe('function');
  });

  it('debe tener método actualizar', () => {
    expect(typeof service.actualizar).toBe('function');
  });

  it('debe tener método eliminar', () => {
    expect(typeof service.eliminar).toBe('function');
  });

  it('debe tener método validarCodigoUnico', () => {
    expect(typeof service.validarCodigoUnico).toBe('function');
  });

  it('debe tener método getRutaCompleta', () => {
    expect(typeof service.getRutaCompleta).toBe('function');
  });
});
