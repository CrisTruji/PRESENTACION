// src/hooks/usesolicitudes.js
import { useEffect, useState } from "react";
import { getSolicitudes } from "../../services/solicitudes";

export default function useSolicitudes({ created_by } = {}) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetch() {
    setLoading(true);
    try {
      const data = await getSolicitudes({ created_by });
      setSolicitudes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch();
  }, [created_by]);

  return { solicitudes, loading, refetch: fetch };
}
