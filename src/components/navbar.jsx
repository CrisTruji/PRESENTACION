import { useState, useEffect } from "react";
import { useRouter } from "../router";
import { useAuth } from "../context/auth";

// Iconos SVG
const icons = {
  dashboard: (
    <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  requests: (
    <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  invoices: (
    <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  products: (
    <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  suppliers: (
    <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  create: (
    <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  management: (
    <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  reception: (
    <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  tree: (
    <svg className="sidebar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
    </svg>
  ),
  sun: (
    <svg className="theme-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  moon: (
    <svg className="theme-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
};

export default function Navbar() {
  const { navigate, currentScreen } = useRouter();
  const { session, profile, roleName, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState(() => {
    // Verificar tema guardado en localStorage o preferencia del sistema
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Aplicar tema al cargar y cambiar
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle tema
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Detectar scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Configuración de navegación por rol con iconos
  const getTabsByRole = () => {
    const tabs = {
      administrador: [
        { label: "Dashboard", name: "admin_dashboard", icon: icons.dashboard },
        { label: "Solicitudes de Acceso", name: "admin_requests", icon: icons.requests },
        { label: "Inventario", name: "inventario", icon: icons.products },
        { label: "Gestión de Stock", name: "stock_manager", icon: icons.products },
        { label: "Auditoría", name: "auditoria_viewer", icon: icons.requests },
        { label: "Facturas", name: "facturas", icon: icons.invoices },
        { label: "Arboles", name: "selector_arboles", icon: icons.tree },
        { label: "Vincular Presentaciones", name: "vincular_presentaciones", icon: icons.products },
      ],
      jefe_de_planta: [
        { label: "Crear Solicitud", name: "crear_solicitud", icon: icons.create },
        { label: "Solicitudes", name: "solicitudes_planta", icon: icons.requests },
        { label: "Productos", name: "productos", icon: icons.products },
        { label: "Proveedores", name: "proveedores", icon: icons.suppliers },
      ],
      jefe_de_compras: [
        { label: "Gestión de Compras", name: "gestion_compras", icon: icons.management },
        { label: "Solicitudes", name: "solicitudes_planta", icon: icons.requests },
        { label: "Facturas", name: "facturas", icon: icons.invoices },
      ],
      auxiliar_de_compras: [
        { label: "Solicitudes", name: "gestion_aux", icon: icons.requests },
        { label: "Gestión de Compras", name: "gestion_compras", icon: icons.management },
      ],
      almacenista: [
        { label: "Recepción", name: "recepcion_factura", icon: icons.reception },
        { label: "Facturas", name: "facturas", icon: icons.invoices },
        { label: "Proveedores", name: "proveedores", icon: icons.suppliers },
      ],
    };

    return tabs[roleName] || [
      { label: "Proveedores", name: "proveedores", icon: icons.suppliers },
      { label: "Productos", name: "productos", icon: icons.products },
    ];
  };

  const tabs = getTabsByRole();
  const currentTab = tabs.find(tab => tab.name === currentScreen?.name);

  return (
    <>
      {/* Barra lateral */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Logo */}
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <img
                src="logo.png"
                alt="Logo Healthy"
                className="sidebar-logo-icon"
              />
              <div>
                <div className="sidebar-logo-text">Healthy</div>
                <div className="sidebar-logo-subtext">Servicios de Catering</div>
              </div>
            </div>
          </div>

          {/* Menú de navegación */}
          <div className="flex-1 overflow-auto py-4">
            <div className="sidebar-section">Inventario</div>
            <div className="sidebar-menu">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => {
                    navigate(tab.name);
                    setSidebarOpen(false);
                  }}
                  className={`sidebar-button ${
                    currentScreen?.name === tab.name ? 'sidebar-button-active' : ''
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer con usuario y controles */}
          {session && (
            <div className="sidebar-footer">
              {/* Botón de toggle de tema */}
              <button
                onClick={toggleTheme}
                className="theme-toggle"
              >
                <span>{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
                {theme === 'light' ? icons.moon : icons.sun}
              </button>

              {/* Información del usuario */}
              <div className="flex items-center gap-3 mb-4">
                <div className="user-avatar">
                  {profile?.nombre?.charAt(0) ||
                    session.user.email?.charAt(0) ||
                    "U"}
                </div>
                <div className="flex-1">
                  <div className="user-name">
                    {profile?.nombre || session.user.email}
                  </div>
                  <div className="user-role">
                    {roleName || "Sin rol asignado"}
                  </div>
                </div>
              </div>

              {/* Botón de cerrar sesión */}
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setTimeout(() => signOut(), 300);
                }}
                className="logout-button"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay para cerrar sidebar */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navbar principal */}
      <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="navbar-toggle"
        >
          <img
            src="logo.png"
            alt="Logo Healthy"
            className="navbar-logo"
          />
          <strong className="navbar-title">
            Healthy
          </strong>
        </button>

        {/* Indicador de ubicación actual */}
        {currentTab && (
          <div className="navbar-indicator">
            {currentTab.icon}
            <span>{currentTab.label}</span>
          </div>
        )}

        {/* Espacio derecho para balance */}
        <div className="w-15"></div>
      </header>

      {/* Espacio para que el contenido no quede detrás del navbar */}
      <div className="navbar-spacer"></div>
    </>
  );
}