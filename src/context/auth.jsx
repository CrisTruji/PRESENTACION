import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from '@/shared/api';

const DEBUG_AUTH = import.meta.env.VITE_DEBUG_AUTH === "true";

function debug(...args) {
  if (DEBUG_AUTH) {
    console.log(...args);
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [roleName, setRoleName] = useState(null);
  const [loading, setLoading] = useState(true);

  // DEV / SIMULACIÓN
  const [fakeRole, setFakeRole] = useState(null);
  const [showRoleRouter, setShowRoleRouter] = useState(true);

  // =====================================================
  // 🟢 AUTH → SOLO EVENTOS + JWT (SIN DB)
  // =====================================================
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        debug("🔔 AUTH EVENT:", event);

        setSession(session);

        if (session?.access_token) {
          try {
            const payload = JSON.parse(
              atob(session.access_token.split(".")[1])
            );

            debug("🟣 JWT PAYLOAD:", payload);

            setRoleName(payload.role ?? null);
          } catch (e) {
            console.error("❌ Error decodificando JWT:", e);
            setRoleName(null);
          }
        } else {
          setRoleName(null);
          setFakeRole(null);
        }

        setLoading(false);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // =====================================================
  // 🟢 AUTH ACTIONS
  // =====================================================
  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setRoleName(null);
    setFakeRole(null);
  }

  // =====================================================
  // 🟣 FAKE ROLE (SOLO DEV / UI)
  // =====================================================
  function fakeSetRole(role) {
    debug("🟣 Fake role:", role);
    setFakeRole(role);
  }

  const effectiveRole = fakeRole ?? roleName;

  // =====================================================
  // 🎨 UI (DEV PANEL)
  // =====================================================
  const roles = [
    "administrador",
    "jefe_de_planta",
    "jefe_de_compras",
    "auxiliar_de_compras",
    "almacenista",
    "usuario",
    // Nuevos roles - Sistema de pedidos de servicios
    "chef",
    "supervisor_produccion",
    "coordinador_unidad",
  ];

  const formatRoleName = (role) =>
    role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        roleName: effectiveRole,
        realRoleName: roleName,
        loading,
        signIn,
        signUp,
        signOut,
        fakeRole,
        fakeSetRole,
        showRoleRouter,
        setShowRoleRouter,
      }}
    >
      {children}

      {/* ================================================= */}
      {/* 🛠️ DEV PANEL */}
      {/* ================================================= */}
      {process.env.NODE_ENV !== "production" && session && (
        <div className="fixed bottom-4 right-4 z-[9999] font-sans">
          {showRoleRouter ? (
            <div className="bg-surface border border-base rounded-card p-3 w-64 shadow-card">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="text-xs font-semibold text-primary">
                    Rol:
                  </div>
                  <div className="text-xs text-secondary">
                    {effectiveRole
                      ? formatRoleName(effectiveRole)
                      : "Sin rol"}
                  </div>
                </div>
                <button
                  onClick={() => setShowRoleRouter(false)}
                  className="text-muted hover:text-primary transition-colors"
                  aria-label="Cerrar panel"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => fakeSetRole(r)}
                    className={`text-xs py-1.5 px-2 rounded-base transition-all ${
                      r === effectiveRole
                        ? "btn-primary"
                        : "btn-outline"
                    }`}
                  >
                    {formatRoleName(r)}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fakeSetRole(null)}
                className={`w-full py-2 rounded-base text-xs font-medium transition-colors ${
                  fakeRole
                    ? "bg-error hover:bg-error/90 text-white"
                    : "bg-primary hover:bg-primary-hover text-white"
                }`}
              >
                {fakeRole ? "Restaurar rol real" : "Rol real"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowRoleRouter(true)}
              className="btn btn-primary !w-10 !h-10 !p-0 rounded-full flex items-center justify-center text-base"
              aria-label="Abrir panel de desarrollo"
            >
              🛠️
            </button>
          )}
        </div>
      )}
    </AuthContext.Provider>
  );
}

// =====================================================
// 🪝 HOOK
// =====================================================
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}