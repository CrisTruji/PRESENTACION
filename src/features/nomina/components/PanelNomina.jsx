// src/features/nomina/components/PanelNomina.jsx
// Panel para rol: nomina – sube desprendibles y aprueba vacaciones
import React, { useState, useCallback, useRef } from "react";
import {
  DollarSign, Upload, CheckCircle, XCircle, Loader2,
  FileText, Users, AlertCircle, ChevronDown, ChevronUp,
  Calendar, Search, Check, X, Clock,
} from "lucide-react";
import { useAuth } from "@/features/auth";
import {
  useEmpleadosConDesprendible,
  useEstadisticasPeriodo,
  useSubirDesprendibles,
} from "@/features/portal-empleado/hooks/useDesprendibles";
import notify from "@/shared/lib/notifier";
import { supabase } from "@/shared/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMesActual() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatPeriodo(periodo) {
  if (!periodo) return "";
  const [anio, mes] = periodo.split("-");
  const meses = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  return `${meses[parseInt(mes, 10) - 1] ?? mes} ${anio}`;
}

function parsearNombreArchivo(nombre) {
  // Esperado: {cedula}_{YYYY-MM}.pdf  ó  {cedula}_{YYYY-MM}_*.pdf
  const match = nombre.replace(".pdf", "").match(/^(\d+)_(\d{4}-\d{2})/);
  if (!match) return null;
  return { cedula: match[1], periodo: match[2] };
}

// ── Subcomponente: Zona de Carga ─────────────────────────────────────────────

