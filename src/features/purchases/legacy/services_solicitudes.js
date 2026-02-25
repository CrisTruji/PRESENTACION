import { supabase } from '@/shared/api';
import { supabaseRequest } from "@/shared/api";

export async function actualizarEstadoSolicitud(id, estado, nota = null) {
  return supabaseRequest( // He agregado esta linea
    supabase
      .from("solicitudes")
      .update({ estado, observaciones: nota })
      .eq("id", id)
      .select()
      .single()
  );
}

export async function getSolicitudConItems(id) {
  return supabaseRequest( // He agregado esta linea
    supabase
      .from("solicitudes")
      .select(`
        id,
        proveedor_id,
        estado,
        fecha_solicitud,
        created_by,
        proveedor:proveedores ( id, nombre ),
        items:solicitud_items (
          id,
          catalogo_producto_id,
          cantidad_solicitada,
          unidad,
          observaciones,
          catalogo_productos ( id, nombre, categoria )
        )
      `)
      .eq("id", id)
      .single()
  );
}
