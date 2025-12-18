import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-API-Key",
};

const VALID_API_KEY = "METRIX_KEY_2024_PROD_a8f3c9e1b4d7f2a5e9c3b6d8f1a4e7c2";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const apiKey = req.headers.get("X-API-Key");
    
    if (!apiKey || apiKey !== VALID_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid API Key" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const metric = url.searchParams.get("metric");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    if (metric) {
      const specificMetric = await getSpecificMetric(supabase, metric, startDate, endDate);
      return new Response(JSON.stringify(specificMetric), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [serviceStats, testStats, userStats, dailyStats, technicianStats, deviceChangeStats] = await Promise.all([
      getServiceStatistics(supabase, startDate, endDate),
      getTestStatistics(supabase, startDate, endDate),
      getUserStatistics(supabase),
      getDailyStatistics(supabase, startDate, endDate),
      getTechnicianStatistics(supabase, startDate, endDate),
      getDeviceChangeStatistics(supabase, startDate, endDate),
    ]);

    const response = {
      timestamp: new Date().toISOString(),
      period: {
        start: startDate || "all_time",
        end: endDate || "now",
      },
      metrics: {
        services: serviceStats,
        tests: testStats,
        users: userStats,
        daily: dailyStats,
        technicians: technicianStats,
        device_changes: deviceChangeStats,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function getSpecificMetric(supabase: any, metric: string, startDate: string | null, endDate: string | null) {
  switch (metric) {
    case "services":
      return await getServiceStatistics(supabase, startDate, endDate);
    case "tests":
      return await getTestStatistics(supabase, startDate, endDate);
    case "users":
      return await getUserStatistics(supabase);
    case "daily":
      return await getDailyStatistics(supabase, startDate, endDate);
    case "technicians":
      return await getTechnicianStatistics(supabase, startDate, endDate);
    case "device_changes":
      return await getDeviceChangeStatistics(supabase, startDate, endDate);
    default:
      throw new Error("Invalid metric requested");
  }
}

async function getServiceStatistics(supabase: any, startDate: string | null, endDate: string | null) {
  let query = supabase.from("expedientes_servicio").select("*");
  
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data: services, error } = await query;
  if (error) throw error;

  const total = services.length;
  const byStatus = services.reduce((acc: any, s: any) => {
    acc[s.validation_final_status || "unknown"] = (acc[s.validation_final_status || "unknown"] || 0) + 1;
    return acc;
  }, {});

  const byServiceType = services.reduce((acc: any, s: any) => {
    acc[s.service_type || "unknown"] = (acc[s.service_type || "unknown"] || 0) + 1;
    return acc;
  }, {});

  const byTipoActa = services.reduce((acc: any, s: any) => {
    acc[s.tipo_de_acta || "unknown"] = (acc[s.tipo_de_acta || "unknown"] || 0) + 1;
    return acc;
  }, {});

  const withPrefolio = services.filter((s: any) => s.prefolio_realizado).length;
  const avgRetryCount = services.reduce((sum: number, s: any) => sum + (s.test_retry_count || 0), 0) / total;

  const completed = services.filter((s: any) => 
    s.validation_final_status === "Aprobado" || 
    s.validation_final_status === "Completado"
  ).length;

  const failed = services.filter((s: any) => 
    s.validation_final_status === "Rechazado" || 
    s.validation_final_status === "Fallido"
  ).length;

  const pending = services.filter((s: any) => 
    s.validation_final_status === "Pendiente de Inicio" || 
    s.validation_final_status === "En Proceso"
  ).length;

  return {
    total,
    completed,
    failed,
    pending,
    success_rate: total > 0 ? ((completed / total) * 100).toFixed(2) : "0.00",
    by_status: byStatus,
    by_service_type: byServiceType,
    by_tipo_acta: byTipoActa,
    with_prefolio: withPrefolio,
    prefolio_rate: total > 0 ? ((withPrefolio / total) * 100).toFixed(2) : "0.00",
    avg_retry_count: avgRetryCount.toFixed(2),
  };
}

async function getTestStatistics(supabase: any, startDate: string | null, endDate: string | null) {
  let query = supabase.from("device_test_sessions").select("*");
  
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data: tests, error } = await query;
  if (error) throw error;

  const total = tests.length;
  const activeSessions = tests.filter((t: any) => t.session_active).length;

  const ignicionSuccess = tests.filter((t: any) => t.ignicion_exitosa).length;
  const botonSuccess = tests.filter((t: any) => t.boton_exitoso).length;
  const ubicacionSuccess = tests.filter((t: any) => t.ubicacion_exitosa).length;
  const bloqueoSuccess = tests.filter((t: any) => t.bloqueo_exitoso).length;
  const desbloqueoSuccess = tests.filter((t: any) => t.desbloqueo_exitoso).length;
  const buzzerSuccess = tests.filter((t: any) => t.buzzer_exitoso).length;
  const buzzerOffSuccess = tests.filter((t: any) => t.buzzer_off_exitoso).length;

  const avgAttempts = tests.reduce((sum: number, t: any) => sum + (t.intentos_realizados || 0), 0) / total;

  return {
    total_sessions: total,
    active_sessions: activeSessions,
    test_success_rates: {
      ignicion: total > 0 ? ((ignicionSuccess / total) * 100).toFixed(2) : "0.00",
      boton: total > 0 ? ((botonSuccess / total) * 100).toFixed(2) : "0.00",
      ubicacion: total > 0 ? ((ubicacionSuccess / total) * 100).toFixed(2) : "0.00",
      bloqueo: total > 0 ? ((bloqueoSuccess / total) * 100).toFixed(2) : "0.00",
      desbloqueo: total > 0 ? ((desbloqueoSuccess / total) * 100).toFixed(2) : "0.00",
      buzzer: total > 0 ? ((buzzerSuccess / total) * 100).toFixed(2) : "0.00",
      buzzer_off: total > 0 ? ((buzzerOffSuccess / total) * 100).toFixed(2) : "0.00",
    },
    avg_attempts_per_session: avgAttempts.toFixed(2),
  };
}

async function getUserStatistics(supabase: any) {
  const { data: users, error } = await supabase.from("user_profiles").select("*");
  if (error) throw error;

  const total = users.length;
  const active = users.filter((u: any) => u.active).length;
  const byRole = users.reduce((acc: any, u: any) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return {
    total_users: total,
    active_users: active,
    inactive_users: total - active,
    by_role: byRole,
  };
}

async function getDailyStatistics(supabase: any, startDate: string | null, endDate: string | null) {
  let query = supabase.from("expedientes_servicio").select("created_at, validation_final_status");
  
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data: services, error } = await query;
  if (error) throw error;

  const dailyData = services.reduce((acc: any, s: any) => {
    const date = new Date(s.created_at).toISOString().split("T")[0];
    if (!acc[date]) {
      acc[date] = { total: 0, completed: 0, failed: 0, pending: 0 };
    }
    acc[date].total++;
    
    if (s.validation_final_status === "Aprobado" || s.validation_final_status === "Completado") {
      acc[date].completed++;
    } else if (s.validation_final_status === "Rechazado" || s.validation_final_status === "Fallido") {
      acc[date].failed++;
    } else {
      acc[date].pending++;
    }
    
    return acc;
  }, {});

  return dailyData;
}

async function getTechnicianStatistics(supabase: any, startDate: string | null, endDate: string | null) {
  let query = supabase.from("expedientes_servicio").select("technician_name, validation_final_status, test_retry_count");
  
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data: services, error } = await query;
  if (error) throw error;

  const techStats = services.reduce((acc: any, s: any) => {
    const techName = s.technician_name || "Unknown";
    if (!acc[techName]) {
      acc[techName] = { total: 0, completed: 0, failed: 0, pending: 0, total_retries: 0 };
    }
    acc[techName].total++;
    acc[techName].total_retries += (s.test_retry_count || 0);
    
    if (s.validation_final_status === "Aprobado" || s.validation_final_status === "Completado") {
      acc[techName].completed++;
    } else if (s.validation_final_status === "Rechazado" || s.validation_final_status === "Fallido") {
      acc[techName].failed++;
    } else {
      acc[techName].pending++;
    }
    
    return acc;
  }, {});

  Object.keys(techStats).forEach(tech => {
    const stats = techStats[tech];
    stats.success_rate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(2) : "0.00";
    stats.avg_retries = stats.total > 0 ? (stats.total_retries / stats.total).toFixed(2) : "0.00";
  });

  return techStats;
}

async function getDeviceChangeStatistics(supabase: any, startDate: string | null, endDate: string | null) {
  let query = supabase
    .from("expedientes_servicio")
    .select("device_esn_cambio_cantidad, device_esn_cambio_motivo, device_esn_anterior, device_esn, created_at")
    .not("device_esn_cambio_cantidad", "is", null)
    .gt("device_esn_cambio_cantidad", 0);
  
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data: changes, error } = await query;
  if (error) throw error;

  const totalChanges = changes.reduce((sum: number, c: any) => sum + (c.device_esn_cambio_cantidad || 0), 0);
  const servicesWithChanges = changes.length;

  const byReason = changes.reduce((acc: any, c: any) => {
    const reason = c.device_esn_cambio_motivo || "unknown";
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {});

  return {
    total_device_changes: totalChanges,
    services_with_changes: servicesWithChanges,
    changes_by_reason: byReason,
    avg_changes_per_service: servicesWithChanges > 0 ? (totalChanges / servicesWithChanges).toFixed(2) : "0.00",
  };
}
