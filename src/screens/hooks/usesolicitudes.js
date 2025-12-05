import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";

export function useSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSolicitudes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("solicitudes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setSolicitudes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  return {
    solicitudes,
    loading,
    refetch: fetchSolicitudes,
  };
}
