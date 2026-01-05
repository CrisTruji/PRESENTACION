// src/lib/supabaseRequest.js
import { supabase } from "./supabase";

export async function supabaseRequest(promise) {
  const { data, error } = await promise;

  if (error) {
    console.error("[SUPABASE ERROR]", error);

    if (error.code === "401" || error.code === "403") {
      await supabase.auth.signOut();
    }

    throw error;
  }

  return data;
}
