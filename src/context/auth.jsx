// src/context/auth.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roleName, setRoleName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fakeRole, setFakeRole] = useState(null);
  const [showRoleRouter, setShowRoleRouter] = useState(true);

  // ================================================================
  // 🔵 INIT AUTH
  // ================================================================
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        const currentSession = data?.session ?? null;

        if (!mounted) return;

        setSession(currentSession);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        }
      } catch (err) {
        console.error("❌ ERROR init auth:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (event === "SIGNED_IN") {
          const user = newSession?.user;
          if (user) {
            // Crear perfil si no existe
            try {
              const { data: exists } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", user.id)
                .maybeSingle();

              if (!exists) {
                await supabase.from("profiles").insert([
                  {
                    id: user.id,
                    nombre: user.email?.split("@")[0] ?? "",
                    email: user.email,
                    rol_id: null,
                  },
                ]);
              }
            } catch (err) {
              console.error("❌ Error creando perfil:", err);
            }

            await fetchProfile(user.id);
          }
        }

        if (event === "SIGNED_OUT") {
          setProfile(null);
          setRoleName(null);
          setFakeRole(null);
        }
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // ================================================================
  // 🔵 LOAD PROFILE
  // ================================================================
  async function fetchProfile(uid) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, rol, email, roles(nombre)")
        .eq("id", uid)
        .maybeSingle();

      if (error) throw error;

      setProfile(data);
      setRoleName(data?.roles?.nombre ?? null);
    } catch (err) {
      console.error("❌ fetchProfile error:", err);
      setProfile(null);
      setRoleName(null);
    }
  }

  // ================================================================
  // 🔵 AUTH ACTIONS
  // ================================================================
  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async function signUp(email, password, nombre = "") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRoleName(null);
    setFakeRole(null);
  }

  // ================================================================
  // 🟣 FAKE ROLE SWITCHER — cambia el rol en caliente (solo front)
  // ================================================================
  function fakeSetRole(newRole) {
    console.log("🔄 Cambiando rol falso a:", newRole);
    setFakeRole(newRole);
  }

  // El rol REAL o el rol FAKE (si está activo)
  const activeRole = fakeRole ?? roleName;

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        roleName: activeRole,
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

      {/* 🔵 BOTONERA DE CAMBIO DE ROL - Solo para desarrollo */}
      {process.env.NODE_ENV !== "production" && session && showRoleRouter && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            background: "white",
            border: "2px solid #2563eb",
            borderRadius: "8px",
            padding: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            maxWidth: "320px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div style={{ fontWeight: "bold", color: "#2563eb" }}>
              🔧 Cambiar Rol (Desarrollo)
            </div>
            <button
              onClick={() => setShowRoleRouter(false)}
              style={{
                background: "transparent",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                padding: "2px 8px",
                fontSize: "0.7rem",
                color: "#6b7280",
                cursor: "pointer",
              }}
              title="Ocultar panel"
            >
              ✕
            </button>
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginBottom: "12px",
            }}
          >
            Rol activo: <strong>{activeRole || "sin rol"}</strong>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {[
              { id: "administrador", label: "Admin" },
              { id: "jefe_de_planta", label: "Jefe Planta" },
              { id: "jefe_de_compras", label: "Jefe Compras" },
              { id: "auxiliar_de_compras", label: "Aux Compras" },
              { id: "almacenista", label: "Almacenista" },
              { id: "usuario", label: "Usuario" },
            ].map((role) => (
              <button
                key={role.id}
                onClick={() => fakeSetRole(role.id)}
                style={{
                  padding: "6px 10px",
                  background: activeRole === role.id ? "#2563eb" : "#f3f4f6",
                  color: activeRole === role.id ? "white" : "#374151",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  minWidth: "80px",
                }}
              >
                {role.label}
              </button>
            ))}
            <button
              onClick={() => fakeSetRole(null)}
              style={{
                padding: "6px 10px",
                background: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fca5a5",
                borderRadius: "4px",
                fontSize: "0.75rem",
                cursor: "pointer",
                width: "100%",
                marginTop: "4px",
              }}
            >
              Restaurar Rol Real
            </button>
          </div>
        </div>
      )}

      {/* 🔵 BOTÓN PARA MOSTRAR EL ROLEROUTER CUANDO ESTÁ OCULTO */}
      {process.env.NODE_ENV !== "production" && session && !showRoleRouter && (
        <button
          onClick={() => setShowRoleRouter(true)}
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            cursor: "pointer",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
          }}
          title="Mostrar panel de roles"
        >
          🔧
        </button>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
