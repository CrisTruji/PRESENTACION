// src/features/portal-empleado/components/MisDocumentos.jsx
// Vista empleado: ver y descargar sus documentos por categoría (solo lectura)
import React, { useState } from "react";
import {
  FolderOpen, FileText, Download, Loader2, AlertCircle, ExternalLink,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getEmpleadoDocumentos } from "@/features/employees/services/empleadosService";

const AREAS_ORDEN = ["Personales", "Laborales", "SST", "Dotación"];

function agruparPorArea(documentos) {
  const grupos = {};
  for (const doc of documentos) {
    const area = doc.area ?? "Otros";
    if (!grupos[area]) grupos[area] = [];
    grupos[area].push(doc);
  }
  // Ordenar: áreas conocidas primero, luego el resto
  const ordenados = {};
  for (const area of AREAS_ORDEN) {
    if (grupos[area]) ordenados[area] = grupos[area];
  }
  for (const area of Object.keys(grupos)) {
    if (!ordenados[area]) ordenados[area] = grupos[area];
  }
  return ordenados;
}

function nombreAmigable(doc) {
  // nombre_archivo puede ser un array (texto[] en PG)
  const arr = doc.nombre_archivo;
  if (Array.isArray(arr) && arr.length > 0) return arr[arr.length - 1];
  if (typeof arr === "string") return arr;
  return doc.tipo_documento ?? "Documento";
}

export default function MisDocumentos({ empleadoId }) {
  const [areaActiva, setAreaActiva] = useState(null);

  const { data: res, isLoading, error } = useQuery({
    queryKey: ["mis-documentos", empleadoId],
    queryFn: () => getEmpleadoDocumentos(empleadoId),
    enabled: !!empleadoId,
    staleTime: 1000 * 60 * 10,
    select: (result) => result.data ?? [],
  });

  const documentos = res ?? [];
  const grupos = agruparPorArea(documentos);
  const areas = Object.keys(grupos);
  const areaSeleccionada = areaActiva ?? areas[0] ?? null;
  const docsActivos = areaSeleccionada ? (grupos[areaSeleccionada] ?? []) : [];

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
        <p className="text-muted text-sm">Error cargando documentos. Intenta nuevamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">Mis Documentos</h2>
        <p className="text-sm text-muted mt-0.5">
          Consulta y descarga los documentos de tu expediente. Solo el área de Talento Humano puede subir o modificar documentos.
        </p>
      </div>

      {documentos.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen size={40} className="mx-auto mb-4 text-muted" />
          <h3 className="font-semibold text-primary mb-2">Sin documentos</h3>
          <p className="text-muted text-sm">
            Aún no tienes documentos en tu expediente. Contacta a Talento Humano si crees que esto es un error.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Sidebar de áreas */}
          <div className="sm:w-48 flex-shrink-0">
            <div className="card overflow-hidden">
              {areas.map((area) => (
                <button
                  key={area}
                  onClick={() => setAreaActiva(area)}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors border-b border-base last:border-b-0 ${
                    (areaActiva ?? areas[0]) === area
                      ? "bg-primary/5 text-primary font-medium"
                      : "text-secondary hover:bg-hover"
                  }`}
                >
                  <span>{area}</span>
                  <span className="text-xs text-muted ml-2 flex-shrink-0">{grupos[area].length}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lista de documentos */}
          <div className="flex-1 min-w-0">
            {docsActivos.length === 0 ? (
              <div className="card p-8 text-center">
                <FileText size={28} className="mx-auto mb-3 text-muted" />
                <p className="text-muted text-sm">Sin documentos en esta categoría.</p>
              </div>
            ) : (
              <div className="card divide-y divide-base">
                {docsActivos.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-4 hover:bg-hover transition-colors"
                  >
                    <div className="w-9 h-9 rounded-base bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-primary text-sm truncate">
                        {nombreAmigable(doc)}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {doc.tipo_documento ?? "Documento"}
                        {doc.created_at ? ` · ${new Date(doc.created_at).toLocaleDateString("es-CO")}` : ""}
                      </p>
                    </div>

                    {doc.archivo_path && (
                      <a
                        href={doc.archivo_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm flex items-center gap-1.5 flex-shrink-0"
                        title="Ver / Descargar"
                      >
                        <ExternalLink size={13} />
                        Ver
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted">
        {documentos.length} documento(s) en total · Solo lectura
      </p>
    </div>
  );
}
