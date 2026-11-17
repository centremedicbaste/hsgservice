// ============================================================
// Copia de cada lead en Citapanel (app.citapanel.com), el panel común de
// todos los negocios.
//
// Variables de entorno (Netlify → Site settings → Environment):
//   CITAPANEL_TOKEN  token de leads de este negocio (en Citapanel,
//                    sección «formulario»)
//   CITAPANEL_URL    opcional; por defecto la función de producción
//
// Sin token no se envía nada. Si Citapanel tarda o falla, se registra y se
// sigue: el lead ya está guardado en Netlify Forms. Los duplicados los
// resuelve Citapanel: la misma referencia dos veces no hace nada, y un
// teléfono o email que ya tiene se anota en ese lead.
// ============================================================

const URL_POR_DEFECTO = "https://psjrgkvewodgoxjuicnj.supabase.co/functions/v1/leads";

// Netlify corta las funciones a los 10 segundos: lo demás no puede quedarse
// esperando a Citapanel.
const ESPERA_MAXIMA = 4000;

async function copiaEnCitapanel(lead) {
  const token = (process.env.CITAPANEL_TOKEN || "").trim();
  if (!token) return { enviado: false, motivo: "sin_token" };

  const url = (process.env.CITAPANEL_URL || URL_POR_DEFECTO).trim();
  const cuerpo = Object.fromEntries(
    Object.entries(lead).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
  );

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-citapanel-token": token },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(ESPERA_MAXIMA),
    });
    const respuesta = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("Citapanel respondió", r.status, respuesta);
      return { enviado: false, motivo: `http_${r.status}` };
    }
    return { enviado: true, creado: respuesta.creado, motivo: respuesta.motivo };
  } catch (e) {
    console.error("No se pudo copiar el lead en Citapanel:", e.message);
    return { enviado: false, motivo: "sin_respuesta" };
  }
}

module.exports = { copiaEnCitapanel };
