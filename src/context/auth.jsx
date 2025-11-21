// src/context/auth.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { canRolePerform } from "../lib/permissions";

const AuthContext = createContext();

export function AuthProvider({ children }) {

  console.log("🟥 AUTH PROVIDER RENDER");

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roleName, setRoleName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      console.log("🔵 INIT AUTH LOAD");

      try {
        const { data, error } = await supabase.auth.getSession();
        console.log("🟣 getSession response:", data, error);

        const user = data?.session?.user ?? null;

        if (mounted) {
          setSession(user);
        }

        if (user) {
          console.log("🟢 fetchProfile for user:", user.id);
          await fetchProfile(user.id);
        }

      } catch (err) {
        console.error("❌ ERROR in load():", err);
      } finally {
        if (mounted) {
          console.log("🔴 FINISH AUTH LOAD");
          setLoading(false);
        }
      }
    }

    load();

    // AUTH LISTENER
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🟡 AUTH STATE CHANGE:", event, session);

        const user = session?.user ?? null;
        setSession(user);

        if (user) {
          console.log("🟢 fetching profile from listener:", user.id);
          await fetchProfile(user.id);
        } else {
          setProfile(null);
          setRoleName(null);
        }

        setLoading(false);
      }
    );

    // CLEANUP CORRECTO
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
      console.log("🧹 CLEANUP AUTH LISTENER");
    };
  }, []);

  // FETCH PROFILE
  async function fetchProfile(uid) {
  console.log("🔍 FETCH PROFILE START for uid:", uid);

  try {
    const { data, error } = await supabase
      .from("users_profiles")
      .select("id, nombre, rol_id, roles(nombre)")
      .eq("id", uid)
      .maybeSingle();

    console.log("📥 PROFILE QUERY RESULT:", data, error);

    if (error) throw error;

    if (!data) {
      console.log("⚪ No profile found");
      setProfile(null);
      setRoleName(null);
      return;
    }

    console.log("🟢 PROFILE FOUND:", data);

    setProfile(data);

    if (data?.roles?.nombre) {
      console.log("🟣 ROLE NAME FROM JOIN:", data.roles.nombre);
      setRoleName(data.roles.nombre);
    } else if (data?.rol_id) {
      const { data: rdata } = await supabase
        .from("roles")
        .select("nombre")
        .eq("id", data.rol_id)
        .maybeSingle();

      console.log("🟠 ROLE NAME FROM MANUAL LOOKUP:", rdata?.nombre);
      setRoleName(rdata?.nombre ?? null);
    } else {
      console.log("⚫ No role assigned");
      setRoleName(null);
    }
  } catch (err) {
    console.error("❌ fetchProfile error", err);
    setProfile(null);
    setRoleName(null);
  }

  console.log("🏁 FETCH PROFILE END");
}


  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email, password, nombre = "", roleId = null) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    const createdUser = data?.user ?? null;

    if (createdUser) {
      const insertPayload = {
        id: createdUser.id,
        nombre: nombre || "",
        rol_id: roleId,
      };

      const { pError } = await supabase
        .from("users_profiles")
        .insert([insertPayload]);

      if (pError) {
        alert("ERROR INSERTANDO PERFIL: " + pError.message);
      }
    }

    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRoleName(null);
  }

  function hasRole(name) {
    return !!roleName && roleName === name;
  }

  function canPerform(action) {
    return canRolePerform(roleName, action);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        roleName,
        loading,
        signIn,
        signUp,
        signOut,
        fetchProfile,
        hasRole,
        canPerform,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
