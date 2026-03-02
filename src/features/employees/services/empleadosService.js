// src/services/empleadosService.js
import { supabase } from "@/shared/api";
import { supabaseRequest } from "@/shared/api";
import notify from "@/shared/lib/notifier";

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + "/functions/v1";

// Sincroniza el correo de un empleado en Supabase Auth (service role via Edge Function)
// Se llama en silencio después de cualquier update que cambie el campo correo
async function syncAuthEmail(empleadoId, nuevoCorreo) {
  try {
    await fetch(`${SUPABASE_FUNCTIONS_URL}/employee-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync_auth_email", empleadoId, nuevoCorreo }),
    });
  } catch (e) {
    // No interrumpimos el flujo principal si la sincronización falla
    console.warn("sync_auth_email falló:", e);
  }
}

// Obtener empleados base
export function getEmpleadosBase() {
  return supabaseRequest(
    supabase
      .from("empleados")
      .select("*")
      .order("apellidos", { ascending: true })
  );
}

// Obtener empleados con datos de SST
export function getEmpleadosSST() {
  return supabaseRequest(
    supabase
      .from("empleados")
      .select(`
        *,
        empleados_sst (*)
      `)
      .order("apellidos", { ascending: true })
  );
}

// Obtener empleados con datos de Talento Humano
export function getEmpleadosTalentoHumano() {
  return supabaseRequest(
    supabase
      .from("empleados")
      .select(`
        *,
        empleados_talento_humano (*)
      `)
      .order("apellidos", { ascending: true })
  );
}

// Obtener un empleado específico con todos sus datos relacionados
export function getEmpleadoCompleto(id) {
  return supabaseRequest(
    supabase
      .from("empleados")
      .select(`
        *,
        empleados_talento_humano (*),
        empleados_sst (*),
        empleado_documentos (*)
      `)
      .eq("id", id)
      .single()
  );
}

// Crear un nuevo empleado con todos sus registros relacionados
export async function createEmpleadoCompleto(empleadoData, talentoHumanoData, sstData) {
  try {
    console.log("📝 Iniciando creación de empleado completo...");
    console.log("Datos empleado:", empleadoData);
    console.log("Datos talento humano:", talentoHumanoData);
    console.log("Datos SST:", sstData);

    // 1. Insertar en tabla principal de empleados
    const { data: nuevoEmpleado, error: empleadoError } = await supabase
      .from("empleados")
      .insert([empleadoData])
      .select()
      .single();

    if (empleadoError) {
      console.error("❌ Error al crear empleado:", empleadoError);
      throw empleadoError;
    }

    const empleadoId = nuevoEmpleado.id;
    console.log("✅ Empleado creado con ID:", empleadoId);
    
    // 2. Insertar en tabla de talento humano si hay datos
    if (talentoHumanoData) {
      // Limpiar datos antes de insertar
      const cleanedTalentoHumanoData = {};
      Object.keys(talentoHumanoData).forEach(key => {
        if (talentoHumanoData[key] !== null && talentoHumanoData[key] !== '') {
          cleanedTalentoHumanoData[key] = talentoHumanoData[key];
        }
      });
      
      if (Object.keys(cleanedTalentoHumanoData).length > 0) {
        cleanedTalentoHumanoData.empleado_id = empleadoId;
        
        console.log("📋 Insertando datos de talento humano:", cleanedTalentoHumanoData);
        
        const { error: thError } = await supabase
          .from("empleados_talento_humano")
          .insert([cleanedTalentoHumanoData]);

        if (thError) {
          console.error("❌ Error al crear datos de talento humano:", thError);
          // Si falla, eliminar el empleado creado
          await supabase.from("empleados").delete().eq("id", empleadoId);
          throw thError;
        }
        console.log("✅ Datos de talento humano creados");
      } else {
        console.log("ℹ️ No hay datos de talento humano para insertar");
      }
    }

    // 3. Insertar en tabla de SST si hay datos
    if (sstData) {
      const cleanedSstData = {};
      Object.keys(sstData).forEach(key => {
        if (sstData[key] !== null && sstData[key] !== '') {
          cleanedSstData[key] = sstData[key];
        }
      });
      
      if (Object.keys(cleanedSstData).length > 0) {
        cleanedSstData.empleado_id = empleadoId;
        
        const { error: sstError } = await supabase
          .from("empleados_sst")
          .insert([cleanedSstData]);

        if (sstError) {
          console.error("❌ Error al crear datos SST:", sstError);
          // Si falla, eliminar registros relacionados
          await supabase.from("empleados_talento_humano").delete().eq("empleado_id", empleadoId);
          await supabase.from("empleados").delete().eq("id", empleadoId);
          throw sstError;
        }
        console.log("✅ Datos SST creados");
      }
    }

    notify.success("Empleado creado exitosamente");
    return { data: nuevoEmpleado, error: null };
  } catch (error) {
    console.error("❌ Error creando empleado completo:", error);
    
    let errorMessage = "Error al crear el empleado";
    if (error.code === '22007') {
      errorMessage = "Error en formato de fecha. Por favor, verifica las fechas ingresadas.";
    } else if (error.code === '23505') {
      errorMessage = "Ya existe un empleado con este documento de identidad.";
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }
    
    notify.error(errorMessage);
    return { data: null, error };
  }
}

// Actualizar datos generales del empleado
export async function updateEmpleado(id, empleadoData) {
  try {
    const { data, error } = await supabase
      .from("empleados")
      .update(empleadoData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Si se cambió el correo y el empleado tiene cuenta de portal,
    // sincronizar también el email en Supabase Auth (fire-and-forget)
    if (empleadoData.correo && data?.auth_user_id) {
      syncAuthEmail(id, empleadoData.correo);
    }

    notify.success("Datos del empleado actualizados");
    return { data, error: null };
  } catch (error) {
    console.error("Error actualizando empleado:", error);
    notify.error("Error al actualizar los datos");
    return { data: null, error };
  }
}

// Actualizar datos de Talento Humano
export async function updateTalentoHumano(empleadoId, talentoHumanoData) {
  try {
    // Verificar si ya existe un registro
    const { data: existingData } = await supabase
      .from("empleados_talento_humano")
      .select("*")
      .eq("empleado_id", empleadoId)
      .single();

    let result;
    if (existingData) {
      // Actualizar registro existente
      result = await supabase
        .from("empleados_talento_humano")
        .update(talentoHumanoData)
        .eq("empleado_id", empleadoId);
    } else {
      // Crear nuevo registro
      result = await supabase
        .from("empleados_talento_humano")
        .insert([{ empleado_id: empleadoId, ...talentoHumanoData }]);
    }

    if (result.error) throw result.error;
    
    notify.success("Datos de Talento Humano actualizados");
    return { data: result.data, error: null };
  } catch (error) {
    console.error("Error actualizando Talento Humano:", error);
    notify.error("Error al actualizar datos de Talento Humano");
    return { data: null, error };
  }
}

// Actualizar datos de SST
export async function updateSST(empleadoId, sstData) {
  try {
    // Verificar si ya existe un registro
    const { data: existingData } = await supabase
      .from("empleados_sst")
      .select("*")
      .eq("empleado_id", empleadoId)
      .single();

    let result;
    if (existingData) {
      // Actualizar registro existente
      result = await supabase
        .from("empleados_sst")
        .update(sstData)
        .eq("empleado_id", empleadoId);
    } else {
      // Crear nuevo registro
      result = await supabase
        .from("empleados_sst")
        .insert([{ empleado_id: empleadoId, ...sstData }]);
    }

    if (result.error) throw result.error;
    
    notify.success("Datos de SST actualizados");
    return { data: result.data, error: null };
  } catch (error) {
    console.error("Error actualizando SST:", error);
    notify.error("Error al actualizar datos de SST");
    return { data: null, error };
  }
}

// Subir documento relacionado con empleado
export async function uploadEmpleadoDocumento(empleadoId, file, tipoDocumento, area) {
  console.log("📤 Iniciando subida de documento...");
  console.log("Empleado ID:", empleadoId);
  console.log("Archivo:", file.name, "Tamaño:", file.size, "Tipo:", file.type);
  console.log("Tipo documento:", tipoDocumento, "Área:", area);

  try {
    // 1. Validar tamaño del archivo (máximo 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const errorMsg = `El archivo excede el tamaño máximo de 10MB (${(file.size / (1024*1024)).toFixed(2)}MB)`;
      console.error("❌", errorMsg);
      notify.error(errorMsg);
      return { data: null, error: new Error('File too large') };
    }

    // 2. Validar tipo de archivo
    const ALLOWED_TYPES = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'text/plain'
    ];
    
    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      const errorMsg = `Tipo de archivo no permitido: ${file.type}. Solo se permiten PDF, Word, imágenes y texto.`;
      console.error("❌", errorMsg);
      notify.error(errorMsg);
      return { data: null, error: new Error('Invalid file type') };
    }

    // 3. Generar nombre único
    const fileExt = file.name.split('.').pop().toLowerCase();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileName = `doc_${empleadoId}_${timestamp}_${randomStr}.${fileExt}`;
    const filePath = `${empleadoId}/${fileName}`;

    console.log("📝 Ruta del archivo:", filePath);

    // 4. Subir archivo a Storage
    console.log("⬆️ Subiendo archivo a Storage...");
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('empleado-documentos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error("❌ Error al subir archivo:", uploadError);
      
      let errorMessage = 'Error al subir el archivo';
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('bucket')) {
        errorMessage = 'El bucket "empleado-documentos" no existe o no está configurado correctamente.';
      } else if (uploadError.message?.includes('permission') || uploadError.message?.includes('policy')) {
        errorMessage = 'No tienes permisos para subir archivos. Verifica las políticas del bucket.';
      }
      
      notify.error(errorMessage);
      return { data: null, error: uploadError };
    }

    console.log("✅ Archivo subido exitosamente:", uploadData);

    // 5. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('empleado-documentos')
      .getPublicUrl(filePath);

    console.log("🔗 URL pública generada:", urlData.publicUrl);

    // 6. Registrar en la base de datos (solo con las columnas existentes)
    console.log("💾 Registrando documento en base de datos...");
    
    // Datos a insertar (solo columnas que existen en la tabla)
    const documentoData = {
      empleado_id: empleadoId,
      tipo_documento: tipoDocumento,
      area: area,
      archivo_path: urlData.publicUrl,
      // La columna 'nombre_archivo' es de tipo ARRAY en la base de datos
      nombre_archivo: [file.name]  // Insertar como array
    };

    console.log("📋 Datos a insertar:", documentoData);
    
    const { data: dbData, error: dbError } = await supabase
      .from("empleado_documentos")
      .insert([documentoData])
      .select()
      .single();

    if (dbError) {
      console.error("❌ Error al registrar en base de datos:", dbError);
      console.error("📋 Detalles del error:", dbError);
      
      // Intentar eliminar el archivo subido (limpieza)
      try {
        await supabase.storage
          .from('empleado-documentos')
          .remove([filePath]);
        console.log("🧹 Archivo eliminado de Storage tras error en BD");
      } catch (cleanupError) {
        console.warn("⚠️ No se pudo eliminar el archivo huérfano:", cleanupError);
      }
      
      notify.error('Error al registrar el documento en la base de datos');
      return { data: null, error: dbError };
    }

    console.log("✅ Documento registrado exitosamente:", dbData);
    notify.success("Documento subido exitosamente");
    
    return { data: dbData, error: null };
    
  } catch (error) {
    console.error("❌ Error inesperado al subir documento:", error);
    notify.error("Error inesperado al subir el documento");
    return { data: null, error };
  }
}

// Obtener documentos de un empleado
export function getEmpleadoDocumentos(empleadoId) {
  return supabaseRequest(
    supabase
      .from("empleado_documentos")
      .select("*")
      .eq("empleado_id", empleadoId)
      .order("created_at", { ascending: false })
  );
}

// Eliminar documento
export async function deleteEmpleadoDocumento(documentoId, archivoPath) {
  try {
    console.log("🗑️ Eliminando documento ID:", documentoId);
    
    // 1. Extraer path del storage desde la URL pública
    let storagePath = '';
    
    // La URL es: https://ulboklgzjriatmaxzpsi.supabase.co/storage/v1/object/public/empleado-documentos/1/archivo.pdf
    // Necesitamos extraer solo la parte después de 'empleado-documentos/'
    const match = archivoPath.match(/empleado-documentos\/(.+)$/);
    
    if (match) {
      storagePath = match[1];
      console.log("📁 Ruta del storage a eliminar:", storagePath);
      
      // 2. Eliminar del storage
      const { error: storageError } = await supabase.storage
        .from('empleado-documentos')
        .remove([storagePath]);

      if (storageError) {
        console.error("❌ Error eliminando del storage:", storageError);
        // Continuar con eliminación de BD de todos modos
      } else {
        console.log("✅ Archivo eliminado del storage");
      }
    } else {
      console.warn("⚠️ No se pudo extraer la ruta del storage:", archivoPath);
      // Intentar usar directamente como ruta si no es URL
      storagePath = archivoPath;
    }

    // 3. Eliminar registro de la base de datos
    const { error: dbError } = await supabase
      .from("empleado_documentos")
      .delete()
      .eq("id", documentoId);

    if (dbError) {
      console.error("❌ Error eliminando de BD:", dbError);
      throw dbError;
    }

    console.log("✅ Documento eliminado correctamente");
    return { data: true, error: null };
    
  } catch (error) {
    console.error("❌ Error eliminando documento:", error);
    return { data: null, error };
  }
}

// Buscar empleados
export function searchEmpleados(query) {
  return supabaseRequest(
    supabase
      .from("empleados")
      .select("*")
      .or(`nombres.ilike.%${query}%,apellidos.ilike.%${query}%,documento_identidad.ilike.%${query}%`)
      .order("apellidos", { ascending: true })
      .limit(20)
  );
}

// Cambiar estado de empleado (activo/inactivo)
export async function toggleEmpleadoEstado(id, activo) {
  try {
    const { data, error } = await supabase
      .from("empleados")
      .update({ activo })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    
    notify.success(`Empleado ${activo ? 'activado' : 'desactivado'} exitosamente`);
    return { data, error: null };
  } catch (error) {
    console.error("Error cambiando estado:", error);
    notify.error("Error al cambiar el estado");
    return { data: null, error };
  }
}

// Obtener empleados por centro de trabajo
export function getEmpleadosPorCentro(codigoUnidad) {
  return supabaseRequest(
    supabase
      .from("empleados")
      .select(`
        *,
        empleados_talento_humano (*),
        empleados_sst (*)
      `)
      .eq("codigo_unidad", codigoUnidad)
      .order("apellidos", { ascending: true })
  );
}

// Obtener estadísticas de empleados
export async function getEstadisticasEmpleados() {
  try {
    const [empleadosBase, empleadosTH, empleadosSST] = await Promise.all([
      getEmpleadosBase(),
      getEmpleadosTalentoHumano(),
      getEmpleadosSST()
    ]);

    const total = empleadosBase.length || 0;
    const activos = empleadosBase.filter(e => e.activo).length || 0;
    const inactivos = empleadosBase.filter(e => !e.activo).length || 0;
    const conContrato = empleadosTH.filter(e => e.empleados_talento_humano?.tipo_contrato).length || 0;
    const conExamenes = empleadosSST.filter(e => e.empleados_sst?.examenes_medicos).length || 0;

    return {
      total,
      activos,
      inactivos,
      conContrato,
      conExamenes
    };
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    return {
      total: 0,
      activos: 0,
      inactivos: 0,
      conContrato: 0,
      conExamenes: 0
    };
  }
}

// Verificar si documento ya existe (por tipo y área)
export async function verificarDocumentoExistente(empleadoId, tipoDocumento, area) {
  try {
    const { data, error } = await supabase
      .from("empleado_documentos")
      .select("*")
      .eq("empleado_id", empleadoId)
      .eq("tipo_documento", tipoDocumento)
      .eq("area", area);

    if (error) throw error;
    
    return { existe: data.length > 0, documentos: data };
  } catch (error) {
    console.error("Error verificando documento:", error);
    return { existe: false, documentos: [] };
  }
}

// Obtener empleados con filtros avanzados
export function getEmpleadosFiltrados(filtros) {
  let query = supabase
    .from("empleados")
    .select(`
      *,
      empleados_talento_humano (*),
      empleados_sst (*)
    `);

  // Aplicar filtros
  if (filtros.estado !== undefined) {
    query = query.eq("activo", filtros.estado);
  }

  if (filtros.unidad) {
    query = query.eq("codigo_unidad", filtros.unidad);
  }

  if (filtros.tipo_empleado) {
    query = query.eq("tipo_empleado", filtros.tipo_empleado);
  }

  if (filtros.tipo_contrato) {
    query = query.eq("empleados_talento_humano.tipo_contrato", filtros.tipo_contrato);
  }

  // Ordenamiento
  if (filtros.sortBy) {
    query = query.order(filtros.sortBy, { 
      ascending: filtros.sortOrder !== 'desc' 
    });
  } else {
    query = query.order("apellidos", { ascending: true });
  }

  return supabaseRequest(query);
}

// Función para probar la conexión a Storage
export async function probarConexionStorage() {
  console.log("🔧 Probando conexión directa a bucket...");
  
  try {
    // Intentar un simple upload de prueba (archivo vacío)
    const testPath = `test_${Date.now()}.txt`;
    const testContent = new Blob(['test'], { type: 'text/plain' });
    
    const { error: uploadError } = await supabase.storage
      .from('empleado-documentos')
      .upload(testPath, testContent);
    
    if (uploadError) {
      console.error("❌ Error al acceder al bucket:", uploadError);
      return {
        success: false,
        message: uploadError.message,
        instrucciones: [
          "El bucket 'empleado-documentos' no es accesible.",
          "Por favor, verifica:",
          "1. Que el bucket exista en Supabase Dashboard → Storage",
          "2. Que esté configurado como PÚBLICO",
          "3. Que tenga políticas RLS configuradas",
          "Para crear políticas:",
          "- Ve a Storage → empleado-documentos → Policies",
          "- Haz clic en 'New Policy'",
          "- Selecciona 'Get started quickly'",
          "- Elige 'Enable public access'",
          "- Guarda la política"
        ]
      };
    }
    
    // Limpiar archivo de prueba
    await supabase.storage
      .from('empleado-documentos')
      .remove([testPath]);
    
    console.log("✅ Bucket accesible correctamente");
    return { success: true, message: "Bucket accesible correctamente" };
    
  } catch (error) {
    console.error("❌ Error inesperado:", error);
    return {
      success: false,
      message: error.message,
      instrucciones: ["Error inesperado al probar conexión"]
    };
  }
}