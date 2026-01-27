import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: verificar variables de entorno
console.log("SUPABASE_URL:", supabaseUrl ? "OK" : "FALTA");
console.log("SUPABASE_KEY:", supabaseAnonKey ? "OK" : "FALTA");

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERROR: Variables de entorno de Supabase no configuradas.");
  console.error("Asegurate de tener un archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);