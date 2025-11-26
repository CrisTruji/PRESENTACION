// src/context/auth.jsx - VERSIÓN OPTIMIZADA
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile } from '../services/profiles';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // ESTADO SIMPLIFICADO: elimino user porque session.user ya lo tiene
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // roleName ahora es derivado, no necesita estado separado
  const roleName = profile?.rol || null;

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Obtener sesión inicial
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (session?.user) {
          await loadProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    try {
      // NO setLoading(true) aquí para evitar flashes de loading
      const profileData = await getProfile(userId);
      setProfile(profileData);
      console.log("✅ Perfil cargado:", { 
        usuario: profileData?.nombre, 
        rol: profileData?.rol 
      });
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      setProfile(null);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Los estados se limpiarán automáticamente por onAuthStateChange
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await loadProfile(session.user.id);
    }
  };

  const value = {
    // session ya incluye user, así que exponemos ambos por compatibilidad
    user: session?.user || null,
    session,
    profile,
    loading,
    roleName, // ahora derivado de profile
    signOut,
    refreshProfile,
    // helpers útiles
    isAuthenticated: !!session,
    hasRole: (role) => roleName === role
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};