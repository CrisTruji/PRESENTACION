// src/features/auth/components/WaitingRoleScreen.jsx
// Se muestra cuando el usuario tiene sesión activa pero aún no tiene rol asignado.
// Auto-refresca el JWT periódicamente; cuando el admin asigna el rol, redirige solo.
import React, { useEffect, useState, useCallback } from "react";
import { Shield, RefreshCw, LogOut, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/shared/api";
import { useAuth } from "../context/AuthContext";

const INTERVALO_REFRESH_SEG = 12; // cuántos segundos entre auto-refrescos

export default function WaitingRoleScreen() {
  const { signOut, user } = useAuth();
  const [intentos, setIntentos]     = useState(0);
  const [refresco, setRefresco]     = useState(false); // spinner del botón manual
  const [countdown, setCountdown]   = useState(INTERVALO_REFRESH_SEG);
  const [lastCheck, setLastCheck]   = useState(null);  // hora del último refresh

  // ── Función que pide un JWT nuevo ──────────────────────────────────────────
  const verificarRol = useCallback(async () => {
    setRefresco(true);
    try {
      await supabase.auth.refreshSession();
      // onAuthStateChange en AuthContext detectará el nuevo JWT y
      // actualizará roleName automáticamente → App.jsx enruta
      setLastCheck(new Date());
      setIntentos(prev => prev + 1);
    } catch (e) {
      console.warn("Error refrescando sesión:", e);
    } finally {
      setRefresco(false);
      setCountdown(INTERVALO_REFRESH_SEG);
    }
  }, []);

  // ── Auto-refresh periódico ─────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          verificarRol();
          return INTERVALO_REFRESH_SEG;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [verificarRol]);

  // ── Bloquear scroll del body ───────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  const horaUltimoCheck = lastCheck
    ? lastCheck.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className="fixed inset-0 bg-app flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md">
        <div className="card p-8">

          {/* ── Logo ── */}
          <div className="flex flex-col items-center mb-7">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-md"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-hover))" }}
            >
              H
            </div>
            <h1 className="text-lg font-bold text-primary">Healthy SC</h1>
            <p className="text-xs text-muted">Sistema corporativo · Verificando acceso</p>
          </div>

          {/* ── Estado ── */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 border border-warning/20 mb-4">
              <Clock size={13} className="text-warning" />
              <span className="text-xs font-medium text-warning">Rol pendiente de asignación</span>
            </div>
            <h2 className="text-xl font-bold text-primary mb-2">Tu cuenta está activa</h2>
            <p className="text-sm text-muted leading-relaxed">
              Tu sesión fue verificada correctamente, pero aún no tienes un rol asignado en el sistema.
              El administrador debe asignarte uno para continuar.
            </p>
          </div>

          {/* ── Pasos de estado ── */}
          <div className="space-y-2 mb-7">
            {/* Paso 1: login ok */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/15">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-success/15 flex-shrink-0">
                <CheckCircle size={16} className="text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Sesión iniciada</p>
                <p className="text-xs text-muted">{user?.email ?? "Usuario autenticado"}</p>
              </div>
            </div>

            {/* Paso 2: esperando rol */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 flex-shrink-0">
                {refresco
                  ? <Loader2 size={16} className="text-primary animate-spin" />
                  : <Shield size={16} className="text-primary" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary">Esperando asignación de rol</p>
                <p className="text-xs text-muted">
                  {horaUltimoCheck
                    ? `Última verificación: ${horaUltimoCheck}`
                    : "Verificando automáticamente..."}
                </p>
              </div>
              {/* Countdown badge */}
              <div className="flex-shrink-0 text-xs font-mono text-muted bg-surface border border-base rounded-full px-2 py-0.5">
                {countdown}s
              </div>
            </div>
          </div>

          {/* ── Botones de acción ── */}
          <div className="space-y-3">
            <button
              onClick={verificarRol}
              disabled={refresco}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              {refresco
                ? <><Loader2 size={15} className="animate-spin" /><span>Verificando...</span></>
                : <><RefreshCw size={15} /><span>Verificar ahora</span></>
              }
            </button>

            <button
              onClick={signOut}
              className="w-full btn btn-outline flex items-center justify-center gap-2 text-sm text-muted"
            >
              <LogOut size={15} />
              Cerrar sesión
            </button>
          </div>

          {/* ── Info de ayuda ── */}
          <div className="mt-6 pt-5 border-t border-base">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-surface border border-base">
              <AlertCircle size={15} className="text-muted flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-primary mb-1">¿Qué debo hacer?</p>
                <p className="text-xs text-muted leading-relaxed">
                  Contacta al administrador del sistema para que te asigne el acceso correspondiente.
                  Una vez asignado, esta pantalla se actualizará automáticamente
                  {intentos > 0 && ` (${intentos} verificacion${intentos !== 1 ? "es" : ""} realizadas)`}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
