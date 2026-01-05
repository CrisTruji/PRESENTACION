import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const DEBUG_AUTH = import.meta.env.VITE_DEBUG_AUTH === "true";

function debug(...args) {
  if (DEBUG_AUTH) {
    debug(...args);
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
  const colors = {
    primary: "#4F46E5",
    secondary: "#0EA5E9",
    accent: "#F97316",
    dark: "#334155",
    light: "#F8FAFC",
    border: "#E2E8F0",
    danger: "#DC2626",
  };

  const roles = [
    "administrador",
    "jefe_de_planta",
    "jefe_de_compras",
    "auxiliar_de_compras",
    "almacenista",
    "usuario",
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
      {/* 🛠️ DEV PANEL*/}
      {/* ================================================= */}
      {process.env.NODE_ENV !== "production" && session && (
        <div
          style={{
            position: "fixed",
            bottom: "16px",
            right: "16px",
            zIndex: 9999,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {showRoleRouter ? (
            <div
              style={{
                background: "#fff",
                padding: "12px",
                borderRadius: "10px",
                width: "250px",
                border: `1px solid ${colors.border}`,
                boxShadow: "0 4px 20px rgba(0,0,0,.15)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <strong style={{ fontSize: "12px" }}>
                  Rol:{" "}
                  {effectiveRole
                    ? formatRoleName(effectiveRole)
                    : "Sin rol"}
                </strong>
                <button
                  onClick={() => setShowRoleRouter(false)}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2,1fr)",
                  gap: "6px",
                  marginBottom: "10px",
                }}
              >
                {roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => fakeSetRole(r)}
                    style={{
                      fontSize: "11px",
                      padding: "6px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      border:
                        r === effectiveRole
                          ? `1px solid ${colors.primary}`
                          : `1px solid ${colors.border}`,
                      background:
                        r === effectiveRole
                          ? colors.primary
                          : "white",
                      color:
                        r === effectiveRole ? "white" : colors.dark,
                    }}
                  >
                    {formatRoleName(r)}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fakeSetRole(null)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "none",
                  background: fakeRole
                    ? colors.danger
                    : colors.secondary,
                  color: "white",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                {fakeRole ? "Restaurar rol real" : "Rol real"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowRoleRouter(true)}
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "8px",
                background: colors.primary,
                color: "white",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
              }}
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
