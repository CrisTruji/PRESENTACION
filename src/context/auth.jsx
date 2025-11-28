// src/context/auth.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // supabase session
  const [profile, setProfile] = useState(null); // users_profiles row
  const [roleName, setRoleName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      console.log("🔵 INIT AUTH LOAD");
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
        console.log("🟡 AUTH STATE CHANGE:", event);
        setSession(newSession);

        if (event === "SIGNED_IN") {
          const user = newSession?.user;
          if (user) {
            // crear perfil si no existe
            try {
              const { data: exists } = await supabase
                .from("users_profiles")
                .select("id")
                .eq("id", user.id)
                .maybeSingle();

              if (!exists) {
                const { error: insertError } = await supabase
                  .from("users_profiles")
                  .insert([{ id: user.id, nombre: user.email?.split("@")[0] ?? "", email: user.email, rol_id: null }]);
                if (insertError) console.error("❌ Error creando perfil (listener):", insertError);
                else console.log("🟢 Perfil creado por listener");
              }
            } catch (err) {
              console.error("❌ listener createProfile error:", err);
            }

            await fetchProfile(user.id);
          }
        }

        if (event === "SIGNED_OUT") {
          setProfile(null);
          setRoleName(null);
        }
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  async function fetchProfile(uid) {
    try {
      const { data, error } = await supabase
        .from("users_profiles")
        .select("id, nombre, rol_id, email, roles(nombre)")
        .eq("id", uid)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setProfile(null);
        setRoleName(null);
        return;
      }
      setProfile(data);
      setRoleName(data?.roles?.nombre ?? null);
    } catch (err) {
      console.error("❌ fetchProfile error:", err);
      setProfile(null);
      setRoleName(null);
    }
  }

  async function signUp(email, password, nombre = "") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // No insertamos perfil aquí (se crea en listener)
    return data;
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRoleName(null);
  }

  return (
    <AuthContext.Provider value={{ session, profile, roleName, loading, signIn, signUp, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
