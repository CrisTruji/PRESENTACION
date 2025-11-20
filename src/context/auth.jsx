// src/context/auth.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ======================
  //  CARGAR SESIÓN INICIAL
  // ======================
  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      console.log("Obteniendo sesión...");
      const { data, error } = await supabase.auth.getSession();

      console.log("DATA:", data);
      console.log("ERROR:", error);

      const user = data?.session?.user ?? null;

      if (!mounted) return;

      setSession(user);

      if (user) await fetchProfile(user.id);

      setLoading(false);
    }

    loadSession();

    // =====================================
    //  ESCUCHAR CAMBIOS DE AUTENTICACIÓN
    // =====================================
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;

        setSession(user);

        if (user) await fetchProfile(user.id);
        else setProfile(null);
      }
    );

    // cleanup
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // ======================
  //    FETCH PROFILE
  // ======================
  async function fetchProfile(uid) {
    try {
      const { data, error } = await supabase
        .from("users_profiles")
        .select("id, nombre, rol_id")
        .eq("id", uid)
        .maybeSingle();

      if (error) throw error;

      setProfile(data ?? null);
    } catch (err) {
      console.error("fetchProfile error", err);
      setProfile(null);
    }
  }

  // ======================
  //        SIGN IN
  // ======================
  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  // ======================
  //        SIGN UP
  // ======================
  async function signUp(email, password, nombre = "") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    const createdUser = data?.user ?? null;

    if (createdUser) {
      try {
        const { error: pError } = await supabase
          .from("users_profiles")
          .insert([
            {
              id: createdUser.id,
              nombre: nombre || "",
              rol_id: null,
            },
          ]);

        if (pError) console.warn("No se pudo insertar users_profiles:", pError);
        else await fetchProfile(createdUser.id);
      } catch (err) {
        console.warn("create profile error", err);
      }
    }

    return data;
  }

  // ======================
  //        SIGN OUT
  // ======================
  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const waitingForRole = !!session && profile && profile.rol_id === null;

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        waitingForRole,
        signIn,
        signUp,
        signOut,
        fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
