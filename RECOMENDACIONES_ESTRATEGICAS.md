# RECOMENDACIONES ESTRATÉGICAS - HEALTHY APP
## Guía Arquitectónica para Máxima Compliance con Requerimientos

**Fecha:** 25 de Febrero de 2026
**Objetivo:** Convertir la aplicación de 7.0/10 a 9.5/10 compliance
**Enfoque:** Impacto de negocio + Facilidad de implementación

---

# TABLA DE CONTENIDOS

1. [Matriz de Decisión por Requerimiento](#matriz)
2. [Soluciones Arquitectónicas Detalladas](#soluciones)
3. [Roadmap de Implementación (12 semanas)](#roadmap)
4. [Patrones de Código para Nuevas Features](#patrones)
5. [Estimaciones de Esfuerzo](#estimaciones)

---

# <a name="matriz"></a> MATRIZ DE DECISIÓN: 11 REQUERIMIENTOS

| # | Requerimiento | Estado | Prioridad | Complejidad | Semanas | Estrategia |
|---|---|---|---|---|---|---|
| **1** | Controlar Stock | ✅ 95% | Media | Baja | 0.5 | Completar alertas automáticas + FIFO |
| **2** | Costo de Platos | ✅ 85% | Media | Baja | 0.5 | Historial + trigger automático |
| **3** | Pedidos de Comida | ✅ 90% | ALTA | Media | 1 | Auto-save + validación de stock |
| **4** | Ciclos-Menús | ✅ 80% | ALTA | Media | 1.5 | Plantillas + validación completa |
| **5** | Visualizar Pedidos | ✅ 75% | ALTA | Baja | 1 | Vistas detalladas + alertas |
| **5.1** | Cálculo Ingredientes | ✅ 90% | ALTA | Baja | 0.3 | N+1 fix (RPC) |
| **6** | Recepcionar Facturas | ✅ 70% | Alta | Media | 1.5 | Workflow completo + validaciones |
| **7** | Dashboard/Análisis | 🔴 50% | ALTA | Alta | 2 | **Sistema de Notificaciones** |
| **8** | Costos/Presupuesto | 🔴 40% | ALTA | Alta | 2 | **Módulo Presupuesto** |
| **9** | Recomendaciones | 🔴 0% | CRÍTICA | Muy Alta | 3 | **Motor de Recomendaciones** |
| **10** | Auditoría Completa | ✅ 85% | Media | Baja | 0.5 | Triggers + RLS |
| **11** | Seguridad RLS | ⏳ 40% | Media | Media | 1 | **Políticas por Rol** |

**Leyenda:**
- ✅ = Bien implementado (>80%)
- ⏳ = Parcialmente (40-80%)
- 🔴 = Falta mucho (<40%)

---

# <a name="soluciones"></a> SOLUCIONES ARQUITECTÓNICAS DETALLADAS

## SOLUCIÓN 1: SISTEMA DE NOTIFICACIONES (Requerimiento 7 - Dashboard)
**Estado Actual:** 0% (no existe)
**Impacto de Negocio:** CRÍTICO (jefe de planta desconoce problemas)
**Complejidad:** Alta (requiere 3 componentes nuevos)

### 1.1 Arquitectura Propuesta

```
┌─────────────────────────────────────────────────┐
│          HEALTHY APP - NOTIFICATIONS            │
├─────────────────────────────────────────────────┤
│                                                  │
│  DATABASE LAYER:                                │
│  ├─ notificaciones (id, usuario_id, tipo, ...)│
│  ├─ eventos_sistema (stock_bajo, falta_ciclo...)
│  └─ preferences_notificaciones (canales activos)
│                                                  │
│  BACKEND LAYER:                                 │
│  ├─ RPC: detectar_eventos_sistema()            │
│  ├─ Trigger: cuando stock < stock_minimo      │
│  ├─ Function: crear_notificacion()             │
│  └─ Edge Function: enviar_email_webhook()      │
│                                                  │
│  FRONTEND LAYER:                                │
│  ├─ features/notifications/                    │
│  │  ├─ components/BellIcon.jsx                │
│  │  ├─ components/NotificationCenter.jsx      │
│  │  ├─ services/notificationsService.js       │
│  │  ├─ store/useNotificationStore.js          │
│  │  └─ hooks/useNotifications.js              │
│  │                                              │
│  └─ Real-time: Supabase .on('*')              │
│     para escuchar cambios en tabla            │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 1.2 Tablas SQL Requeridas

```sql
-- 1. Tabla de eventos del sistema (lo que genera notificaciones)
CREATE TABLE IF NOT EXISTS eventos_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50) NOT NULL, -- 'stock_bajo', 'ciclo_sin_activar', 'falta_consolidar', etc.
  severidad VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'
  descripcion TEXT,
  datos_contexto JSONB, -- {producto_id, stock_actual, stock_minimo, fecha, ...}
  creado_en TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de notificaciones enviadas a usuarios
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  evento_id UUID REFERENCES eventos_sistema(id),
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(50), -- 'stock', 'ciclo', 'consolidado', 'costo'
  estado VARCHAR(20) DEFAULT 'sin_leer', -- 'sin_leer', 'leida', 'archivada'
  accion_url VARCHAR(500), -- Link a la pantalla relevante
  creado_en TIMESTAMPTZ DEFAULT now(),
  leido_en TIMESTAMPTZ,
  archivado_en TIMESTAMPTZ
);

-- 3. Preferencias de notificación por usuario
CREATE TABLE IF NOT EXISTS notificacion_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  email_stock_bajo BOOLEAN DEFAULT true,
  email_ciclo_sin_activar BOOLEAN DEFAULT true,
  email_consolidado_listo BOOLEAN DEFAULT true,
  email_presupuesto_excedido BOOLEAN DEFAULT false,
  push_notificaciones BOOLEAN DEFAULT true,
  resumen_diario BOOLEAN DEFAULT true,
  hora_resumen TIME DEFAULT '08:00:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Índices para queries rápidas
CREATE INDEX idx_notificaciones_usuario_estado
  ON notificaciones(usuario_id, estado)
  WHERE estado = 'sin_leer';

CREATE INDEX idx_eventos_tipo_fecha
  ON eventos_sistema(tipo, creado_en DESC);
```

### 1.3 Triggers PostgreSQL para Detectar Eventos

```sql
-- TRIGGER 1: Stock bajo
CREATE OR REPLACE FUNCTION detectar_stock_bajo()
RETURNS TRIGGER AS $$
BEGIN
  -- Si stock_actual cae por debajo de stock_minimo
  IF NEW.stock_actual < NEW.stock_minimo AND OLD.stock_actual >= NEW.stock_minimo THEN
    INSERT INTO eventos_sistema (tipo, severidad, descripcion, datos_contexto)
    VALUES (
      'stock_bajo',
      CASE
        WHEN NEW.stock_actual < (NEW.stock_minimo * 0.5) THEN 'critical'
        ELSE 'warning'
      END,
      'Stock bajo: ' || NEW.nombre,
      jsonb_build_object(
        'producto_id', NEW.id,
        'nombre', NEW.nombre,
        'stock_actual', NEW.stock_actual,
        'stock_minimo', NEW.stock_minimo
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_arbol_materia_prima_stock_bajo
AFTER UPDATE ON arbol_materia_prima
FOR EACH ROW
EXECUTE FUNCTION detectar_stock_bajo();

-- TRIGGER 2: Ciclo sin activar (si es lunes y no hay ciclo activo)
CREATE OR REPLACE FUNCTION detectar_ciclo_sin_activar()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es lunes (dow=1) y hay ciclo en estado 'borrador'
  IF EXTRACT(DOW FROM NOW()) = 1 THEN
    IF EXISTS(SELECT 1 FROM ciclos_menu WHERE estado='borrador' AND activo=true LIMIT 1) THEN
      INSERT INTO eventos_sistema (tipo, severidad, descripcion)
      VALUES ('ciclo_sin_activar', 'critical', 'Ciclo de la semana aún no está activado');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER 3: Consolidado listo (después de crear consolidado)
CREATE OR REPLACE FUNCTION notificar_consolidado_listo()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO eventos_sistema (tipo, severidad, descripcion, datos_contexto)
  VALUES (
    'consolidado_listo',
    'info',
    'Consolidado de ' || NEW.servicio || ' generado',
    jsonb_build_object('consolidado_id', NEW.id, 'fecha', NEW.fecha, 'servicio', NEW.servicio)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consolidado_creado
AFTER INSERT ON consolidados_produccion
FOR EACH ROW
EXECUTE FUNCTION notificar_consolidado_listo();
```

### 1.4 RPC para Distribuir Notificaciones

```sql
-- RPC: Procesar eventos y crear notificaciones
CREATE OR REPLACE FUNCTION procesar_eventos_y_notificar()
RETURNS void AS $$
DECLARE
  v_evento RECORD;
  v_usuario RECORD;
  v_accion_url VARCHAR;
BEGIN
  -- Para cada evento sin procesar
  FOR v_evento IN
    SELECT * FROM eventos_sistema
    WHERE id NOT IN (SELECT evento_id FROM notificaciones WHERE evento_id IS NOT NULL)
  LOOP
    -- Obtener usuarios que deben ser notificados según su rol
    FOR v_usuario IN
      SELECT DISTINCT u.id
      FROM auth.users u
      LEFT JOIN notificacion_preferences np ON np.usuario_id = u.id
      WHERE
        (u.raw_user_meta_data->>'role' IN ('jefe_de_planta', 'supervisor_produccion', 'administrador'))
        AND (
          (v_evento.tipo = 'stock_bajo' AND COALESCE(np.email_stock_bajo, true))
          OR (v_evento.tipo = 'ciclo_sin_activar' AND COALESCE(np.email_ciclo_sin_activar, true))
          OR (v_evento.tipo = 'consolidado_listo' AND COALESCE(np.email_consolidado_listo, true))
        )
    LOOP
      -- Determinar URL de acción según tipo de evento
      v_accion_url := CASE v_evento.tipo
        WHEN 'stock_bajo' THEN '/almacen/inventario?producto=' || (v_evento.datos_contexto->>'producto_id')
        WHEN 'ciclo_sin_activar' THEN '/chef/ciclos'
        WHEN 'consolidado_listo' THEN '/supervisor/consolidado'
        ELSE NULL
      END;

      -- Crear notificación
      INSERT INTO notificaciones (usuario_id, evento_id, titulo, mensaje, tipo, accion_url)
      VALUES (
        v_usuario.id,
        v_evento.id,
        CASE v_evento.tipo
          WHEN 'stock_bajo' THEN '⚠️ Stock Bajo'
          WHEN 'ciclo_sin_activar' THEN '🔴 Ciclo Sin Activar'
          WHEN 'consolidado_listo' THEN '✅ Consolidado Listo'
          ELSE v_evento.tipo
        END,
        v_evento.descripcion,
        v_evento.tipo,
        v_accion_url
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar cada 5 minutos via Supabase Edge Function
```

### 1.5 Frontend: Hook useNotifications

```javascript
// features/notifications/hooks/useNotifications.js
import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { create } from 'zustand';
import { supabase } from '@/shared/api';

// Store para estado local de notificaciones
export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifs) => set({ notifications: notifs }),
  markAsRead: (notificationId) => set((state) => ({
    notifications: state.notifications.map(n =>
      n.id === notificationId ? { ...n, estado: 'leida' } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1),
  })),
  removeNotification: (notificationId) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== notificationId),
  })),
}));

