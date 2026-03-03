// src/features/nomina/components/PanelNomina.jsx
// Panel para rol: nomina – sube desprendibles y aprueba vacaciones
import React, { useState, useCallback, useRef } from "react";
import {
  DollarSign, Upload, CheckCircle, XCircle, Loader2,
  FileText, Users, AlertCircle, ChevronDown, ChevronUp,
  Calendar, Search, Check, X, Clock, FolderOpen,
} from "lucide-react";
import { useAuth } from "@/features/auth";
import {
  useEmpleadosConDesprendible,
  useEstadisticasPeriodo,
  useSubirDesprendibles,
  useHistorialPeriodos,
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

/**
 * Parsea el nombre del archivo para extraer cédula y período.
 * Formatos soportados (de mayor a menor prioridad):
 *   - desprendible-1234567890_2026-03.pdf   (con período)
 *   - 1234567890_2026-03.pdf                (sin prefijo, con período)
 *   - desprendible-1234567890.pdf           (sin período → usa periodoFallback)
 *   - desprendible_1234567890.pdf           (guión bajo)
 *   - 1234567890.pdf                        (solo cédula)
 *   - cualquier nombre con 8-12 dígitos consecutivos
 */
function parsearNombreArchivo(nombre, periodoFallback) {
  const sinExt = nombre.replace(/\.pdf$/i, "").trim();

  // 1️⃣ {cualquiercosa}{cedula}_{YYYY-MM}  — ej: desprendible-1029142426_2026-03
  const m1 = sinExt.match(/(\d{6,12})_(\d{4}-\d{2})/);
  if (m1) return { cedula: m1[1], periodo: m1[2] };

  // 2️⃣ desprendible[-_ ]{cedula}           — ej: desprendible-1029142426
  const m2 = sinExt.match(/desprendible[-_\s](\d{6,12})/i);
  if (m2) return { cedula: m2[1], periodo: periodoFallback };

  // 3️⃣ Archivo que es SOLO dígitos          — ej: 1029142426
  const m3 = sinExt.match(/^(\d{6,12})$/);
  if (m3) return { cedula: m3[1], periodo: periodoFallback };

  // 4️⃣ Cualquier secuencia de 8-12 dígitos en el nombre
  const m4 = sinExt.match(/\b(\d{8,12})\b/);
  if (m4) return { cedula: m4[1], periodo: periodoFallback };

  return null;
}

// ── Subcomponente: Zona de Carga ─────────────────────────────────────────────

function ZonaCarga({ periodo, onUploadComplete }) {
  const [dragging, setDragging] = useState(false);
  const [archivos, setArchivos] = useState([]); // [{file, cedula, periodo, empleadoId, estado}]
  const [uploading, setUploading] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const inputRef = useRef();
  const carpetaRef = useRef();
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

    setProcesando(true);
    const invalidos = [];
    const procesados = [];

    // Procesar en lotes de 20 para no saturar Supabase con 400+ consultas simultáneas
    const BATCH_SIZE = 20;
    for (let i = 0; i < pdfs.length; i += BATCH_SIZE) {
      const lote = pdfs.slice(i, i + BATCH_SIZE);
      const resultados = await Promise.all(
        lote.map(async (file) => {
          // Pasar el período seleccionado en UI como fallback
          const parsed = parsearNombreArchivo(file.name, periodo);
          if (!parsed) {
            invalidos.push(file.name);
            return { file, cedula: null, periodo: null, empleadoId: null, estado: "invalido" };
          }

          // maybeSingle evita el error 406 cuando no hay resultado
          const { data: emp } = await supabase
            .from("empleados")
            .select("id, nombres, apellidos")
            .eq("documento_identidad", parsed.cedula)
            .maybeSingle();

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
      procesados.push(...resultados);
    }

    setProcesando(false);

    if (invalidos.length) {
      notify.warning(
        `${invalidos.length} archivo(s) sin cédula reconocible en el nombre`
      );
    }

    setArchivos(procesados);
  }, [periodo]);

  // Extrae archivos de una entrada FileSystemEntry (recursivo para carpetas)
  async function leerEntrada(entry) {
    if (entry.isFile) {
      return new Promise((resolve) => entry.file(resolve));
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      return new Promise((resolve) => {
        const archivosDir = [];
        const leer = () =>
          reader.readEntries(async (entries) => {
            if (!entries.length) return resolve(archivosDir);
            const hijos = await Promise.all(entries.map(leerEntrada));
            archivosDir.push(...hijos.flat());
            leer(); // readEntries puede devolver en lotes
          });
        leer();
      });
    }
    return [];
  }

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragging(false);

    // Intentar leer como FileSystemEntry (soporta carpetas arrastradas)
    const items = Array.from(e.dataTransfer.items ?? []);
    if (items.length && items[0].webkitGetAsEntry) {
      const entradas = items.map((i) => i.webkitGetAsEntry()).filter(Boolean);
      const archivos = (await Promise.all(entradas.map(leerEntrada))).flat();
      if (archivos.length) { procesarArchivos(archivos); return; }
    }

    // Fallback: files planos (sin carpeta)
    procesarArchivos(e.dataTransfer.files);
  }, [procesarArchivos]);

  async function handleSubir() {
    const listos = archivos.filter((a) => a.estado === "listo");
    if (!listos.length) return;

    setUploading(true);
    setProgreso({ actual: 0, total: listos.length });
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
      setProgreso({ actual: exitosos + fallidos, total: listos.length });
    }

    setUploading(false);
    setProgreso({ actual: 0, total: 0 });
    qc.invalidateQueries({ queryKey: ["nomina-desprendibles", periodo] });
    qc.invalidateQueries({ queryKey: ["nomina-stats", periodo] });

    if (exitosos) notify.success(`✅ ${exitosos} desprendible(s) distribuido(s) correctamente`);
    if (fallidos) notify.error(`❌ ${fallidos} archivo(s) fallaron al subirse`);

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
      {/* Inputs ocultos */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => { procesarArchivos(e.target.files); e.target.value = ""; }}
      />
      {/* Input de carpeta — webkitdirectory asignado por DOM para garantizar compatibilidad React */}
      <input
        ref={(el) => {
          carpetaRef.current = el;
          if (el) el.webkitdirectory = true; // DOM API directa, funciona en todos los navegadores modernos
        }}
        type="file"
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => { procesarArchivos(e.target.files); e.target.value = ""; }}
      />

      {/* Zona drag & drop */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-base p-8 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-base"
        }`}
      >
        <Upload size={32} className={`mx-auto mb-3 ${dragging ? "text-primary" : "text-muted"}`} />
        <p className="font-medium text-primary text-sm mb-1">
          {dragging ? "Suelta aquí los archivos" : "Arrastra la carpeta o los PDFs aquí"}
        </p>
        <p className="text-xs text-muted mb-4">
          Formatos aceptados: <code className="bg-hover px-1 rounded">desprendible-{"{cedula}"}.pdf</code>
          {" · "}
          <code className="bg-hover px-1 rounded">{"{cedula}"}_2026-03.pdf</code>
          {" · "}
          <code className="bg-hover px-1 rounded">{"{cedula}"}.pdf</code>
        </p>

        {/* Botones de selección */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => carpetaRef.current?.click()}
            disabled={procesando || uploading}
            className="btn btn-primary btn-sm flex items-center gap-2"
          >
            <FolderOpen size={15} />
            Seleccionar carpeta
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={procesando || uploading}
            className="btn btn-outline btn-sm flex items-center gap-2"
          >
            <FileText size={15} />
            Seleccionar archivos
          </button>
        </div>

        {procesando && (
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted">
            <Loader2 size={13} className="animate-spin" />
            Identificando empleados…
          </div>
        )}
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

      {/* Barra de progreso de subida */}
      {uploading && progreso.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              Distribuyendo desprendibles…
            </span>
            <span className="font-medium text-primary">
              {progreso.actual} / {progreso.total}
            </span>
          </div>
          <div className="w-full h-2 bg-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.round((progreso.actual / progreso.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Botón subir */}
      {archivos.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted space-y-0.5">
            <p>
              <span className="text-success font-medium">{listos}</span> listos ·{" "}
              <span className="text-warning font-medium">
                {archivos.filter((a) => a.estado === "no_encontrado").length}
              </span>{" "}
              sin empleado ·{" "}
              <span className="text-error font-medium">
                {archivos.filter((a) => a.estado === "invalido").length}
              </span>{" "}
              inválidos
            </p>
          </div>
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

const FILTROS = [
  { key: "todos",      label: "Todos" },
  { key: "subidos",    label: "Subidos" },
  { key: "pendientes", label: "Pendientes" },
  { key: "no_leido",   label: "No leído" },
];

function TablaEmpleados({ periodo }) {
  const { data: empleados = [], isLoading } = useEmpleadosConDesprendible(periodo);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");

  // Aplicar búsqueda de texto
  const porTexto = empleados.filter((e) => {
    const q = busqueda.toLowerCase();
    return (
      !q ||
      e.nombres?.toLowerCase().includes(q) ||
      e.apellidos?.toLowerCase().includes(q) ||
      e.documento_identidad?.includes(q) ||
      e.cargo?.toLowerCase().includes(q)
    );
  });

  // Aplicar filtro de estado
  const filtrados = porTexto.filter((e) => {
    if (filtro === "subidos")    return e.tieneDesprendible;
    if (filtro === "pendientes") return !e.tieneDesprendible;
    if (filtro === "no_leido")   return e.tieneDesprendible && !e.descargado;
    return true; // "todos"
  });

  // Contadores para los chips
  const cSubidos    = porTexto.filter((e) => e.tieneDesprendible).length;
  const cPendientes = porTexto.filter((e) => !e.tieneDesprendible).length;
  const cNoLeido    = porTexto.filter((e) => e.tieneDesprendible && !e.descargado).length;

  const contadores = {
    todos: porTexto.length,
    subidos: cSubidos,
    pendientes: cPendientes,
    no_leido: cNoLeido,
  };

  if (isLoading) return (
    <div className="flex justify-center py-8">
      <Loader2 size={24} className="animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Buscar por nombre, cédula o cargo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="form-input pl-8 py-1.5 text-sm w-full"
        />
      </div>

      {/* Chips de filtro */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const count = contadores[f.key];
          const active = filtro === f.key;
          const colorClass =
            f.key === "subidos"    ? "text-success border-success/40 bg-success/10" :
            f.key === "pendientes" ? "text-warning border-warning/40 bg-warning/10" :
            f.key === "no_leido"   ? "text-primary border-primary/40 bg-primary/10" :
            "text-muted border-base bg-hover";
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all ${
                active
                  ? colorClass + " font-semibold shadow-sm"
                  : "text-muted border-base hover:bg-hover"
              }`}
            >
              {f.key === "subidos"    && <Check  size={10} />}
              {f.key === "pendientes" && <Clock  size={10} />}
              {f.key === "no_leido"   && <AlertCircle size={10} />}
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                active ? "bg-white/20" : "bg-hover"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-hover sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted">Empleado</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted">Cédula</th>
                <th className="text-center px-4 py-2 text-xs font-medium text-muted">Desprendible</th>
                <th className="text-center px-4 py-2 text-xs font-medium text-muted">Lectura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {filtrados.map((e) => (
                <tr key={e.id} className="hover:bg-hover transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-primary">{e.nombres} {e.apellidos}</p>
                    <p className="text-xs text-muted">{e.cargo}</p>
                  </td>
                  <td className="px-4 py-2.5 text-muted font-mono text-xs">
                    {e.documento_identidad}
                  </td>
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
                  <td className="px-4 py-2.5 text-center">
                    {!e.tieneDesprendible ? (
                      <span className="text-xs text-muted">—</span>
                    ) : e.descargado ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                        <CheckCircle size={10} /> Visto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-surface text-muted border border-base">
                        <AlertCircle size={10} /> No leído
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                    {busqueda || filtro !== "todos"
                      ? "No hay empleados con ese filtro"
                      : "No se encontraron empleados"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted text-right">
        {filtrados.length} empleado{filtrados.length !== 1 ? "s" : ""} mostrado{filtrados.length !== 1 ? "s" : ""}
      </p>
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

// ── Subcomponente: Calendario de historial por mes ───────────────────────────

function colorPorcentaje(p) {
  if (p === 0)   return { barra: "bg-base",    texto: "text-muted",   badge: "bg-base border-base" };
  if (p < 50)    return { barra: "bg-error",   texto: "text-error",   badge: "bg-error/10 border-error/30" };
  if (p < 80)    return { barra: "bg-warning", texto: "text-warning", badge: "bg-warning/10 border-warning/30" };
  return         { barra: "bg-success",         texto: "text-success", badge: "bg-success/10 border-success/30" };
}

function CalendarioHistorial({ periodoActivo, onSeleccionar }) {
  const { data: historial = [], isLoading } = useHistorialPeriodos(13);

  if (isLoading) return (
    <div className="flex gap-1 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-20 h-20 rounded-base bg-hover animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-2 min-w-max">
        {[...historial].reverse().map((mes) => {
          const [anio, numMes] = mes.periodo.split("-");
          const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
          const nombreMes = meses[parseInt(numMes, 10) - 1];
          const esMesActivo = mes.periodo === periodoActivo;
          const col = colorPorcentaje(mes.porcentaje);

          return (
            <button
              key={mes.periodo}
              onClick={() => onSeleccionar(mes.periodo)}
              className={`flex-shrink-0 w-[74px] rounded-base border p-2.5 text-left transition-all hover:scale-[1.03] ${
                esMesActivo
                  ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                  : "border-base bg-surface hover:bg-hover"
              }`}
            >
              {/* Nombre del mes */}
              <p className={`text-[11px] font-semibold leading-tight ${esMesActivo ? "text-primary" : "text-primary"}`}>
                {nombreMes}
              </p>
              <p className="text-[10px] text-muted leading-tight mb-2">{anio}</p>

              {/* Mini barra de progreso */}
              <div className="w-full h-1.5 rounded-full bg-hover mb-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${col.barra}`}
                  style={{ width: `${mes.porcentaje}%` }}
                />
              </div>

              {/* Porcentaje */}
              <p className={`text-[12px] font-bold leading-none ${col.texto}`}>
                {mes.porcentaje}%
              </p>
              <p className="text-[9px] text-muted leading-tight mt-0.5">
                {mes.cantidad}/{mes.total}
              </p>
            </button>
          );
        })}
      </div>
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

        {/* Historial de períodos — calendario de meses */}
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-muted" />
              <span className="text-sm font-semibold text-primary">Historial de períodos</span>
              <span className="text-xs text-muted">· últimos 13 meses</span>
            </div>
            {/* Selector manual por si se quiere ir a un mes más antiguo */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted">Ir a:</span>
              <input
                type="month"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="form-input py-1 text-xs w-auto"
              />
            </div>
          </div>
          <CalendarioHistorial periodoActivo={periodo} onSeleccionar={setPeriodo} />
        </div>

        {/* Resumen del período seleccionado */}
        {stats && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 px-1">
            <span className="text-sm font-semibold text-primary">{formatPeriodo(periodo)}</span>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success inline-block" />
                <span className="text-muted">{stats.conDesprendible} subidos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warning inline-block" />
                <span className="text-muted">{stats.sinDesprendible} pendientes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-primary">{stats.porcentaje}%</span>
                <span className="text-muted">cobertura</span>
              </div>
            </div>
            {stats.total > 0 && (
              <div className="sm:ml-auto w-full sm:w-40">
                <div className="w-full h-1.5 bg-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all duration-500"
                    style={{ width: `${stats.porcentaje}%` }}
                  />
                </div>
              </div>
            )}
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
