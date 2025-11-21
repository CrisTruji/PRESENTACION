// src/components/navbar.jsx (fragmento con cambio)
import { useAuth } from "../context/auth";
// ...
export default function Navbar() {
  const { navigate } = useRouter();
  const { session, profile, roleName, signOut, canPerform } = useAuth();

  return (
    <header style={header}>
      {/* ... */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {session && <div style={{ color: "#374151" }}>{profile?.nombre || session.email} <small style={{ marginLeft:8, color:'#6b7280' }}>({roleName || "sin rol"})</small></div>}
        <button onClick={() => signOut()} style={logoutBtn}>Cerrar sesión</button>
      </div>
    </header>
  );
}
