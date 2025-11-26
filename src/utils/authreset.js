// src/utils/authReset.js
import { supabase } from "../lib/supabase";

export const forceAuthReset = async () => {
  console.log("🔄 Forzando reset de autenticación...");
  
  try {
    // 1. Cerrar sesión en Supabase
    await supabase.auth.signOut();
    
    // 2. Limpiar almacenamiento local relacionado con auth
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.removeItem('supabase.auth.token');
    
    // 3. Limpiar cookies de Supabase
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name] = cookie.trim().split('=');
      if (name.includes('supabase') || name.includes('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    }
    
    console.log("✅ Reset de autenticación completado");
    return true;
  } catch (error) {
    console.error("❌ Error en forceAuthReset:", error);
    return false;
  }
};