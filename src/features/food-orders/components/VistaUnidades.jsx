// ========================================
// VistaUnidades - Tab: consolidado por unidad
// Muestra pedidos por unidad con filtro de unidad individual
// ========================================

import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { usePedidosPorFecha } from '../hooks/usePedidos';
import { useConsolidadoStore } from '../store/useConsolidadoStore';
import { ETIQUETAS_ESTADO_PEDIDO } from '@/shared/types/menu';

export default function VistaUnidades() {
  const { filtroFecha, filtroServicio, filtroUnidad } = useConsolidadoStore();
  const { data: pedidos, isLoading } = usePedidosPorFecha(filtroFecha, filtroServicio);

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="spinner spinner-sm mx-auto"></div>
        <p className="mt-3 text-sm text-text-muted">Cargando pedidos...</p>
      </div>
    );
  }

  if (!pedidos || pedidos.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text-muted">No hay pedidos para esta fecha y servicio</p>
      </div>
    );
  }

  // Filter by unit if one is selected
  const pedidosFiltrados = filtroUnidad
    ? pedidos.filter((p) => p.operacion_id === filtroUnidad)
    : pedidos;

  if (pedidosFiltrados.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-text-muted">Esta unidad no tiene pedidos para la fecha y servicio seleccionados</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <table className="table w-full">
        <thead>
          <tr>
            <th className="table-header">Unidad</th>
            <th className="table-header text-center">Estado</th>
            <th className="table-header text-center">Hora Envío</th>
            <th className="table-header text-center">En Hora</th>
            <th className="table-header">Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {pedidosFiltrados.map((pedido) => (
            <tr
              key={pedido.id}
              className="hover:bg-bg-surface transition-colors"
            >
              <td className="table-cell">
                <div className="font-semibold text-primary text-sm">
                  {pedido.operaciones?.nombre || 'Unidad'}
                </div>
                <div className="text-xs text-text-muted">
                  {pedido.operaciones?.codigo}
                </div>
              </td>
              <td className="table-cell text-center">
                <span className={`badge text-xs ${
                  pedido.estado === 'enviado' ? 'badge-success' :
                  pedido.estado === 'consolidado' ? 'badge-primary' :
                  pedido.estado === 'borrador' ? 'badge-warning' :
                  'badge-secondary'
                }`}>
                  {ETIQUETAS_ESTADO_PEDIDO[pedido.estado] || pedido.estado}
                </span>
              </td>
              <td className="table-cell text-center text-text-muted text-xs font-mono">
                {pedido.hora_envio
                  ? new Date(pedido.hora_envio).toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </td>
              <td className="table-cell text-center">
                {pedido.hora_envio ? (
                  pedido.enviado_en_hora ? (
                    <span className="text-success text-xs font-semibold flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Sí
                    </span>
                  ) : (
                    <span className="text-error text-xs font-semibold flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Tardío
                    </span>
                  )
                ) : (
                  <span className="text-text-muted text-xs">—</span>
                )}
              </td>
              <td className="table-cell text-xs text-text-muted truncate max-w-[200px]">
                {pedido.observaciones || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
