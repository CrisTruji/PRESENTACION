// src/hooks/useSolicitudes.js
import { useEffect, useState } from "react";
import { getPendingSolicitudes } from "../services/solicitudes";

export default function useSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data, error } = await getPendingSolicitudes();
      if (mounted) {
        setSolicitudes(data || []);
        setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, []);

  return { solicitudes, loading, refresh: async () => {
    const { data } = await getPendingSolicitudes(); setSolicitudes(data || []);
  } };
}