// Hook para obtener notificaciones del usuario
export function useNotifications() {
  const { setNotifications } = useNotificationStore();

  // Query inicial
  const {
    data: notificaciones,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('estado', 'sin_leer')
        .order('creado_en', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data);
      return data;
    },
  });

  // Escuchar cambios en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${supabase.auth.user()?.id}`,
        },
        (payload) => {
          // Nueva notificación recibida
          setNotifications([payload.new, ...notificaciones]);
          // Reproducir sonido si está habilitado
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [notificaciones, setNotifications]);

  const marcarLeída = useMutation({
    mutationFn: async (notificationId) => {
      const { error } = await supabase
        .from('notificaciones')
        .update({ estado: 'leida', leido_en: new Date() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: (_, notificationId) => {
      useNotificationStore.getState().markAsRead(notificationId);
    },
  });

  return {
    notificaciones: notificaciones || [],
    isLoading,
    unreadCount: notificaciones?.length || 0,
    marcarLeída,
    refetch,
  };
}

function playNotificationSound() {
  const audio = new Audio('/notification-sound.mp3');
  audio.play().catch(() => {}); // Ignorar si falla (mute, etc)
}
```

### 1.6 Frontend: Componentes BellIcon + NotificationCenter

```jsx
// features/notifications/components/BellIcon.jsx
import { Bell, AlertCircle } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useState } from 'react';
import NotificationCenter from './NotificationCenter';

export default function BellIcon() {
  const { unreadCount } = useNotifications();
  const [showCenter, setShowCenter] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowCenter(!showCenter)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showCenter && (
        <NotificationCenter onClose={() => setShowCenter(false)} />
      )}
    </div>
  );
}
```

```jsx
// features/notifications/components/NotificationCenter.jsx
import { X, CheckCheck, AlertCircle, Info } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

