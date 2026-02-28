// src/features/portal-empleado/components/Desprendibles.jsx
// Vista del empleado: ver y descargar sus desprendibles de pago
import React from "react";
import { FileText, Download, CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";
import { useDesprendibles, useDescargarDesprendible } from "../hooks/useDesprendibles";

function formatPeriodo(periodo) {
  if (!periodo) return "";
  const [anio, mes] = periodo.split("-");
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return `${meses[parseInt(mes, 10) - 1] ?? mes} ${anio}`;
}

export default function Desprendibles({ empleadoId }) {
  const { data: desprendibles = [], isLoading, error } = useDesprendibles(empleadoId);
  const descargar = useDescargarDesprendible();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-error" />
        <p className="text-muted text-sm">Error cargando desprendibles. Intenta nuevamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">Desprendibles de Pago</h2>
        <p className="text-sm text-muted mt-1">
          Aquí puedes ver y descargar tus desprendibles de nómina.
        </p>
      </div>

      {desprendibles.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={40} className="mx-auto mb-4 text-muted" />
          <h3 className="font-semibold text-primary mb-2">Sin desprendibles disponibles</h3>
          <p className="text-muted text-sm">
            Cuando el área de nómina suba tus desprendibles, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-base">
          {desprendibles.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between p-4 hover:bg-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-base flex items-center justify-center flex-shrink-0 ${
                    d.descargado ? "bg-success/10" : "bg-primary/10"
                  }`}
                >
                  <FileText
                    size={18}
                    className={d.descargado ? "text-success" : "text-primary"}
                  />
                </div>
                <div>
                  <p className="font-medium text-primary text-sm">
                    {formatPeriodo(d.periodo)}
                  </p>
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                    {d.descargado ? (
                      <>
                        <CheckCircle size={11} className="text-success" />
                        Descargado
                      </>
                    ) : (
                      <>
                        <Clock size={11} />
                        Pendiente de descarga
                      </>
                    )}
                  </p>
                </div>
                {!d.descargado && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    Nuevo
                  </span>
                )}
              </div>

              <button
                onClick={() =>
                  descargar.mutate({
                    id: d.id,
                    archivoPath: d.archivo_path,
                    empleadoId,
                  })
                }
                disabled={descargar.isPending}
                className="btn btn-outline btn-sm flex items-center gap-1.5"
                title="Descargar PDF"
              >
                {descargar.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Descargar
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        {desprendibles.length > 0 &&
          `${desprendibles.filter((d) => !d.descargado).length} sin descargar · ${desprendibles.length} en total`}
      </p>
    </div>
  );
}
