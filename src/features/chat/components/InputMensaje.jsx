// ========================================
// InputMensaje — Textarea con adjuntar archivos al estilo WhatsApp
// Enter envía texto, Shift+Enter hace salto de línea
// El botón de clip abre selector de archivos (imágenes, PDF, docs, etc.)
// ========================================
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, FileText, Image } from 'lucide-react';
import { supabase } from '@/shared/api';
import { useAuth } from '@/features/auth';

// ── Helpers ──────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function esImagen(file) {
  return file.type.startsWith('image/');
}

// Preview compacto del archivo adjunto seleccionado (antes de enviar)
function ArchivoPreview({ archivo, onQuitar }) {
  const imagen = esImagen(archivo);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (imagen) {
      const url = URL.createObjectURL(archivo);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [archivo, imagen]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 12px', margin: '0 16px 8px',
      background: 'var(--color-bg-app)', borderRadius: '12px',
      border: '1px solid var(--color-border)',
    }}>
      {imagen && previewUrl ? (
        <img src={previewUrl} alt="preview" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={20} color="white" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '500', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {archivo.name}
        </p>
        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
          {formatBytes(archivo.size)}
        </p>
      </div>
      <button onClick={onQuitar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px', display: 'flex', borderRadius: '50%' }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────

export default function InputMensaje({ onEnviar, disabled, conversacionId }) {
  const { user } = useAuth();
  const [texto,        setTexto]        = useState('');
  const [archivo,      setArchivo]      = useState(null);
  const [subiendo,     setSubiendo]     = useState(false);
  const textareaRef  = useRef(null);
  const fileInputRef = useRef(null);

  // Autoajustar altura del textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [texto]);

  const handleSeleccionarArchivo = (e) => {
    const file = e.target.files?.[0];
    if (file) setArchivo(file);
    // Resetear input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = '';
  };

  const handleEnviar = async () => {
    const hayTexto   = texto.trim().length > 0;
    const hayArchivo = !!archivo;
    if ((!hayTexto && !hayArchivo) || disabled || subiendo) return;

    if (hayArchivo) {
      setSubiendo(true);
      try {
        // Subir archivo a Supabase Storage
        const ext      = archivo.name.split('.').pop();
        const ruta     = `chat/${conversacionId}/${user.id}_${Date.now()}.${ext}`;
        const { error: errUpload } = await supabase.storage
          .from('chat-archivos')
          .upload(ruta, archivo, { upsert: false });

        if (errUpload) throw errUpload;

        const { data: urlData } = supabase.storage
          .from('chat-archivos')
          .getPublicUrl(ruta);

        // El contenido del mensaje lleva metadatos del archivo en formato JSON
        // para que MensajeBurbuja pueda distinguir texto de archivo
        // Si hay texto, va dentro del mismo JSON del archivo
        // para que aparezcan juntos en una sola burbuja
        const contenidoArchivo = JSON.stringify({
          _tipo: 'archivo',
          nombre: archivo.name,
          tamanio: archivo.size,
          mimeType: archivo.type,
          url: urlData.publicUrl,
          caption: hayTexto ? texto.trim() : undefined,
        });

        await onEnviar(contenidoArchivo, 'archivo');
        setArchivo(null);
        setTexto('');
      } catch (err) {
        console.error('[Chat] Error subiendo archivo:', err);
        alert('No se pudo subir el archivo. Intenta de nuevo.');
      } finally {
        setSubiendo(false);
      }
    } else {
      onEnviar(texto.trim(), 'texto');
      setTexto('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  const puedeEnviar = (texto.trim() || archivo) && !disabled && !subiendo;

  return (
    <div style={{ flexShrink: 0, borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}>

      {/* Preview del archivo seleccionado */}
      {archivo && <ArchivoPreview archivo={archivo} onQuitar={() => setArchivo(null)} />}

      {/* Barra de input */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '10px 12px' }}>

        {/* Botón adjuntar */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || subiendo}
          title="Adjuntar archivo"
          style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
            background: archivo ? 'var(--color-primary)' : 'none',
            border: archivo ? 'none' : '1px solid var(--color-border)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: archivo ? 'white' : 'var(--color-text-muted)',
            transition: 'all 0.15s ease',
          }}
        >
          <Paperclip size={16} />
        </button>

        {/* Input de archivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          onChange={handleSeleccionarArchivo}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={subiendo ? 'Subiendo archivo…' : 'Escribe un mensaje…'}
          disabled={disabled || subiendo}
          rows={1}
          style={{
            flex: 1, resize: 'none', border: '1px solid var(--color-border)',
            borderRadius: '20px', padding: '8px 14px', fontSize: '0.875rem',
            background: 'var(--color-bg-app)', color: 'var(--color-text-primary)',
            outline: 'none', lineHeight: '1.5', maxHeight: '120px',
            overflowY: 'auto', fontFamily: 'inherit', transition: 'border-color 0.15s ease',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--color-primary)'; }}
          onBlur={(e)  => { e.target.style.borderColor = 'var(--color-border)'; }}
        />

        {/* Botón enviar */}
        <button
          onClick={handleEnviar}
          disabled={!puedeEnviar}
          style={{
            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
            background: puedeEnviar ? 'var(--color-primary)' : 'var(--color-border)',
            border: 'none', cursor: puedeEnviar ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
          aria-label="Enviar"
        >
          {subiendo
            ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            : <Send size={16} color="white" />
          }
        </button>
      </div>
    </div>
  );
}
