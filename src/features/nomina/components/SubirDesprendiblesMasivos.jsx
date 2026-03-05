// src/features/nomina/components/SubirDesprendiblesMasivos.jsx
// Sube un PDF masivo al servidor (Edge Function) que lo procesa server-side.
// Flujo: seleccionar período → soltar PDF → confirmar → procesar → resultados.
import { useState, useRef, useCallback } from "react";
import { supabase } from "@/shared/api";
import { useAuth } from "@/features/auth";

// ─── Helpers ────────────────────────────────────────────────────────────────

const PERIODO_DEFAULT = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
})();

function fmtPeriodo(p) {
  if (!p) return "";
  const [y, m] = p.split("-");
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${meses[parseInt(m, 10) - 1]} ${y}`;
}

function getPeriodos() {
  const list = [];
  const now = new Date();
  for (let i = -1; i <= 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    list.push(p);
  }
  return list;
}

// ─── Componente ─────────────────────────────────────────────────────────────

export default function SubirDesprendiblesMasivos() {
  const { session } = useAuth();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  // Período
  const [periodo, setPeriodo] = useState(PERIODO_DEFAULT);

  // Fases: idle | confirmando | subiendo | procesando | done | error
  const [fase, setFase] = useState("idle");

  // Info del PDF seleccionado (antes de procesar)
  const [pdfInfo, setPdfInfo] = useState(null); // { file, paginas }

  // Progreso de subida al storage
  const [progresoSubida, setProgresoSubida] = useState(0); // 0-100

  // Resultado final
  const [resultado, setResultado] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Leer página-count del PDF con pdf-lib (rápido, sin extraer texto) ──────
  const leerPDF = useCallback(async (file) => {
    try {
      const buf = await file.arrayBuffer();
      // Import dinámico: pdf-lib solo se carga cuando el rol nómina sube un PDF
      const { PDFDocument } = await import('pdf-lib');
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const paginas = doc.getPageCount();
      setPdfInfo({ file, paginas });
      setFase("confirmando");
    } catch (err) {
      alert(`No se pudo leer el archivo PDF: ${err.message}`);
    }
  }, []);

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type === "application/pdf") leerPDF(file);
    else alert("Solo se aceptan archivos PDF.");
  }, [leerPDF]);

  const onFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) leerPDF(file);
    e.target.value = "";
  }, [leerPDF]);

  // ── Procesar (subir a Storage → llamar Edge Function) ────────────────────
  const procesar = useCallback(async () => {
    if (!pdfInfo) return;
    const { file } = pdfInfo;

    try {
      // 1. Subir PDF completo a Storage (carpeta temporal)
      setFase("subiendo");
      setProgresoSubida(0);

      const uuid = crypto.randomUUID();
      const tempPath = `_upload_temp/${uuid}.pdf`;

      const { error: upErr } = await supabase.storage
        .from("desprendibles-nomina")
        .upload(tempPath, file, { contentType: "application/pdf", upsert: false });

      if (upErr) throw new Error(`Error subiendo PDF: ${upErr.message}`);
      setProgresoSubida(100);

      // 2. Llamar Edge Function — procesa todo server-side
      setFase("procesando");

      const { data, error: fnErr } = await supabase.functions.invoke(
        "procesar-desprendibles",
        {
          body: {
            storagePath: tempPath,
            periodo,
            subioPor: session?.user?.id ?? null,
          },
        }
      );

      if (fnErr) throw new Error(fnErr.message || "Error en el servidor");
      if (data?.error) throw new Error(data.error);

      setResultado({ ...data, periodo });
      setFase("done");
    } catch (err) {
      console.error("Error procesando:", err);
      setErrorMsg(err.message);
      setFase("error");
    }
  }, [pdfInfo, periodo, session]);

  // ── Reiniciar ─────────────────────────────────────────────────────────────
  const reiniciar = () => {
    setFase("idle");
    setPdfInfo(null);
    setResultado(null);
    setErrorMsg("");
    setProgresoSubida(0);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-xl font-bold text-primary">Subir Desprendibles Masivos</h1>
          <p className="text-sm text-secondary mt-0.5">
            Sube un PDF con todos los desprendibles — el servidor los distribuye automáticamente por empleado.
          </p>
        </div>
      </div>

      {/* ── FASE: IDLE ──────────────────────────────────────────────────── */}
      {fase === "idle" && (
        <div className="card max-w-2xl mx-auto space-y-6">
          {/* Selector de período */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Período de nómina
            </label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="input w-56"
            >
              {getPeriodos().map((p) => (
                <option key={p} value={p}>
                  {fmtPeriodo(p)} ({p})
                </option>
              ))}
            </select>
          </div>

          {/* Zona de carga */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
              ${dragging
                ? "border-[var(--color-primary)] bg-[var(--color-primary-alpha,rgba(59,130,246,0.06))]"
                : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
              }
            `}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onFileChange}
            />
            <svg className="mx-auto mb-3 text-muted" width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 13h6m-6 3h4m-1-9v4h4" />
            </svg>
            <p className="text-base font-medium text-primary">
              Arrastra el PDF aquí o haz clic para seleccionarlo
            </p>
            <p className="text-sm text-muted mt-1">
              PDF con todos los comprobantes de pago — un desprendible por página
            </p>
          </div>

          {/* Info cómo funciona */}
          <div className="rounded-lg bg-[var(--color-surface-2,var(--color-surface))] border border-[var(--color-border)] p-4 text-sm text-secondary space-y-1">
            <p className="font-medium text-primary mb-2">¿Cómo funciona?</p>
            <p>1. Selecciona el <strong>período</strong> al que corresponde la nómina.</p>
            <p>2. Sube el <strong>PDF completo</strong> con todos los desprendibles.</p>
            <p>3. El servidor detecta la cédula de cada página y la asocia al empleado.</p>
            <p>4. Cada empleado verá su desprendible en su portal inmediatamente.</p>
          </div>
        </div>
      )}

      {/* ── FASE: CONFIRMANDO ───────────────────────────────────────────── */}
      {fase === "confirmando" && pdfInfo && (
        <div className="card max-w-lg mx-auto space-y-5">
          {/* Resumen del PDF */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-[var(--color-surface-2,var(--color-surface))] border border-[var(--color-border)]">
              <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-[var(--color-primary)]">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-primary truncate">{pdfInfo.file.name}</p>
              <p className="text-sm text-secondary mt-0.5">
                {pdfInfo.paginas} páginas · {(pdfInfo.file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] p-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-secondary">Período:</span>
              <span className="font-medium text-primary">{fmtPeriodo(periodo)} ({periodo})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Páginas a procesar:</span>
              <span className="font-medium text-primary">{pdfInfo.paginas}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Tiempo estimado:</span>
              <span className="font-medium text-secondary">~{Math.ceil(pdfInfo.paginas / 10 * 3)} segundos</span>
            </div>
          </div>

          <p className="text-xs text-muted">
            El servidor identificará la cédula de cada página y subirá un PDF individual por empleado al portal.
          </p>

          <div className="flex gap-2">
            <button onClick={reiniciar} className="btn btn-outline flex-1">
              Cancelar
            </button>
            <button onClick={procesar} className="btn btn-primary flex-1">
              Procesar {pdfInfo.paginas} páginas
            </button>
          </div>
        </div>
      )}

      {/* ── FASE: SUBIENDO ──────────────────────────────────────────────── */}
      {fase === "subiendo" && (
        <div className="card max-w-lg mx-auto text-center space-y-4">
          <div className="spinner mx-auto scale-125" />
          <p className="text-base font-semibold text-primary">Subiendo PDF al servidor…</p>
          <div className="w-full bg-[var(--color-border)] rounded-full h-2.5">
            <div
              className="bg-[var(--color-primary)] h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progresoSubida}%` }}
            />
          </div>
          <p className="text-xs text-muted">
            {(pdfInfo?.file.size / 1024 / 1024).toFixed(1)} MB · No cierres esta pestaña.
          </p>
        </div>
      )}

      {/* ── FASE: PROCESANDO ────────────────────────────────────────────── */}
      {fase === "procesando" && (
        <div className="card max-w-lg mx-auto text-center space-y-5">
          {/* Animación de procesamiento */}
          <div className="relative mx-auto w-16 h-16">
            <div className="spinner absolute inset-0 scale-150" />
          </div>
          <div>
            <p className="text-base font-semibold text-primary">
              El servidor está procesando los desprendibles…
            </p>
            <p className="text-sm text-secondary mt-1">
              Identificando cédulas · Dividiendo páginas · Subiendo al portal
            </p>
          </div>

          {/* Estimación visual */}
          <div className="text-xs text-muted space-y-1">
            <p>📄 Extrayendo texto de {pdfInfo?.paginas} páginas</p>
            <p>✂️ Dividiendo PDF por empleado</p>
            <p>☁️ Subiendo a Supabase Storage</p>
            <p>🔗 Vinculando con portal del empleado</p>
          </div>

          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs text-yellow-600">
            No cierres ni recargues esta pestaña. El proceso puede tardar hasta{" "}
            {Math.ceil((pdfInfo?.paginas ?? 100) / 10 * 4)} segundos.
          </div>
        </div>
      )}

      {/* ── FASE: DONE ──────────────────────────────────────────────────── */}
      {fase === "done" && resultado && (
        <div className="max-w-lg mx-auto space-y-4">
          <div className="card border-l-4 border-green-500 flex items-start gap-3">
            <span className="text-2xl mt-0.5">✅</span>
            <div>
              <p className="font-semibold text-primary">
                {resultado.subidos} desprendibles subidos correctamente
              </p>
              <p className="text-sm text-secondary mt-0.5">
                Período <strong>{fmtPeriodo(resultado.periodo)}</strong> — los empleados ya pueden verlos en su portal.
              </p>
            </div>
          </div>

          <div className="card space-y-2 text-sm">
            <p className="font-medium text-primary mb-2">Resumen del proceso</p>
            <div className="flex justify-between">
              <span className="text-secondary">Total páginas procesadas</span>
              <span className="font-medium">{resultado.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Desprendibles subidos</span>
              <span className="font-medium text-green-600">{resultado.subidos}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Sin cédula detectada</span>
              <span className="font-medium text-yellow-600">{resultado.sinCC}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Cédula no registrada en BD</span>
              <span className="font-medium text-orange-500">{resultado.noEncontrados}</span>
            </div>
            {resultado.errores?.length > 0 && (
              <div className="flex justify-between">
                <span className="text-secondary">Errores de subida</span>
                <span className="font-medium text-red-500">{resultado.errores.length}</span>
              </div>
            )}
          </div>

          {resultado.errores?.length > 0 && (
            <div className="card border-l-4 border-red-400 text-sm space-y-1">
              <p className="font-medium text-red-600 mb-1">Errores:</p>
              {resultado.errores.map((e, i) => (
                <p key={i} className="text-secondary">
                  Pág. {e.pagina} — {e.nombre}: <span className="text-red-500">{e.error}</span>
                </p>
              ))}
            </div>
          )}

          <button onClick={reiniciar} className="btn btn-primary w-full">
            Subir otro PDF
          </button>
        </div>
      )}

      {/* ── FASE: ERROR ─────────────────────────────────────────────────── */}
      {fase === "error" && (
        <div className="max-w-lg mx-auto space-y-4">
          <div className="card border-l-4 border-red-500 flex items-start gap-3">
            <span className="text-2xl mt-0.5">❌</span>
            <div>
              <p className="font-semibold text-red-600">Error al procesar el PDF</p>
              <p className="text-sm text-secondary mt-1">{errorMsg}</p>
            </div>
          </div>
          <button onClick={reiniciar} className="btn btn-outline w-full">
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}
