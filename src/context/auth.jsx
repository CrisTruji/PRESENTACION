// src/context/auth.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roleName, setRoleName] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🟣 Fake role para desarrollo (sin tocar BD)
  const [fakeRole, setFakeRole] = useState(null);

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
      }}
    >
      {children}

{process.env.NODE_ENV !== "production" && session && (
  <div
    style={{
      position: "fixed",
      bottom: 20,
      right: 20,
      zIndex: 1000,
    }}
  >
    {/* Botón de control - siempre visible */}
    <button
      onClick={() => {
        const container = document.getElementById('fakeRoleSwitcher');
        if (container) {
          container.style.display = container.style.display === 'none' ? 'block' : 'none';
        }
      }}
      style={{
        position: "absolute",
        bottom: "0",
        right: "0",
        background: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: "50%",
        width: "40px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
        fontSize: "20px",
        zIndex: 1001,
        transition: "transform 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      title="Alternar panel de roles"
    >
      🔧
    </button>

    {/* Contenedor del switcher - inicialmente visible */}
    <div
      id="fakeRoleSwitcher"
      style={{
        background: "white",
        border: "2px solid #2563eb",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        maxWidth: "340px",
        marginBottom: "50px",
        transition: "all 0.3s ease",
      }}
    >
      {/* Header del switcher */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
      }}>
        <div style={{
          fontWeight: "bold",
          color: "#2563eb",
          fontSize: "14px",
        }}>
          🔧 Cambiar Rol (Desarrollo)
        </div>
        
        {/* Botón de cerrar dentro del panel */}
        <button
          onClick={() => {
            const container = document.getElementById('fakeRoleSwitcher');
            if (container) {
              container.style.display = 'none';
            }
          }}
          style={{
            background: "none",
            border: "none",
            color: "#6b7280",
            cursor: "pointer",
            fontSize: "18px",
            padding: "0",
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "4px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "none";
          }}
          title="Minimizar panel"
        >
          ×
        </button>
      </div>

      {/* Información del rol */}
      <div style={{
        fontSize: "0.75rem",
        color: "#6b7280",
        marginBottom: "16px",
        padding: "8px",
        background: "#f8fafc",
        borderRadius: "6px",
        border: "1px solid #e2e8f0",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Rol activo:</span>
          <strong style={{ color: "#1e293b" }}>
            {activeRole || "sin rol"}
          </strong>
        </div>
        <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>
          {fakeRole ? "Rol falso activo" : "Rol real de la base de datos"}
        </div>
      </div>

      {/* Botones de roles */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(2, 1fr)", 
        gap: "8px",
        marginBottom: "12px",
      }}>
        {[
          { id: "administrador", label: "Admin", emoji: "👑" },
          { id: "jefe_de_planta", label: "Jefe Planta", emoji: "🏭" },
          { id: "jefe_de_compras", label: "Jefe Compras", emoji: "💰" },
          { id: "auxiliar_de_compras", label: "Aux Compras", emoji: "🛒" },
          { id: "almacenista", label: "Almacenista", emoji: "📦" },
          { id: "usuario", label: "Usuario", emoji: "👤" },
        ].map((role) => (
          <button
            key={role.id}
            onClick={() => fakeSetRole(role.id)}
            style={{
              padding: "8px 10px",
              background: activeRole === role.id ? "#2563eb" : "#f1f5f9",
              color: activeRole === role.id ? "white" : "#334155",
              border: `1px solid ${activeRole === role.id ? "#2563eb" : "#cbd5e1"}`,
              borderRadius: "6px",
              fontSize: "0.75rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (activeRole !== role.id) {
                e.currentTarget.style.background = "#e2e8f0";
                e.currentTarget.style.borderColor = "#94a3b8";
              }
            }}
            onMouseLeave={(e) => {
              if (activeRole !== role.id) {
                e.currentTarget.style.background = "#f1f5f9";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }
            }}
          >
            <span>{role.emoji}</span>
            {role.label}
          </button>
        ))}
      </div>

      {/* Botón de restaurar */}
      <button
        onClick={() => fakeSetRole(null)}
        style={{
          padding: "10px",
          background: "#fef2f2",
          color: "#dc2626",
          border: "1px solid #fca5a5",
          borderRadius: "6px",
          fontSize: "0.75rem",
          cursor: "pointer",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          fontWeight: "500",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#fee2e2";
          e.currentTarget.style.borderColor = "#f87171";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#fef2f2";
          e.currentTarget.style.borderColor = "#fca5a5";
        }}
      >
        <span>↩️</span>
        Restaurar Rol Real
      </button>
    </div>
  </div>
)}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
