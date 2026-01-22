import React from 'react';
import ArbolMateriaPrima from '../../components/arbol/ArbolMateriaPrima';

/**
 * Pantalla principal del Árbol de Materia Prima
 * Integra el componente ArbolMateriaPrima con la estructura completa
 */
const ArbolMateriaPrimaScreen = () => {
  return (
    <div className="h-screen flex flex-col">
      <ArbolMateriaPrima />
    </div>
  );
};

export default ArbolMateriaPrimaScreen;