export default function NotificationCenter({ onClose }) {
  const { notificaciones, marcarLeída } = useNotifications();
  const navigate = useNavigate();

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'stock_bajo': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'ciclo_sin_activar': return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'consolidado_listo': return <CheckCheck className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="font-bold text-lg">Notificaciones</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Notificaciones */}
      <div className="max-h-96 overflow-y-auto">
        {notificaciones.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No hay notificaciones nuevas
          </div>
        ) : (
          notificaciones.map((notif) => (
            <div
              key={notif.id}
              className="border-b hover:bg-gray-50 p-4 cursor-pointer transition-colors"
              onClick={() => {
                if (notif.accion_url) navigate(notif.accion_url);
                marcarLeída.mutate(notif.id);
              }}
            >
              <div className="flex gap-3">
                {getIcon(notif.tipo)}
                <div className="flex-1">
                  <p className="font-semibold text-sm">{notif.titulo}</p>
                  <p className="text-sm text-gray-600">{notif.mensaje}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.creado_en).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

### 1.7 Integración en App.jsx

```jsx
// app/App.jsx
import BellIcon from '@/features/notifications/components/BellIcon';

export default function App() {
  return (
    <div className="app">
      <Navbar />
      {/* BellIcon en la navbar */}
      <div className="navbar-right">
        <BellIcon />
        <UserMenu />
      </div>

      <main>
        {/* rutas */}
      </main>
    </div>
  );
}
```

**Implementación:** 1-2 semanas (incluye testing)

---

## SOLUCIÓN 2: MÓDULO DE PRESUPUESTO (Requerimiento 8)
**Estado Actual:** 0% (no existe)
**Impacto de Negocio:** CRÍTICO (control financiero)
**Complejidad:** Alta (requiere 4 tablas nuevas + servicios)

### 2.1 Diseño de Tablas

```sql
-- 1. Presupuestos mensuales por operación
CREATE TABLE IF NOT EXISTS presupuestos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operacion_id UUID NOT NULL REFERENCES operaciones(id),
  mes DATE NOT NULL, -- Primer día del mes
  presupuestado NUMERIC(12,2) NOT NULL,
  aprobado_por UUID REFERENCES auth.users(id),
  estado VARCHAR(20) DEFAULT 'draft', -- 'draft', 'aprobado', 'cerrado'
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(operacion_id, mes)
);

-- 2. Detalles por categoría de gasto
CREATE TABLE IF NOT EXISTS presupuesto_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id UUID NOT NULL REFERENCES presupuestos(id) ON DELETE CASCADE,
  categoria VARCHAR(100), -- 'proteína', 'verdura', 'granos', 'lácteos', 'empaque', 'energía'
  cantidad_estimada NUMERIC(12,3),
  unidad VARCHAR(10),
  precio_unitario NUMERIC(10,2),
  total_presupuestado NUMERIC(12,2) GENERATED ALWAYS AS (cantidad_estimada * precio_unitario) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Gasto real acumulado (desde facturas)
CREATE TABLE IF NOT EXISTS gasto_real_acumulado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operacion_id UUID NOT NULL REFERENCES operaciones(id),
  mes DATE NOT NULL,
  categoria VARCHAR(100),
  gasto_total NUMERIC(12,2) DEFAULT 0,
  cantidad_items INTEGER DEFAULT 0,
  fecha_actualizacion TIMESTAMPTZ DEFAULT now(),
  UNIQUE(operacion_id, mes, categoria)
);

-- 4. Alertas de presupuesto
CREATE TABLE IF NOT EXISTS alertas_presupuesto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id UUID NOT NULL REFERENCES presupuestos(id),
  porcentaje_alerta NUMERIC(3,1) DEFAULT 80.0, -- Alerta cuando llega a 80%
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_presupuestos_operacion_mes
  ON presupuestos(operacion_id, mes DESC);

CREATE INDEX idx_gasto_real_operacion_mes
  ON gasto_real_acumulado(operacion_id, mes);
```

### 2.2 RPC para Calcular Gasto Real

```sql
-- RPC: Calcular gasto real desde facturas
CREATE OR REPLACE FUNCTION calcular_gasto_real_mes(
  p_operacion_id UUID,
  p_mes DATE
)
RETURNS TABLE (
  categoria VARCHAR,
  gasto_total NUMERIC,
  cantidad_items INTEGER
) AS $$
BEGIN
  -- Agregar gastos por categoría desde facturas
  RETURN QUERY
  SELECT
    COALESCE(
      CASE
        WHEN amp.nivel_actual = 4 THEN fam.nombre -- Usar familia como categoría
        ELSE 'otro'
      END,
      'otro'
    ) as categoria,
    SUM(fi.cantidad_recibida * fi.precio_unitario)::NUMERIC as gasto_total,
    COUNT(*)::INTEGER as cantidad_items
  FROM facturas f
  JOIN factura_items fi ON fi.factura_id = f.id
  JOIN arbol_materia_prima amp ON amp.id = fi.producto_arbol_id
  LEFT JOIN arbol_materia_prima fam ON fam.id = amp.parent_id AND fam.nivel_actual = 4
  WHERE
    f.operacion_id = p_operacion_id
    AND DATE_TRUNC('month', f.fecha_factura)::DATE = p_mes
  GROUP BY categoria;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 2.3 Frontend: DashboardPresupuesto

```jsx
// features/presupuesto/components/DashboardPresupuesto.jsx
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/shared/api';
import { TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';

export default function DashboardPresupuesto() {
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date());
  const operacionId = useAuth().user.operacion_id; // desde context

  // Obtener presupuesto del mes
  const { data: presupuesto } = useQuery({
    queryKey: ['presupuesto', operacionId, mesSeleccionado],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('presupuestos')
        .select('*, presupuesto_items(*)')
        .eq('operacion_id', operacionId)
        .eq('mes', mesSeleccionado.toISOString().slice(0, 7) + '-01')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Obtener gasto real del mes
  const { data: gastoReal } = useQuery({
    queryKey: ['gasto-real', operacionId, mesSeleccionado],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calcular_gasto_real_mes', {
          p_operacion_id: operacionId,
          p_mes: mesSeleccionado.toISOString().slice(0, 7) + '-01',
        });

      if (error) throw error;

      // Agregar a tabla gasto_real_acumulado también
      const total = data.reduce((sum, cat) => sum + parseFloat(cat.gasto_total || 0), 0);
      return { items: data, total };
    },
  });

  if (!presupuesto) {
    return (
      <div className="card p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-3" />
        <p>No hay presupuesto definido para este mes</p>
        <button className="btn btn-primary mt-4">Crear Presupuesto</button>
      </div>
    );
  }

  const porcentajeGastado = (gastoReal?.total || 0) / presupuesto.presupuestado * 100;
  const estado =
    porcentajeGastado > 100 ? 'error' :
    porcentajeGastado > 80 ? 'warning' : 'success';

  return (
    <div className="space-y-6">
      {/* Header con resumen */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-6">
          <p className="text-sm text-gray-500">Presupuestado</p>
          <p className="text-3xl font-bold text-primary">
            ${presupuesto.presupuestado.toLocaleString()}
          </p>
        </div>

        <div className="card p-6">
          <p className="text-sm text-gray-500">Gastado</p>
          <p className={`text-3xl font-bold ${estado === 'error' ? 'text-error' : 'text-success'}`}>
            ${(gastoReal?.total || 0).toLocaleString()}
          </p>
        </div>

        <div className="card p-6">
          <p className="text-sm text-gray-500">Disponible</p>
          <p className="text-3xl font-bold text-info">
            ${Math.max(0, presupuesto.presupuestado - (gastoReal?.total || 0)).toLocaleString()}
          </p>
        </div>

        <div className="card p-6">
          <p className="text-sm text-gray-500">Porcentaje</p>
          <p className={`text-3xl font-bold ${estado === 'error' ? 'text-error' : 'text-success'}`}>
            {porcentajeGastado.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="card p-6">
        <h3 className="font-bold mb-3">Gasto acumulado</h3>
        <div className={`w-full bg-gray-200 rounded-full h-4 overflow-hidden bg-${estado}`}>
          <div
            className={`bg-${estado} h-full transition-all`}
            style={{ width: `${Math.min(100, porcentajeGastado)}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {porcentajeGastado > 100
            ? `⚠️ Presupuesto excedido en $${((gastoReal?.total || 0) - presupuesto.presupuestado).toLocaleString()}`
            : `Margen disponible: $${(presupuesto.presupuestado - (gastoReal?.total || 0)).toLocaleString()}`
          }
        </p>
      </div>

      {/* Desglose por categoría */}
      <div className="card p-6">
        <h3 className="font-bold mb-4">Gasto por Categoría</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Categoría</th>
              <th className="text-right">Presupuestado</th>
              <th className="text-right">Gastado</th>
              <th className="text-right">% Gastado</th>
              <th className="text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {presupuesto.presupuesto_items.map((item) => {
              const gastadoEnCategoria = gastoReal?.items?.find(
                (g) => g.categoria === item.categoria
              )?.gasto_total || 0;
              const porcentajeCategoria = gastadoEnCategoria / item.total_presupuestado * 100;

              return (
                <tr key={item.id} className="border-b">
                  <td className="py-3">{item.categoria}</td>
                  <td className="text-right">${item.total_presupuestado.toLocaleString()}</td>
                  <td className="text-right">${gastadoEnCategoria.toLocaleString()}</td>
                  <td className="text-right">{porcentajeCategoria.toFixed(1)}%</td>
                  <td className="text-center">
                    {porcentajeCategoria > 100 && <span className="badge badge-error">Excedido</span>}
                    {porcentajeCategoria > 80 && porcentajeCategoria <= 100 && <span className="badge badge-warning">Crítico</span>}
                    {porcentajeCategoria <= 80 && <span className="badge badge-success">OK</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Implementación:** 2 semanas

---

## SOLUCIÓN 3: MOTOR DE RECOMENDACIONES (Requerimiento 9)
**Estado Actual:** 0% (no existe)
**Impacto de Negocio:** CRÍTICO (mejora operacional)
**Complejidad:** Muy Alta (ML + histórico + predicción)

### 3.1 Arquitectura de Recomendaciones

```
┌─────────────────────────────────────────┐
│   MOTOR DE RECOMENDACIONES              │
├─────────────────────────────────────────┤
│                                          │
│ 1. DATA LAYER:                          │
│    ├─ Histórico 90 días (pedidos)       │
│    ├─ Stock actual (arbol_materia_prima)
│    ├─ Costos (arbol_recetas)            │
│    └─ Ciclos completados                │
│                                          │
│ 2. LOGIC LAYER:                         │
│    ├─ calcular_promedio_pedidos()       │
│    ├─ detectar_anomalías()              │
│    ├─ recomendar_compra()               │
│    ├─ recomendar_recetas()              │
│    ├─ recomendar_presupuesto()          │
│    └─ alertas_inteligentes()            │
│                                          │
│ 3. FRONTEND:                            │
│    ├─ RecommendationWidget.jsx          │
│    ├─ PurchaseRecommendation.jsx        │
│    ├─ RecipeRecommendation.jsx          │
│    └─ BudgetRecommendation.jsx          │
│                                          │
└─────────────────────────────────────────┘
```

### 3.2 RPC para Recomendaciones de Compra

```sql
-- RPC: Recomendar qué comprar basado en consumo histórico
CREATE OR REPLACE FUNCTION recomendar_compra(
  p_operacion_id UUID,
  p_dias_proyeccion INTEGER DEFAULT 7
)
RETURNS TABLE (
  producto_id BIGINT,
  nombre VARCHAR,
  codigo VARCHAR,
  stock_actual NUMERIC,
  consumo_diario_promedio NUMERIC,
  consumo_proyectado NUMERIC,
  recomendacion_compra NUMERIC,
  urgencia VARCHAR,
  precio_estimado NUMERIC
) AS $$
DECLARE
  v_fecha_inicio DATE := CURRENT_DATE - INTERVAL '90 days';
BEGIN
  RETURN QUERY
  WITH consumo_historico AS (
    SELECT
      ri.materia_prima_id,
      AVG(ri.cantidad_requerida * (ci.cantidad_total::NUMERIC / NULLIF(ar.rendimiento, 0))) as consumo_diario
    FROM consolidado_items ci
    JOIN consolidados_produccion cp ON cp.id = ci.consolidado_id
    JOIN arbol_recetas ar ON ar.id = ci.receta_id
    JOIN receta_ingredientes ri ON ri.receta_id = ci.receta_id
    WHERE cp.fecha >= v_fecha_inicio
    GROUP BY ri.materia_prima_id
  )
  SELECT
    amp.id,
    amp.nombre,
    amp.codigo,
    amp.stock_actual,
    ch.consumo_diario,
    ch.consumo_diario * p_dias_proyeccion as consumo_proyectado,
    GREATEST(
      0,
      (ch.consumo_diario * p_dias_proyeccion) - amp.stock_actual
    ) as recomendacion_compra,
    CASE
      WHEN amp.stock_actual < amp.stock_minimo THEN 'URGENTE'
      WHEN (ch.consumo_diario * 3) > amp.stock_actual THEN 'ALTA'
      WHEN (ch.consumo_diario * 7) > amp.stock_actual THEN 'MEDIA'
      ELSE 'BAJA'
    END as urgencia,
    amp.costo_promedio * (ch.consumo_diario * p_dias_proyeccion) as precio_estimado
  FROM consumo_historico ch
  JOIN arbol_materia_prima amp ON amp.id = ch.materia_prima_id AND amp.nivel_actual = 5
  WHERE ch.consumo_diario > 0
  ORDER BY urgencia DESC, precio_estimado DESC;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 3.3 RPC para Detectar Anomalías

```sql
-- RPC: Detectar pedidos anómalos (posibles errores)
CREATE OR REPLACE FUNCTION detectar_anomalias_pedidos(
  p_operacion_id UUID
)
RETURNS TABLE (
  anomalia_id UUID,
  tipo VARCHAR,
  descripcion TEXT,
  pedido_id UUID,
  valor_actual NUMERIC,
  valor_esperado NUMERIC,
  confianza NUMERIC
) AS $$
DECLARE
  v_promedio_30dias NUMERIC;
  v_desv_estandar NUMERIC;
  v_fecha_limite DATE := CURRENT_DATE - INTERVAL '30 days';
BEGIN
  -- Calcular promedio y desv. estándar de últimos 30 días
  SELECT
    AVG(SUM(quantidade)::NUMERIC) as promedio,
    STDDEV(SUM(cantidad)::NUMERIC) as desv_est
  INTO v_promedio_30dias, v_desv_estandar
  FROM pedido_items_servicio pis
  JOIN pedidos_servicio ps ON ps.id = pis.pedido_id
  WHERE ps.operacion_id = p_operacion_id
    AND ps.fecha >= v_fecha_limite
  GROUP BY ps.fecha, ps.servicio;

  -- Si hay desviación significativa, reportar anomalía
  RETURN QUERY
  SELECT
    gen_random_uuid(),
    'pedido_cantidad_anómala'::VARCHAR,
    'Cantidad de pedido fuera del rango esperado (Z-score > 2)'::TEXT,
    ps.id,
    SUM(pis.cantidad)::NUMERIC,
    v_promedio_30dias,
    (ABS(SUM(pis.cantidad)::NUMERIC - v_promedio_30dias) / NULLIF(v_desv_estandar, 0)) as confianza
  FROM pedido_items_servicio pis
  JOIN pedidos_servicio ps ON ps.id = pis.pedido_id
  WHERE ps.operacion_id = p_operacion_id
    AND ps.fecha >= v_fecha_limite
  GROUP BY ps.id
  HAVING ABS(SUM(pis.cantidad)::NUMERIC - v_promedio_30dias) > (2 * v_desv_estandar)
  ORDER BY confianza DESC;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 3.4 Frontend: RecommendationWidget

```jsx
// features/recommendations/components/RecommendationWidget.jsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/api';
import { Lightbulb, TrendingUp, AlertCircle, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/features/auth';

export default function RecommendationWidget() {
  const { user } = useAuth();

  // Recomendaciones de compra
  const { data: recomendacionesCompra } = useQuery({
    queryKey: ['recommendations-compra', user.operacion_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('recomendar_compra', {
        p_operacion_id: user.operacion_id,
        p_dias_proyeccion: 7,
      });

      if (error) throw error;
      return data?.filter((r) => r.urgencia !== 'BAJA').slice(0, 5) || [];
    },
  });

  // Detección de anomalías
  const { data: anomalias } = useQuery({
    queryKey: ['recommendations-anomalias', user.operacion_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('detectar_anomalias_pedidos', {
        p_operacion_id: user.operacion_id,
      });

      if (error) throw error;
      return data?.filter((a) => a.confianza > 2)?.slice(0, 3) || [];
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Recomendaciones de Compra */}
      <div className="card p-6 border-l-4 border-info">
        <div className="flex items-center gap-3 mb-4">
          <ShoppingCart className="w-5 h-5 text-info" />
          <h3 className="font-bold">Compras Recomendadas</h3>
        </div>

        {recomendacionesCompra?.length === 0 ? (
          <p className="text-sm text-gray-500">Sin recomendaciones urgentes</p>
        ) : (
          <ul className="space-y-2">
            {recomendacionesCompra?.map((rec) => (
              <li
                key={rec.producto_id}
                className={`p-3 rounded text-sm ${
                  rec.urgencia === 'URGENTE'
                    ? 'bg-error bg-opacity-10 border border-error'
                    : rec.urgencia === 'ALTA'
                    ? 'bg-warning bg-opacity-10 border border-warning'
                    : 'bg-gray-100'
                }`}
              >
                <p className="font-semibold">{rec.nombre}</p>
                <p className="text-xs text-gray-600">
                  Stock: {rec.stock_actual.toFixed(0)}
                  {rec.unidad} | Requerir: {rec.recomendacion_compra.toFixed(0)}
                  {rec.unidad}
                </p>
                <p className="text-xs text-gray-500">
                  Est. ${rec.precio_estimado?.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detección de Anomalías */}
      <div className="card p-6 border-l-4 border-warning">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-warning" />
          <h3 className="font-bold">Anomalías Detectadas</h3>
        </div>

        {anomalias?.length === 0 ? (
          <p className="text-sm text-gray-500">Todo normal</p>
        ) : (
          <ul className="space-y-2">
            {anomalias?.map((anom) => (
              <li
                key={anom.anomalia_id}
                className="p-3 rounded bg-warning bg-opacity-10 border border-warning text-sm"
              >
                <p className="font-semibold">{anom.tipo}</p>
                <p className="text-xs text-gray-600">{anom.descripcion}</p>
                <p className="text-xs text-gray-500">
                  Esperado: {anom.valor_esperado.toFixed(0)} | Actual: {anom.valor_actual.toFixed(0)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

**Implementación:** 3-4 semanas

---

# <a name="roadmap"></a> ROADMAP DE IMPLEMENTACIÓN (12 SEMANAS)

## FASE 1: CIMIENTOS (Semanas 1-3)
**Objetivo:** Estabilizar lo que ya existe + fixes críticos

| Semana | Tarea | Archivos | Prioridad | Status |
|--------|-------|----------|-----------|--------|
| 1 | Fix N+1 en `getIngredientesTotales` (RPC) | `consolidadoService.js` | 🔴 CRÍTICA | ⏳ |
| 1 | Agregar triggers de stock bajo | `sql/fase1.sql` | 🔴 CRÍTICA | ⏳ |
| 2 | Crear sistema de notificaciones (DB) | `sql/fase1_notifications.sql` | 🔴 CRÍTICA | ⏳ |
| 2 | Implementar frontend BellIcon + NotificationCenter | `features/notifications/` | 🔴 CRÍTICA | ⏳ |
| 3 | Auto-save en PedidoServicioForm | `usePedidoStore.js` | 🟡 ALTA | ⏳ |
| 3 | Validación de stock mientras se llena pedido | `useValidarStock.js` | 🟡 ALTA | ⏳ |

**Entregable:** Aplicación sin spinners infinitos + notificaciones básicas funcionando

---

## FASE 2: FUNCIONALIDADES MEDIAS (Semanas 4-7)
**Objetivo:** Completar stock, costos y presupuesto

| Semana | Tarea | Archivos | Prioridad | Status |
|--------|-------|----------|-----------|--------|
| 4 | Crear módulo de presupuesto (DB) | `sql/fase2_presupuesto.sql` | 🟡 ALTA | ⏳ |
| 4-5 | Frontend DashboardPresupuesto | `features/presupuesto/` | 🟡 ALTA | ⏳ |
| 5 | Historial de costos de recetas | `features/recipes/services/` | 🟡 ALTA | ⏳ |
| 5-6 | Motor de recomendaciones - compras | `recomendar_compra()` RPC | 🔴 CRÍTICA | ⏳ |
| 6 | Frontend RecommendationWidget | `features/recommendations/` | 🟡 ALTA | ⏳ |
| 7 | Detección de anomalías en pedidos | `detectar_anomalias_pedidos()` RPC | 🟡 ALTA | ⏳ |

**Entregable:** Presupuesto + recomendaciones básicas funcionando

---

## FASE 3: OPERACIONAL + SEGURIDAD (Semanas 8-12)
**Objetivo:** Completar features y seguridad

| Semana | Tarea | Archivos | Prioridad | Status |
|--------|-------|----------|-----------|--------|
| 8 | Plantillas de ciclos | `features/menu-cycles/` | 🟡 ALTA | ⏳ |
| 8-9 | Validación de stock para ciclo completo | `useValidarStockParaCiclo()` | 🟡 ALTA | ⏳ |
| 9 | Implementar RLS diferenciada por rol | `sql/fase3_rls.sql` | 🟡 ALTA | ⏳ |
| 9-10 | Dashboard ejecutivo (admin) | `features/admin/DashboardEjecutivo.jsx` | 🟡 ALTA | ⏳ |
| 10 | Exportación a Excel (consolidado, stock) | `features/*/services/exportService.js` | 🟡 ALTA | ⏳ |
| 10-11 | Testing y optimización de performance | Tests | 🟡 ALTA | ⏳ |
| 11-12 | Documentación + capacitación | Docs | 🟢 MEDIA | ⏳ |

**Entregable:** App lista para producción (9.5/10 compliance)

---

# <a name="patrones"></a> PATRONES DE CÓDIGO PARA NUEVAS FEATURES

## Patrón 1: Servicio con Supabase

```javascript
// features/[feature]/services/[feature]Service.js
import { supabase } from '@/shared/api';
import { supabaseRequest } from '@/shared/lib/supabaseRequest';

export const [feature]Service = {
  // Query simple
  async getAll(filters = {}) {
    let query = supabase.from('[table]').select('*');

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query.order('created_at', { ascending: false });
    return { data, error };
  },

  // Query con RPC
  async getConRecomendaciones(operacion_id) {
    const { data, error } = await supabase.rpc('recomendar_compra', {
      p_operacion_id: operacion_id,
      p_dias_proyeccion: 7,
    });

    if (error) {
      console.error('RPC error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  },

  // Mutation
  async crear(payload) {
    const { data, error } = await supabase
      .from('[table]')
      .insert([payload])
      .select()
      .single();

    return supabaseRequest({ data, error }, 'Crear [recurso]');
  },

  // Update
  async actualizar(id, payload) {
    const { data, error } = await supabase
      .from('[table]')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    return supabaseRequest({ data, error }, 'Actualizar [recurso]');
  },

  // Delete (soft)
  async eliminar(id) {
    return this.actualizar(id, { deleted_at: new Date() });
  },
};
```

## Patrón 2: Hook con React Query

```javascript
// features/[feature]/hooks/use[Feature].js
import { useQuery, useMutation } from '@tanstack/react-query';
import { [feature]Service } from '../services/[feature]Service';

export function use[Feature](filters = {}) {
  return useQuery({
    queryKey: ['[feature]', filters],
    queryFn: () => [feature]Service.getAll(filters),
  });
}

export function useCrear[Feature]() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => [feature]Service.crear(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['[feature]'] });
    },
  });
}
```

## Patrón 3: Componente con Zustand Store

```javascript
// features/[feature]/store/use[Feature]Store.js
import { create } from 'zustand';

export const use[Feature]Store = create((set, get) => ({
  // Estado
  currentItem: null,
  filters: {},
  isLoading: false,

  // Acciones
  setCurrentItem: (item) => set({ currentItem: item }),
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),
  setLoading: (isLoading) => set({ isLoading }),

  // Computed
  filteredItems: () => {
    const state = get();
    // lógica de filtering
  },

  // Reset
  reset: () => set({
    currentItem: null,
    filters: {},
    isLoading: false,
  }),
}));
```

## Patrón 4: Componente con Formulario

```jsx
// features/[feature]/components/[Feature]Form.jsx
import { useState } from 'react';
import { useCrear[Feature] } from '../hooks/use[Feature]';
import { notify } from '@/shared/lib/notifier';

export default function [Feature]Form({ onSuccess }) {
  const [formData, setFormData] = useState({
    campo1: '',
    campo2: '',
  });

  const crear = useCrear[Feature]();

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.campo1) {
      notify.error('Campo requerido');
      return;
    }

    const { error } = await crear.mutateAsync(formData);
    if (error) {
      notify.error(error.message);
      return;
    }

    notify.success('Creado exitosamente');
    setFormData({ campo1: '', campo2: '' });
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <input
        value={formData.campo1}
        onChange={(e) => setFormData({ ...formData, campo1: e.target.value })}
        placeholder="Campo 1"
        className="input input-bordered w-full"
      />

      <button
        type="submit"
        disabled={crear.isPending}
        className="btn btn-primary w-full"
      >
        {crear.isPending ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  );
}
```

---

# <a name="estimaciones"></a> ESTIMACIONES DE ESFUERZO

| Feature | Complejidad | React | Node/SQL | Testing | Total |
|---------|-------------|-------|----------|---------|-------|
| **Sistema de Notificaciones** | Alta | 2 days | 2 days | 1 day | **5 days (1 semana)** |
| **Módulo Presupuesto** | Alta | 2.5 days | 2 days | 1 day | **5.5 days (1 semana)** |
| **Motor Recomendaciones** | Muy Alta | 2 days | 3 days | 1.5 days | **6.5 days (1.5 semanas)** |
| **Plantillas Ciclos** | Media | 1.5 days | 1 day | 0.5 day | **3 days** |
| **RLS Diferenciada** | Media | 0.5 day | 1.5 days | 1 day | **3 days** |
| **Dashboard Ejecutivo** | Media | 1.5 days | 1 day | 0.5 day | **3 days** |
| **Exportación Excel** | Baja | 1 day | 0.5 day | 0.5 day | **2 days** |
| **Testing + QA** | — | — | — | 5 days | **5 days** |
| **TOTAL** | — | — | — | — | **~33 days (6-7 semanas)** |

**Timing:**
- **Fase 1 (Semanas 1-3):** Fixes críticos + notificaciones
- **Fase 2 (Semanas 4-7):** Presupuesto + recomendaciones
- **Fase 3 (Semanas 8-12):** Seguridad + features operacionales

**Conclusión:** Con 1 developer full-time = 12 semanas
Con 2 developers = 6-7 semanas

---

# RECOMENDACIONES FINALES

## ✅ Qué está bien — NO TOCAR

1. **Arquitectura FSD** — Bien implementada, separación clara
2. **Sistema de ciclos** — CicloEditor es sólido
3. **Cálculo de costos** — Fórmulas correctas, triggers listos
4. **Stock tracking** — Movimientos bien registrados
5. **RPC de consolidación** — Lógica correcta

## 🔴 CRÍTICO — Implementar ASAP

1. **Sistema de notificaciones** → Sin esto, jefe de planta está ciego (Stock bajo, ciclos sin activar)
2. **Validación de stock en pedidos** → Sin esto, se ordena más de lo disponible
3. **Motor de recomendaciones** → Mejora operacional directa
4. **RLS diferenciada** → Seguridad de datos

## 🟡 IMPORTANTE — Próximas 2-3 semanas

1. **Presupuesto mensual** → Control financiero
2. **Dashboard ejecutivo** → Visibilidad para admin
3. **Exportación a Excel** → Flujo operacional

## 📊 SCORE FINAL ESPERADO

| Métrica | Hoy | Después de Fase 1 | Después Fase 2 | Después Fase 3 |
|---------|-----|-------------------|----------------|---|
| Stock Tracking | 95% | 98% | 99% | 99% |
| Pedidos | 90% | 93% | 95% | 97% |
| Costos | 85% | 88% | 92% | 95% |
| Ciclos | 80% | 85% | 90% | 93% |
| Consolidado | 75% | 80% | 85% | 90% |
| Dashboard | 50% | 60% | 75% | 90% |
| Presupuesto | 0% | 10% | 70% | 95% |
| Recomendaciones | 0% | 20% | 60% | 90% |
| **PROMEDIO** | **7.0** | **7.5** | **8.5** | **9.3** |

---

**Próximos pasos:**
1. Priorizar cuál feature implementar primero (recomendación: Notificaciones)
2. Asignar recursos (1-2 developers)
3. Crear branches en git para cada feature
4. Ejecutar en sprints de 1-2 semanas

¿Con cuál feature comienzas?
