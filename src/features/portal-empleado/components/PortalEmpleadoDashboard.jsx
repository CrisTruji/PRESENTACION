// src/features/portal-empleado/components/PortalEmpleadoDashboard.jsx
// Pantalla principal del portal de empleados - tabs de navegación
import React, { useState } from "react";
import { User, FileText, Umbrella, Shield, FolderOpen, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth";
import { useEmpleadoPerfil } from "../hooks/useEmpleadoPerfil";
import MiInformacion from "./MiInformacion";
import Desprendibles from "./Desprendibles";
import Vacaciones from "./Vacaciones";
import Incapacidades from "./Incapacidades";
import MisDocumentos from "./MisDocumentos";

const TABS = [
  { id: "info",          label: "Mi Información",  icon: User },
  { id: "desprendibles", label: "Desprendibles",   icon: FileText },
  { id: "vacaciones",    label: "Vacaciones",       icon: Umbrella },
  { id: "incapacidades", label: "Incapacidades",    icon: Shield },
  { id: "documentos",    label: "Mis Documentos",   icon: FolderOpen },
];

export default function PortalEmpleadoDashboard() {
  const [tabActiva, setTabActiva] = useState("info");
  const { signOut } = useAuth();
  const { empleado, loading } = useEmpleadoPerfil();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted text-sm">Cargando tu información...</p>
        </div>
      </div>
    );
  }

  if (!empleado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="card p-10 text-center max-w-md">
          <User size={48} className="mx-auto mb-4 text-muted" />
          <h2 className="text-lg font-semibold text-primary mb-2">Perfil no encontrado</h2>
          <p className="text-muted text-sm mb-4">
            Tu cuenta aún no está vinculada a un empleado en el sistema.
            Contacta a Talento Humano.
          </p>
          <button onClick={signOut} className="btn btn-outline">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  const nombreCompleto = `${empleado.nombres} ${empleado.apellidos}`;
  const iniciales = `${empleado.nombres?.[0] ?? ""}${empleado.apellidos?.[0] ?? ""}`;

  return (
    <div className="min-h-screen bg-app flex flex-col">
      {/* ── Topbar ── */}
      <header className="bg-surface border-b border-base sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo / Marca */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-base flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "var(--color-primary)" }}
            >
              H
            </div>
            <span className="font-semibold text-primary text-sm hidden sm:block">
              Healthy SC · Portal Empleados
            </span>
          </div>

          {/* Usuario + Cerrar sesión */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="user-avatar !w-8 !h-8 text-xs">{iniciales}</div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-primary leading-tight">{nombreCompleto}</p>
                <p className="text-xs text-muted">{empleado.cargo || "Empleado"}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="btn btn-icon btn-outline"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Tab Nav ── */}
      <nav className="bg-surface border-b border-base">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const activa = tabActiva === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                    border-b-2 transition-colors
                    ${activa
                      ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                      : "border-transparent text-secondary hover:text-primary hover:border-base"
                    }
                  `}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── Contenido ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {tabActiva === "info"          && <MiInformacion empleado={empleado} />}
        {tabActiva === "desprendibles" && <Desprendibles empleadoId={empleado.id} />}
        {tabActiva === "vacaciones"    && <Vacaciones empleadoId={empleado.id} empleado={empleado} />}
        {tabActiva === "incapacidades" && <Incapacidades empleadoId={empleado.id} />}
        {tabActiva === "documentos"    && <MisDocumentos empleadoId={empleado.id} />}
      </main>
    </div>
  );
}
