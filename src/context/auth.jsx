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
                .from("users_profiles")
                .select("id")
                .eq("id", user.id)
                .maybeSingle();

              if (!exists) {
                await supabase.from("users_profiles").insert([
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
        .from("users_profiles")
        .select("id, nombre, rol_id, email, roles(nombre)")
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
      {/* 🔵 BOTONERA PROVISIONAL DE CAMBIO DE ROL */}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