function ZonaCarga({ periodo, onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [archivos, setArchivos] = useState([]); // [{file, cedula, periodo, empleadoId, estado}]
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();
  const { session } = useAuth();
  const qc = useQueryClient();

  const procesarArchivos = useCallback(async (files) => {
    const pdfs = Array.from(files).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    if (!pdfs.length) {
      notify.error("Solo se aceptan archivos PDF");
      return;
    }

    // Buscar empleados para validar cédulas
    const invalidos = [];
    const procesados = await Promise.all(
      pdfs.map(async (file) => {
        const parsed = parsearNombreArchivo(file.name);
        if (!parsed) {
          invalidos.push(file.name);
          return { file, cedula: null, periodo: null, empleadoId: null, estado: "invalido" };
        }

        const { data: emp } = await supabase
          .from("empleados")
          .select("id, nombres, apellidos")
          .eq("documento_identidad", parsed.cedula)
          .single();

        return {
          file,
          cedula: parsed.cedula,
          periodo: parsed.periodo || periodo,
          empleadoId: emp?.id ?? null,
          nombreEmpleado: emp ? `${emp.nombres} ${emp.apellidos}` : null,
          estado: emp ? "listo" : "no_encontrado",
        };
      })
    );

    if (invalidos.length) {
      notify.warning(`${invalidos.length} archivo(s) con nombre inválido (esperado: cedula_YYYY-MM.pdf)`);
    }

    setArchivos(procesados);
  }, [periodo]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    procesarArchivos(e.dataTransfer.files);
  }, [procesarArchivos]);

  async function handleSubir() {
  const listos = archivos.filter((a) => a.estado === "listo");
    if (!listos.length) return;

    setUploading(true);
    let exitosos = 0;
    let fallidos = 0;

    const actualizados = [...archivos];

    for (let i = 0; i < actualizados.length; i++) {
      const arch = actualizados[i];
      if (arch.estado !== "listo") continue;

      actualizados[i] = { ...arch, estado: "subiendo" };
      setArchivos([...actualizados]);

      try {
        const storagePath = `${arch.cedula}/${arch.periodo}.pdf`;

        const { error: storageError } = await supabase.storage
          .from("desprendibles-nomina")
          .upload(storagePath, arch.file, { contentType: "application/pdf", upsert: true });

        if (storageError) throw storageError;

        const { error: dbError } = await supabase
          .from("empleado_desprendibles")
          .upsert(
            {
              empleado_id: arch.empleadoId,
              periodo: arch.periodo,
              archivo_path: storagePath,
              descargado: false,
              descargado_at: null,
              subido_por: session?.user?.id,
            },
            { onConflict: "empleado_id,periodo" }
          );

        if (dbError) throw dbError;

        actualizados[i] = { ...actualizados[i], estado: "subido" };
        exitosos++;
      } catch (err) {
        console.error("Error subiendo:", arch.file.name, err);
        actualizados[i] = { ...actualizados[i], estado: "error" };
        fallidos++;
      }

      setArchivos([...actualizados]);
    }

    setUploading(false);
    qc.invalidateQueries({ queryKey: ["nomina-desprendibles", periodo] });
    qc.invalidateQueries({ queryKey: ["nomina-stats", periodo] });

    if (exitosos) notify.success(`${exitosos} desprendible(s) subido(s) correctamente`);
    if (fallidos) notify.error(`${fallidos} archivo(s) fallaron al subirse`);

    if (!fallidos) {
      setTimeout(() => { setArchivos([]); onUploadComplete?.(); }, 1500);
    }
  }

  const estadoIcon = {
    listo:        <CheckCircle size={14} className="text-success" />,
    no_encontrado:<AlertCircle size={14} className="text-warning" />,
    invalido:     <XCircle    size={14} className="text-error" />,
    subiendo:     <Loader2    size={14} className="animate-spin text-primary" />,
    subido:       <CheckCircle size={14} className="text-success" />,
    error:        <XCircle    size={14} className="text-error" />,
  };

  const listos = archivos.filter((a) => a.estado === "listo").length;

  return (
    <div className="space-y-4">
      {/* Zona drag & drop */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-base p-10 text-center cursor-pointer transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-base hover:border-primary/50 hover:bg-hover"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => procesarArchivos(e.target.files)}
        />
        <Upload size={32} className={`mx-auto mb-3 ${dragging ? "text-primary" : "text-muted"}`} />
        <p className="font-medium text-primary text-sm">
          {dragging ? "Suelta aquí los archivos" : "Arrastra PDFs o haz clic para seleccionar"}
        </p>
        <p className="text-xs text-muted mt-1">Formato esperado: cedula_YYYY-MM.pdf</p>
      </div>

      {/* Lista de archivos procesados */}
      {archivos.length > 0 && (
        <div className="card divide-y divide-base max-h-64 overflow-y-auto">
          {archivos.map((arch, i) => (
            <div key={i} className="flex items-center gap-3 p-3 text-sm">
              {estadoIcon[arch.estado]}
              <div className="flex-1 min-w-0">
                <p className="truncate text-primary font-medium">{arch.file.name}</p>
                <p className="text-xs text-muted">
                  {arch.estado === "no_encontrado" && "Cédula no encontrada en el sistema"}
                  {arch.estado === "invalido" && "Nombre de archivo inválido"}
                  {arch.estado === "listo" && (arch.nombreEmpleado ?? arch.cedula)}
                  {arch.estado === "subiendo" && "Subiendo..."}
                  {arch.estado === "subido" && "Subido correctamente"}
                  {arch.estado === "error" && "Error al subir"}
                </p>
              </div>
              {arch.periodo && (
                <span className="text-xs text-muted whitespace-nowrap">{formatPeriodo(arch.periodo)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botón subir */}
      {archivos.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">
            {listos} de {archivos.length} listo(s) para subir
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setArchivos([])}
              disabled={uploading}
              className="btn btn-outline btn-sm"
            >
              Limpiar
            </button>
            <button
              onClick={handleSubir}
              disabled={uploading || listos === 0}
              className="btn btn-primary btn-sm flex items-center gap-2"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Subir {listos > 0 ? `(${listos})` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subcomponente: Tabla de cobertura ────────────────────────────────────────

function TablaEmpleados({ periodo }) {
  const { data: empleados = [], isLoading } = useEmpleadosConDesprendible(periodo);
  const [busqueda, setBusqueda] = useState("");

  const filtrados = empleados.filter((e) => {
    const q = busqueda.toLowerCase();
    return (
      !q ||
      e.nombres?.toLowerCase().includes(q) ||
      e.apellidos?.toLowerCase().includes(q) ||
      e.documento_identidad?.includes(q)
    );
  });

  const con = filtrados.filter((e) => e.tieneDesprendible).length;

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar empleado..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="form-input pl-8 py-1.5 text-sm"
          />
        </div>
        <span className="text-xs text-muted whitespace-nowrap">
          {con}/{filtrados.length} con desprendible
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-hover sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted">Empleado</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted">Cédula</th>
                <th className="text-center px-4 py-2 text-xs font-medium text-muted">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {filtrados.map((e) => (
                <tr key={e.id} className="hover:bg-hover transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-primary">{e.nombres} {e.apellidos}</p>
                    <p className="text-xs text-muted">{e.cargo}</p>
                  </td>
                  <td className="px-4 py-2.5 text-muted font-mono text-xs">{e.documento_identidad}</td>
                  <td className="px-4 py-2.5 text-center">
                    {e.tieneDesprendible ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-success/10 text-success">
                        <Check size={10} /> Subido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-warning/10 text-warning">
                        <Clock size={10} /> Pendiente
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted text-sm">
                    No se encontraron empleados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponente: Aprobar Vacaciones ────────────────────────────────────────

function VacacionesPendientes() {
  const qc = useQueryClient();
  const { session } = useAuth();

  const { data: solicitudes = [], isLoading } = useQuery({
    queryKey: ["vacaciones-pendientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleado_vacaciones")
        .select(`
          id, tipo, fecha_inicio, fecha_fin, dias_solicitados, observaciones, created_at,
          empleados ( nombres, apellidos, documento_identidad, cargo )
        `)
        .eq("estado", "pendiente")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60,
  });

  const aprobar = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("empleado_vacaciones")
        .update({ estado: "aprobado", aprobado_por: session?.user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      notify.success("Solicitud aprobada");
      qc.invalidateQueries({ queryKey: ["vacaciones-pendientes"] });
    },
    onError: () => notify.error("Error al aprobar la solicitud"),
  });

  const rechazar = useMutation({
    mutationFn: async ({ id, motivo }) => {
      const { error } = await supabase
        .from("empleado_vacaciones")
        .update({ estado: "rechazado", motivo_rechazo: motivo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      notify.success("Solicitud rechazada");
      qc.invalidateQueries({ queryKey: ["vacaciones-pendientes"] });
    },
    onError: () => notify.error("Error al rechazar la solicitud"),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary" /></div>;

  if (!solicitudes.length) {
    return (
      <div className="card p-8 text-center">
        <CheckCircle size={32} className="mx-auto mb-3 text-success" />
        <p className="text-muted text-sm">No hay solicitudes de vacaciones pendientes.</p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-base">
      {solicitudes.map((s) => {
        const emp = s.empleados;
        return (
          <div key={s.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-primary text-sm">
                  {emp?.nombres} {emp?.apellidos}
                </p>
                <p className="text-xs text-muted">{emp?.cargo} · C.C. {emp?.documento_identidad}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs bg-warning/10 text-warning whitespace-nowrap">
                Pendiente
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-muted">Tipo</p>
                <p className="font-medium text-primary capitalize">{s.tipo ?? "Ordinarias"}</p>
              </div>
              <div>
                <p className="text-muted">Desde</p>
                <p className="font-medium text-primary">{s.fecha_inicio}</p>
              </div>
              <div>
                <p className="text-muted">Hasta</p>
                <p className="font-medium text-primary">{s.fecha_fin}</p>
              </div>
              <div>
                <p className="text-muted">Días solicitados</p>
                <p className="font-medium text-primary">{s.dias_solicitados ?? "—"}</p>
              </div>
            </div>

            {s.observaciones && (
              <p className="text-xs text-muted italic">"{s.observaciones}"</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  const motivo = window.prompt("Motivo del rechazo (opcional):");
                  rechazar.mutate({ id: s.id, motivo: motivo ?? "" });
                }}
                disabled={rechazar.isPending || aprobar.isPending}
                className="btn btn-outline btn-sm flex items-center gap-1.5 text-error border-error/30 hover:bg-error/5"
              >
                <X size={13} />
                Rechazar
              </button>
              <button
                onClick={() => aprobar.mutate(s.id)}
                disabled={aprobar.isPending || rechazar.isPending}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                {aprobar.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                Aprobar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PanelNomina() {
  const [periodo, setPeriodo] = useState(getMesActual);
  const [seccionAbierta, setSeccionAbierta] = useState("upload"); // "upload" | "tabla" | "vacaciones"
  const { data: stats } = useEstadisticasPeriodo(periodo);

  const toggle = (s) => setSeccionAbierta((prev) => (prev === s ? null : s));

  return (
    <div className="min-h-content bg-app">
      <div className="page-container">
        {/* Header */}
        <div className="section-header mb-6">
          <h1 className="section-title flex items-center gap-2">
            <DollarSign size={22} className="text-primary" />
            Panel de Nómina
          </h1>
          <p className="section-subtitle">
            Gestión de desprendibles y aprobación de vacaciones
          </p>
        </div>

        {/* Selector de período + stats */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted" />
            <label className="text-sm font-medium text-primary">Período:</label>
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="form-input py-1.5 text-sm w-auto"
            />
          </div>

          {stats && (
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
                <span className="text-muted">{stats.conDesprendible} subidos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" />
                <span className="text-muted">{stats.sinDesprendible} pendientes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-primary">{stats.porcentaje}%</span>
                <span className="text-muted">cobertura</span>
              </div>
            </div>
          )}
        </div>

        {/* Barra de progreso */}
        {stats && stats.total > 0 && (
          <div className="mb-6">
            <div className="w-full h-2 bg-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all duration-500"
                style={{ width: `${stats.porcentaje}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Sección: Subir desprendibles */}
          <div className="card overflow-hidden">
            <button
              onClick={() => toggle("upload")}
              className="w-full flex items-center justify-between p-4 hover:bg-hover transition-colors"
            >
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-primary" />
                <span className="font-semibold text-primary">Subir Desprendibles</span>
                <span className="text-xs text-muted">· {formatPeriodo(periodo)}</span>
              </div>
              {seccionAbierta === "upload" ? (
                <ChevronUp size={16} className="text-muted" />
              ) : (
                <ChevronDown size={16} className="text-muted" />
              )}
            </button>
            {seccionAbierta === "upload" && (
              <div className="p-4 border-t border-base">
                <ZonaCarga periodo={periodo} onUploadComplete={() => toggle("tabla")} />
              </div>
            )}
          </div>

          {/* Sección: Estado de empleados */}
          <div className="card overflow-hidden">
            <button
              onClick={() => toggle("tabla")}
              className="w-full flex items-center justify-between p-4 hover:bg-hover transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users size={18} className="text-primary" />
                <span className="font-semibold text-primary">Estado de Empleados</span>
                {stats && (
                  <span className="text-xs text-muted">· {stats.conDesprendible}/{stats.total} cubiertos</span>
                )}
              </div>
              {seccionAbierta === "tabla" ? (
                <ChevronUp size={16} className="text-muted" />
              ) : (
                <ChevronDown size={16} className="text-muted" />
              )}
            </button>
            {seccionAbierta === "tabla" && (
              <div className="p-4 border-t border-base">
                <TablaEmpleados periodo={periodo} />
              </div>
            )}
          </div>

          {/* Sección: Vacaciones pendientes */}
          <div className="card overflow-hidden">
            <button
              onClick={() => toggle("vacaciones")}
              className="w-full flex items-center justify-between p-4 hover:bg-hover transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-primary" />
                <span className="font-semibold text-primary">Solicitudes de Vacaciones</span>
              </div>
              {seccionAbierta === "vacaciones" ? (
                <ChevronUp size={16} className="text-muted" />
              ) : (
                <ChevronDown size={16} className="text-muted" />
              )}
            </button>
            {seccionAbierta === "vacaciones" && (
              <div className="p-4 border-t border-base">
                <VacacionesPendientes />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
