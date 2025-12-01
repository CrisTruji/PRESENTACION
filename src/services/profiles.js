/**
 * Obtiene usuarios pendientes de asignar rol
 * (aquellos con rol = 'usuario')
 */
export const getPendingUsers = async () => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("rol", "usuario") // Usuarios sin rol asignado real
      .order("created_at", { ascending: true });

    if (error) throw error;

    return data;

  } catch (error) {
    console.error("❌ Error al obtener usuarios pendientes:", error);
    throw error;
  }
};
/**
 * Asigna un rol a un usuario
 */
export const assignRole = async (userId, newRole) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        rol: newRole,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Rol actualizado:", data);
    return data;

  } catch (error) {
    console.error("❌ Error asignando rol:", error);
    throw error;
  }
};




