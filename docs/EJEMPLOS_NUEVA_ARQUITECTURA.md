# 📖 Ejemplos de Uso - Nueva Arquitectura

Guía práctica con ejemplos de código para trabajar con la arquitectura Feature-Sliced Design.

---

## 🎯 Tabla de Contenidos

1. [Imports con Alias](#imports-con-alias)
2. [Crear una Nueva Feature](#crear-una-nueva-feature)
3. [Crear una Página por Rol](#crear-una-página-por-rol)
4. [Componentes Shared](#componentes-shared)
5. [Testing](#testing)
6. [Patrones Comunes](#patrones-comunes)

---

## 📦 Imports con Alias

### Antes (Imports Relativos)

```jsx
// ❌ Código antiguo - imports relativos caóticos
import { StockManager } from '../../../components/stock/StockManager';
import { useStock } from '../../../hooks/useStock';
import { Button } from '../../../components/common/Button';
import { supabase } from '../../../lib/supabase';
```

### Después (Imports Absolutos)

```jsx
// ✅ Código nuevo - imports absolutos claros
import { StockManager, useStock } from '@/features/inventory';
import { Button } from '@/shared/ui';
import { supabase } from '@/shared/api';
```

**Beneficios:**
- ✅ Fácil de leer
- ✅ No se rompe si mueves el archivo
- ✅ Autocomplete funciona mejor en IDE

---

## 🏗️ Crear una Nueva Feature

### Ejemplo: Feature de Notificaciones

**1. Crear estructura de carpetas:**

```
features/notifications/
├── components/
│   ├── NotificationBell.jsx
│   ├── NotificationList.jsx
│   └── NotificationItem.jsx
├── hooks/
│   └── useNotifications.js
├── services/
│   └── notificationsService.js
├── store/
│   └── notificationsStore.js
├── __tests__/
│   ├── NotificationBell.test.jsx
│   └── useNotifications.test.js
└── index.js
```

**2. Crear Service (notificationsService.js):**

```javascript
// features/notifications/services/notificationsService.js
import { supabase } from '@/shared/api';

export const notificationsService = {
  /**
   * Obtener notificaciones del usuario
   */
  async getNotifications(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  },

  /**
   * Eliminar notificación
   */
  async deleteNotification(notificationId) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  },
};
```

**3. Crear Hook (useNotifications.js):**

```javascript
// features/notifications/hooks/useNotifications.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notificationsService';

/**
 * Hook para obtener notificaciones
 */
export function useNotifications(userId) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notificationsService.getNotifications(userId),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch cada 30s
  });
}

/**
 * Hook para marcar notificación como leída
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      // Invalidar cache para refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/**
 * Hook para eliminar notificación
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationsService.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

**4. Crear Componente (NotificationBell.jsx):**

```jsx
// features/notifications/components/NotificationBell.jsx
import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { Badge } from '@/shared/ui';
import { NotificationList } from './NotificationList';

export function NotificationBell({ userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications(userId);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-600" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <Badge
            variant="danger"
            className="absolute -top-1 -right-1"
          >
            {unreadCount}
          </Badge>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">
                {unreadCount} sin leer
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              Cargando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No hay notificaciones
            </div>
          ) : (
            <NotificationList
              notifications={notifications}
              onClose={() => setIsOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

**5. Crear Public API (index.js):**

```javascript
// features/notifications/index.js

// ✅ Exportar solo lo público
export { NotificationBell } from './components/NotificationBell';
export {
  useNotifications,
  useMarkAsRead,
  useDeleteNotification,
} from './hooks/useNotifications';

// ❌ NO exportar componentes internos:
// - NotificationList
// - NotificationItem
// - notificationsService
// - notificationsStore
```

**6. Usar en una Página:**

```jsx
// pages/admin/AdminDashboard.jsx
import { NotificationBell } from '@/features/notifications';
import { useAuth } from '@/features/auth';

export function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <header className="flex items-center justify-between">
        <h1>Dashboard</h1>
        <NotificationBell userId={user.id} />
      </header>
      {/* Resto del dashboard... */}
    </div>
  );
}
```

---

## 🖥️ Crear una Página por Rol

### Ejemplo: Página de Dashboard para Chef

```jsx
// pages/chef/ChefDashboard.jsx
import React from 'react';
import { DashboardLayout } from '@/widgets/Dashboard';
import { StatsCard } from '@/widgets/Dashboard';
import { RecipeList } from '@/features/recipes';
import { useAuth } from '@/features/auth';
import { useRecipes } from '@/features/recipes';

export function ChefDashboard() {
  const { user } = useAuth();
  const { data: recipes, isLoading } = useRecipes();

  return (
    <DashboardLayout
      title="Dashboard de Chef"
      userName={user.name}
    >
      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatsCard
          title="Recetas Activas"
          value={recipes?.length || 0}
          icon="🍳"
        />
        <StatsCard
          title="Recetas Pendientes"
          value={recipes?.filter(r => r.status === 'pending').length || 0}
          icon="⏳"
        />
        <StatsCard
          title="Recetas Aprobadas"
          value={recipes?.filter(r => r.status === 'approved').length || 0}
          icon="✅"
        />
      </div>

      {/* Lista de Recetas */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Mis Recetas</h2>
        {isLoading ? (
          <p>Cargando...</p>
        ) : (
          <RecipeList recipes={recipes} />
        )}
      </section>
    </DashboardLayout>
  );
}
```

### Composición: Diferentes Roles, Diferentes Features

```jsx
// pages/admin/AdminDashboard.jsx
import { StockManagerVirtualized } from '@/features/inventory';
import { AuditoriaViewer } from '@/features/audit';
import { UserManagement } from '@/features/auth';

export function AdminDashboard() {
  return (
    <DashboardLayout title="Admin Dashboard">
      <UserManagement />        {/* ✅ Solo admin */}
      <AuditoriaViewer />       {/* ✅ Solo admin */}
      <StockManagerVirtualized /> {/* ✅ Todos los roles */}
    </DashboardLayout>
  );
}
```

```jsx
// pages/almacen/AlmacenDashboard.jsx
import { StockManager } from '@/features/inventory';

export function AlmacenDashboard() {
  return (
    <DashboardLayout title="Almacén Dashboard">
      <StockManager />         {/* ✅ Solo gestión de stock */}
      {/* ❌ Sin auditoría - no tiene permisos */}
      {/* ❌ Sin user management - no tiene permisos */}
    </DashboardLayout>
  );
}
```

---

## 🧩 Componentes Shared

### Crear un Componente Shared (Button)

**1. Estructura:**

```
shared/ui/Button/
├── Button.jsx
├── Button.test.jsx
└── index.js
```

**2. Implementación (Button.jsx):**

```jsx
// shared/ui/Button/Button.jsx
import React from 'react';
import PropTypes from 'prop-types';

const variantStyles = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'bg-transparent hover:bg-gray-100',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center
        font-medium rounded-lg
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <span className="mr-2 animate-spin">⏳</span>
      )}
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func,
};
```

**3. Export (index.js):**

```javascript
// shared/ui/Button/index.js
export { Button } from './Button';
```

**4. Uso:**

```jsx
// En cualquier componente
import { Button } from '@/shared/ui/Button';

function MiComponente() {
  return (
    <div>
      <Button variant="primary" size="lg" onClick={handleSubmit}>
        Guardar
      </Button>

      <Button variant="danger" onClick={handleDelete}>
        Eliminar
      </Button>

      <Button variant="ghost" disabled>
        Deshabilitado
      </Button>

      <Button loading>
        Cargando...
      </Button>
    </div>
  );
}
```

---

## 🧪 Testing

### Test de Servicio

```javascript
// features/notifications/services/__tests__/notificationsService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationsService } from '../notificationsService';
import { supabase } from '@/shared/api';

vi.mock('@/shared/api');

describe('notificationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('debe obtener notificaciones del usuario', async () => {
      const mockNotifications = [
        { id: '1', message: 'Test 1', read: false },
        { id: '2', message: 'Test 2', read: true },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockNotifications,
          error: null,
        }),
      };

      supabase.from.mockReturnValue(mockQuery);

      const result = await notificationsService.getNotifications('user-123');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result).toEqual(mockNotifications);
    });
  });
});
```

### Test de Hook

```jsx
// features/notifications/hooks/__tests__/useNotifications.test.js
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotifications } from '../useNotifications';
import { notificationsService } from '../../services/notificationsService';

vi.mock('../../services/notificationsService');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useNotifications', () => {
  it('debe cargar notificaciones', async () => {
    const mockData = [{ id: '1', message: 'Test' }];
    notificationsService.getNotifications.mockResolvedValue(mockData);

    const { result } = renderHook(() => useNotifications('user-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});
```

### Test de Componente

```jsx
// features/notifications/components/__tests__/NotificationBell.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from '../NotificationBell';
import * as useNotificationsHook from '../../hooks/useNotifications';

vi.mock('../../hooks/useNotifications');

describe('NotificationBell', () => {
  it('debe mostrar cantidad de notificaciones no leídas', async () => {
    vi.spyOn(useNotificationsHook, 'useNotifications').mockReturnValue({
      data: [
        { id: '1', message: 'Test 1', read: false },
        { id: '2', message: 'Test 2', read: false },
        { id: '3', message: 'Test 3', read: true },
      ],
      isLoading: false,
    });

    render(<NotificationBell userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('debe abrir dropdown al hacer click', async () => {
    vi.spyOn(useNotificationsHook, 'useNotifications').mockReturnValue({
      data: [],
      isLoading: false,
    });

    const user = userEvent.setup();
    render(<NotificationBell userId="user-123" />);

    const bellButton = screen.getByRole('button');
    await user.click(bellButton);

    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
  });
});
```

---

## 🎨 Patrones Comunes

### Patrón 1: Feature Composition

```jsx
// pages/admin/SystemSettings.jsx
import { UserManagement } from '@/features/auth';
import { SystemConfig } from '@/features/config';
import { EmailSettings } from '@/features/notifications';

export function SystemSettings() {
  return (
    <div className="space-y-6">
      <section>
        <h2>Gestión de Usuarios</h2>
        <UserManagement />
      </section>

      <section>
        <h2>Configuración del Sistema</h2>
        <SystemConfig />
      </section>

      <section>
        <h2>Configuración de Emails</h2>
        <EmailSettings />
      </section>
    </div>
  );
}
```

### Patrón 2: Protected Routes con Roles

```jsx
// app/router/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

// Uso:
<Route
  path="/admin"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboard />
    </ProtectedRoute>
  }
/>
```

### Patrón 3: Shared UI con Composition

```jsx
// shared/ui/Modal/Modal.jsx
export function Modal({ children, isOpen, onClose, title }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Componentes específicos componen Modal
export function Modal.Header({ children }) {
  return <div className="border-b pb-4 mb-4">{children}</div>;
}

export function Modal.Body({ children }) {
  return <div className="mb-4">{children}</div>;
}

export function Modal.Footer({ children }) {
  return <div className="border-t pt-4 flex justify-end gap-2">{children}</div>;
}

// Uso:
<Modal isOpen={isOpen} onClose={onClose} title="Confirmar Acción">
  <Modal.Body>
    <p>¿Estás seguro de que deseas continuar?</p>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="ghost" onClick={onClose}>
      Cancelar
    </Button>
    <Button variant="danger" onClick={handleConfirm}>
      Confirmar
    </Button>
  </Modal.Footer>
</Modal>
```

---

## 📋 Checklist para Nuevas Features

Cuando crees una nueva feature, sigue este checklist:

- [ ] Crear carpeta en `features/nombre-feature/`
- [ ] Crear subcarpetas: `components/`, `hooks/`, `services/`
- [ ] Crear servicio con operaciones CRUD
- [ ] Crear hooks con TanStack Query
- [ ] Crear componentes UI
- [ ] Crear `index.js` con Public API
- [ ] Escribir tests (services, hooks, components)
- [ ] Documentar API en `README.md` interno
- [ ] Usar la feature en una página
- [ ] Verificar que tests pasan

---

## 🚀 Comandos Útiles

```bash
# Crear estructura de nueva feature
mkdir -p src/features/mi-feature/{components,hooks,services,__tests__}

# Ejecutar tests de una feature específica
npm test -- src/features/inventory

# Buscar todos los usos de una feature
grep -r "from '@/features/inventory'" src/

# Verificar que no hay imports relativos
grep -r "from '\.\./\.\./\.\." src/
```

---

**Autor:** Claude Sonnet 4.5
**Fecha:** Febrero 2026
**Versión:** 1.0
