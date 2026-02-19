// ========================================
// PedidoDietas - Grid cantidades por tipo de dieta
// ========================================

import React from 'react';
import { usePedidoStore } from '../store/usePedidoStore';
import { useTiposDieta } from '@features/menu-cycles';

export default function PedidoDietas() {
  const { items, actualizarItem, inicializarItems, menuDelDia } = usePedidoStore();
  const { data: tiposDieta, isLoading } = useTiposDieta();

  // Calcular total reactivamente desde los items (getTotalPorciones del store no es reactivo)
  const totalPorciones = items.reduce((sum, i) => sum + (i.cantidad || 0), 0);

  // Filtrar: mostrar solo tipos de dieta con gramaje configurado en el ciclo activo
  // Si no hay menuDelDia, mostrar todos para no bloquear al coordinador
  const tiposDietaFiltrados = React.useMemo(() => {
    if (!tiposDieta) return [];
    if (!menuDelDia?.servicios?.length) return tiposDieta;

    const conGramaje = tiposDieta.filter((td) =>
      menuDelDia.servicios.some((srv) =>
        srv.menu_componentes?.some((mc) =>
          mc.gramajes_componente_menu?.some(
            (g) => g.tipo_dieta_id === td.id && !g.excluir && g.gramaje > 0
          )
        )
      )
    );
    // Fallback: si el filtro deja 0 resultados, mostrar todos
    return conGramaje.length > 0 ? conGramaje : tiposDieta;
  }, [tiposDieta, menuDelDia]);

  // Inicializar items si estan vacios y tenemos tipos de dieta
  React.useEffect(() => {
    if (tiposDietaFiltrados.length > 0 && items.length === 0) {
      inicializarItems(tiposDietaFiltrados);
    }
  }, [tiposDietaFiltrados]);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="spinner spinner-sm mx-auto" />
        <p className="mt-2 text-sm text-muted">Cargando tipos de dieta...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-text-muted mb-3">
          Ingresa la cantidad de porciones que necesitas para cada tipo de dieta
        </p>

        <div className="space-y-2">
          {tiposDietaFiltrados?.map((dieta) => {
            const item = items.find((i) => i.tipo_dieta_id === dieta.id);
            return (
              <div
                key={dieta.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:border-primary hover:bg-bg-surface transition-all"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div>
                  <label
                    htmlFor={`dieta-${dieta.id}`}
                    className="text-sm font-semibold text-primary cursor-pointer"
                  >
                    {dieta.nombre}
                  </label>
                  <span className="ml-2 text-xs text-text-muted">({dieta.codigo})</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id={`dieta-${dieta.id}`}
                    min="0"
                    value={item?.cantidad || 0}
                    onChange={(e) =>
                      actualizarItem(dieta.id, 'cantidad', parseInt(e.target.value) || 0)
                    }
                    className="form-input w-20 text-center text-sm"
                  />
                  <span className="text-xs text-text-muted w-16">porciones</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen total */}
      <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">
            Total de porciones:
          </span>
          <span className="text-3xl font-bold text-primary">
            {totalPorciones}
          </span>
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className="form-label">Observaciones generales</label>
        <textarea
          rows="2"
          className="form-input w-full text-sm"
          placeholder="Notas adicionales sobre este pedido..."
        />
      </div>
    </div>
  );
}
