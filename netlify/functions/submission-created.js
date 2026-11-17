// ============================================================
// Copia cada lead del formulario en Citapanel (ver lib/citapanel.js).
//
// Netlify invoca esta función sola al registrar un envío verificado de
// Netlify Forms: el nombre del fichero (submission-created) es lo que activa
// el disparador. Mismo circuito que Centre Dental Basté y Centre Mèdic Basté.
//
// Quien avisa por Telegram es Citapanel (con sus botones). Si Citapanel no
// responde, sale un aviso de reserva desde aquí para que ningún lead se quede
// sin avisar.
//
// Variables de entorno (Netlify → Site settings → Environment):
//   CITAPANEL_TOKEN     token del negocio HSG Service en Citapanel (sin él no hace nada)
//   TELEGRAM_BOT_TOKEN  token del bot, solo para el aviso de reserva
//   TELEGRAM_CHAT_ID    canal de leads de HSG Service
// ============================================================

const { copiaEnCitapanel } = require("../lib/citapanel");

exports.handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch (e) {
    console.error("Cuerpo de la petición ilegible:", e.message);
    return { statusCode: 200, body: "cuerpo ilegible" };
  }

  const d = payload.data || {};

  // bot-field es la trampa del formulario: una persona no lo ve. Si viene
  // relleno, es un robot que Netlify no ha cazado.
  if (String(d["bot-field"] || "").trim()) {
    return { statusCode: 200, body: "descartado" };
  }

  const copia = await copiaEnCitapanel({
    nombre: d.nombre,
    telefono: d.telefono,
    email: d.email,
    mensaje: mensajeCompleto(d),
    // En HSG el formulario pide la clínica del interesado (es B2B)
    empresa: d.clinica,
    // Netlify añade la página desde la que se envió el formulario
    pagina: d.referrer,
    origen: "web",
    formulario: payload.form_name,
    // El id del envío: si Netlify reintenta, Citapanel no lo duplica
    referencia: payload.id ? `netlify:${payload.id}` : undefined,
  });

  if (copia.enviado) {
    return { statusCode: 200, body: copia.creado ? "avisa Citapanel" : "duplicado en Citapanel" };
  }

  // Citapanel no lo recibió: aviso de reserva, sin botones.
  console.warn("Citapanel no recibió el lead:", copia.motivo);
  await avisoDeReserva(d, payload.form_name);

  // Siempre 200: el lead ya está en Netlify y un error solo provocaría
  // reintentos.
  return { statusCode: 200, body: "ok" };
};

// El tipo de consulta va delante del mensaje para que se vea en el aviso.
function mensajeCompleto(d) {
  const partes = [
    d.consulta && `Consulta: ${d.consulta}`,
    d.mensaje && String(d.mensaje).trim(),
  ].filter(Boolean);
  return partes.length ? partes.join("\n\n") : undefined;
}

const escapar = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function avisoDeReserva(d, formulario) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.warn("Sin aviso de reserva: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID");
    return;
  }
  const lineas = [
    `<b>Lead nuevo · HSG Service</b>${formulario ? ` · ${escapar(formulario)}` : ""}`,
    "<i>(aviso de reserva: Citapanel no respondió; míralo en Netlify)</i>",
    "",
    d.nombre && `Nombre: ${escapar(d.nombre)}`,
    d.clinica && `Clínica: ${escapar(d.clinica)}`,
    d.consulta && `Consulta: ${escapar(d.consulta)}`,
    d.telefono && `Teléfono: ${escapar(d.telefono)}`,
    d.email && `Email: ${escapar(d.email)}`,
    d.mensaje && `Mensaje: ${escapar(String(d.mensaje).slice(0, 600))}`,
  ].filter((l) => l !== undefined && l !== null && l !== false && l !== "");
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: lineas.join("\n"), parse_mode: "HTML", disable_web_page_preview: true }),
    });
    if (!r.ok) console.error("Telegram respondió", r.status, await r.text());
  } catch (e) {
    console.error("No se pudo avisar por Telegram:", e.message);
  }
}
