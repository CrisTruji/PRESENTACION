import { supabase } from "./supabase";

console.log("🧪 test-supabase cargado");

(async () => {
  console.log("🧪 getSession START");
  const { data, error } = await supabase.auth.getSession();
  console.log("🧪 getSession RESULT:", data, error);
})();
