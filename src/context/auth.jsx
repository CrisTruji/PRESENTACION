import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roleName, setRoleName] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fake role (DEV ONLY)
  const [fakeRole, setFakeRole] = useState(null);
  const [showRoleRouter, setShowRoleRouter] = useState(true);

  // =====================================================
  // 🟢 INIT AUTH (session + events)
  // =====================================================
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      console.log("🚀 AUTH INIT");

      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("❌ getSession error:", error);

      const currentSession = data?.session ?? null;

      if (!mounted) return;

      setSession(currentSession);

     try {
  if (currentSession?.user) {
    await fetchOrCreateProfile(currentSession.user);
  }
} catch (e) {
  console.error("❌ initAuth error:", e);
} finally {
  setLoading(false);
}

    }

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("🔔 AUTH EVENT:", event);

        if (!mounted) return;

        setSession(newSession);

        if (newSession?.user) {
          await fetchOrCreateProfile(newSession.user);
        } else {
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

  // =====================================================
  // 🟢 FETCH / CREATE PROFILE
  // =====================================================
  async function fetchOrCreateProfile(user) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, roles(nombre)")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Si no existe profile → crear
      if (!data) {
        console.log("🆕 Creando profile");

        const { error: insertError } = await supabase.from("profiles").insert([
          {
            id: user.id,
            nombre: user.email?.split("@")[0] ?? "",
            email: user.email,
            rol: null,
          },
        ]);

        if (insertError) throw insertError;

        setProfile(null);
        setRoleName(null);
        return;
      }

      setProfile(data);
      setRoleName(data?.roles?.nombre ?? null);
    } catch (err) {
      console.error("❌ fetchOrCreateProfile error:", err);
      setProfile(null);
      setRoleName(null);
    }
  }

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
    setProfile(null);
    setRoleName(null);
    setFakeRole(null);
  }

  // =====================================================
  // 🟣 FAKE ROLE (solo navegación)
  // =====================================================
  function fakeSetRole(role) {
    console.log("🟣 Fake role:", role);
    setFakeRole(role);
  }

  const effectiveRole = fakeRole ?? roleName;

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
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

      {/* PANEL DEV DE ROLES */}
      {process.env.NODE_ENV !== "production" &&
        session &&
        showRoleRouter && (
          <div
            style={{
              position: "fixed",
              bottom: 20,
              right: 20,
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: "#fff",
                padding: 12,
                borderRadius: 8,
                boxShadow: "0 2px 10px rgba(0,0,0,.2)",
              }}
            >
              <strong>Rol activo:</strong> {effectiveRole || "sin rol"}
              <div style={{ marginTop: 8 }}>
                {[
                  "administrador",
                  "jefe_de_planta",
                  "jefe_de_compras",
                  "auxiliar_de_compras",
                  "almacenista",
                  "usuario",
                ].map((r) => (
                  <button
                    key={r}
                    onClick={() => fakeSetRole(r)}
                    style={{ margin: 4 }}
                  >
                    {r}
                  </button>
                ))}
                <button onClick={() => fakeSetRole(null)}>
                  Rol real
                </button>
              </div>
            </div>
          </div>
        )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}
