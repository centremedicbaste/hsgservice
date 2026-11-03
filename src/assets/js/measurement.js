/* Medición y consentimiento.

   Este fichero es IDÉNTICO en hsgservice.es, centredentalbaste.com y
   centremedicbaste.com. Si cambias algo, cámbialo en los tres. Lo único que
   varía por web es measurement.njk, que trae los identificadores.

   ── Consentimiento básico ────────────────────────────────────────────────
   No se carga nada de Google ni se manda un solo evento antes de que el
   visitante acepte la analítica. No es modo avanzado: es bloqueo previo, que
   es lo que pide la AEPD. La consecuencia hay que saberla: las visitas de
   quien rechaza o se va sin responder no se miden, así que GA4 verá menos
   sesiones de las que tiene la web. Es el precio de esta postura.

   ── Por dónde llegan los datos a GA4 ─────────────────────────────────────
   config.delivery lo decide, y solo puede ser una de las dos:

   · 'gtag' — los manda este fichero directamente. No necesita contenedor.
   · 'gtm'  — los pone en el dataLayer y los traducen las etiquetas del
              contenedor.

   El contenedor se carga en los dos casos, si la web tiene uno: ahí viven
   las conversiones de Google Ads y las etiquetas de Meta, que son otras
   herramientas. Lo que cambia es solo quién le habla a GA4.

   Nunca las dos a la vez. Si una web entrega por 'gtag' y además tiene en el
   contenedor una etiqueta de GA4 para page_view o para cualquiera de estos
   eventos, ese dato se cuenta dos veces y no hay forma de deduplicarlo
   después. Es el fallo más caro de esta configuración y el más fácil de
   cometer, porque las dos mitades se ven bien por separado.

   ── Qué se mide ──────────────────────────────────────────────────────────
   Las mismas señales en las tres webs: page_view, lead confirmado, clic en
   teléfono, en WhatsApp, en correo, en el mapa, profundidad de scroll y
   clics medidos de landing. Los eventos de Ads y el píxel de Meta van por su
   lado, porque son otras herramientas y ahí no hay duplicado posible. */
(function () {
  'use strict';

  var config = window.measurementConfig;
  if (!config || window.siteMeasurement) return;

  var GA4 = config.ga4 || '';
  var GTM = /^GTM-[A-Z0-9]+$/.test(config.gtm || '') ? config.gtm : '';
  var porGtag = config.delivery !== 'gtm';

  // Cada previsualización de Netlify tiene su propio dominio
  // (6aa94883--centremedicbaste.netlify.app y así) y cada vez que alguien
  // abre una, esas visitas entrarían en GA4 como tráfico real. La tentación
  // es añadirlas a la lista de dominios de la etiqueta, que es justo lo que
  // no hay que hacer: son infinitas, cambian con cada despliegue y ensucian
  // los datos igual. En localhost tampoco se mide.
  var produccion = config.hosts.indexOf(location.hostname) !== -1;

  var gtagPuesto = false;
  var contenedorPuesto = false;
  var anterior = { analytics: false, marketing: false };

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function cookie(nombre) {
    var par = document.cookie.split(';').map(function (s) { return s.trim(); })
      .find(function (s) { return s.indexOf(nombre + '=') === 0; });
    return par ? par.slice(nombre.length + 1) : '';
  }

  /* ── La elección del visitante ──────────────────────────────────────────
     Las tres webs guardan lo mismo: cookie_analytics y cookie_marketing a
     'true' o 'false', y cookie_consent como marca de que ya respondió.

     Los dos bloques de compatibilidad son para no volver a preguntar a quien
     ya respondió con el formato antiguo de su web: Dental guardaba un JSON en
     cookie_consent y HSG un 'si'/'no' en localStorage. Se quedan en las tres
     para que el fichero sea el mismo; donde no se usaban, no encuentran nada
     y siguen. */
  function leer() {
    var analytics = cookie('cookie_analytics');
    if (analytics) {
      return { analytics: analytics === 'true', marketing: cookie('cookie_marketing') === 'true' };
    }

    var crudo = cookie('cookie_consent');
    if (crudo && crudo.charAt(0) === '{') {
      try {
        var j = JSON.parse(decodeURIComponent(crudo));
        return { analytics: j.analytics === true, marketing: j.marketing === true };
      } catch (error) {}
    }

    try {
      var v = localStorage.getItem('hsg-cookies');
      if (v === 'si') return { analytics: true, marketing: false };
    } catch (error) {}

    return { analytics: false, marketing: false };
  }

  function senales(eleccion) {
    return {
      analytics_storage: eleccion.analytics ? 'granted' : 'denied',
      ad_storage: eleccion.marketing ? 'granted' : 'denied',
      ad_user_data: eleccion.marketing ? 'granted' : 'denied',
      ad_personalization: eleccion.marketing ? 'granted' : 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted'
    };
  }

  /* Consent Mode no descarga una etiqueta que ya está corriendo, así que al
     retirar el consentimiento hay que borrar a mano lo que dejó escrito. */
  function borrarCookiesAnalitica() {
    document.cookie.split(';').forEach(function (par) {
      var nombre = par.trim().split('=')[0];
      if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gcl_|_fbp$|_fbc$)/.test(nombre)) return;
      ['', location.hostname, '.' + location.hostname, '.' + config.hosts[0]].forEach(function (dominio) {
        document.cookie = nombre + '=; Max-Age=0; Path=/; SameSite=Lax' + (dominio ? '; Domain=' + dominio : '');
      });
    });
  }

  /* ── Tráfico del equipo ────────────────────────────────────────────────
     El filtro «Internal Traffic» de GA4 no filtra por IP: filtra por el
     parámetro traffic_type = internal. Las IPs son solo una forma de
     ponerlo, y la peor en una clínica, porque no cubren los móviles con
     datos ni a quien mire la web desde casa, y caducan solas si la conexión
     es dinámica.

     Así que quien trabaja aquí abre una vez en cada dispositivo /?equipo=1 y
     ese navegador queda marcado dos años. Con /?equipo=0 se desmarca. La
     cookie no necesita consentimiento: la pide el propio interesado y sirve
     para dejar de medirle, no para medirle. */
  var interno = false;
  if (produccion) {
    var pedido = new URLSearchParams(location.search).get('equipo');
    if (pedido === '1' || pedido === '0') {
      document.cookie = 'baste_equipo=' + (pedido === '1' ? '1' : '') +
        '; Path=/; Max-Age=' + (pedido === '1' ? 63072000 : 0) + '; SameSite=Lax; Secure';
      // Solo lo ve quien ha escrito esa URL a propósito
      window.alert(pedido === '1'
        ? 'Listo: las visitas desde este navegador quedan marcadas como tráfico interno y no contarán en las estadísticas. Para deshacerlo, abre la web con ?equipo=0'
        : 'Hecho: este navegador vuelve a contar como una visita normal.');
    }
    interno = cookie('baste_equipo') === '1';
  }

  /* Contexto que acompaña a todo lo que se mande, para poder segmentar los
     informes sin tener que crear dimensiones a mano por cada cosa. */
  function contexto() {
    var d = {
      page_type: location.pathname === '/' ? 'home'
        : location.pathname.indexOf('/blog/') === 0 ? 'article' : 'content',
      language: document.documentElement.lang || 'es'
    };
    if (interno) d.traffic_type = 'internal';
    return d;
  }

  function cargarGtag() {
    if (gtagPuesto || !GA4) return;
    gtagPuesto = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4);
    document.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', GA4, contexto());
  }

  function cargarContenedor() {
    if (contenedorPuesto || !GTM) return;
    contenedorPuesto = true;
    window.dataLayer.push(contexto());
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM);
    document.head.appendChild(s);
  }

  function actualizar() {
    var eleccion = leer();

    // Cinturón además del tirante: si la etiqueta ya estuviera cargada por
    // cualquier vía, esto le impide mandar nada.
    window['ga-disable-' + GA4] = !produccion || !eleccion.analytics;
    if (!produccion) return;

    window.gtag('consent', 'update', senales(eleccion));

    // Sin consentimiento de publicidad, Google recorta los datos que recibe
    // de los anuncios y pasa el gclid por la URL en vez de por cookie, para
    // que la atribución de Ads no se pierda del todo.
    window.gtag('set', 'ads_data_redaction', !eleccion.marketing);
    window.gtag('set', 'url_passthrough', true);

    var retirado = (anterior.analytics && !eleccion.analytics) ||
      (anterior.marketing && !eleccion.marketing);
    anterior = eleccion;

    if (retirado) {
      // Recargar es la única forma de que el bloqueo previo vuelva a aplicarse
      // también a los eventos automáticos de una etiqueta ya cargada.
      if (!eleccion.analytics) borrarCookiesAnalitica();
      if (window.fbq) window.fbq('consent', 'revoke');
      location.reload();
      return;
    }

    if (!eleccion.analytics) return;

    // GA4 por la vía que diga delivery. El contenedor se carga igualmente
    // siempre que exista, porque dentro viven las conversiones de Google Ads
    // y las etiquetas de Meta: si no se carga, las campañas dejan de
    // registrar conversiones aunque Analytics funcione.
    if (porGtag) cargarGtag();
    cargarContenedor();
  }

  /* ── Eventos ───────────────────────────────────────────────────────────
     Lista cerrada de nombres y de parámetros. No es burocracia: en GA4 un
     evento con un nombre nuevo tarda días en poder usarse en un informe y
     los parámetros no declarados no se guardan, así que inventar nombres
     sobre la marcha es la forma más común de perder datos sin enterarse.

     Los parámetros se limpian antes de salir porque el modelo de datos de
     GTM es persistente: sin ponerlos a undefined, el valor de una
     interacción se cuela en la siguiente. */
  var permitidos = /^(generate_lead|lp_click|click_telefono|click_whatsapp|email_click|maps_click|scroll_depth|form_error)$/;
  var campos = {
    form_id: 'slug', form_name: 'slug', lead_type: 'slug', lp_action: 'slug',
    link_location: 'slug', error_code: 'slug', percent_scrolled: 'numero',
    lead_origen: 'texto', lead_canal: 'slug', lead_tratamiento: 'texto',
    lead_bloque: 'texto', contact_destino: 'texto'
  };

  function limpio(valor, tipo) {
    var v = String(valor == null ? '' : valor);
    if (tipo === 'numero') return /^(25|50|75|90)$/.test(v) ? Number(v) : null;
    if (tipo === 'slug') return /^[a-z0-9_-]{1,80}$/i.test(v) ? v : null;
    // 'texto': rutas, números de teléfono, nombres de tratamiento
    v = v.replace(/[^\w\s@.+/:-]/g, '').trim().slice(0, 100);
    return v || null;
  }

  function emitir(nombre, params) {
    if (!produccion || !permitidos.test(nombre) || !leer().analytics) return false;

    var carga = {};
    Object.keys(campos).forEach(function (k) { carga[k] = undefined; });
    Object.keys(params || {}).forEach(function (k) {
      if (!campos[k]) return;
      var v = limpio(params[k], campos[k]);
      if (v !== null) carga[k] = v;
    });

    if (porGtag) {
      // gtag no arrastra estado entre eventos, así que los undefined no hacen
      // falta y solo ensucian el informe de depuración.
      var solo = {};
      Object.keys(carga).forEach(function (k) { if (carga[k] !== undefined) solo[k] = carga[k]; });
      window.gtag('event', nombre, solo);
    } else {
      carga.event = nombre;
      window.dataLayer.push(carga);
    }
    return true;
  }

  /* Un lead confirmado. Además del evento de GA4, deja en el dataLayer el
     'lead' que esperan las etiquetas de conversión de Google Ads: son
     herramientas distintas, así que esto no duplica nada en Analytics. */
  function lead(params) {
    var d = params || {};
    var atrib = {};
    try { atrib = JSON.parse(sessionStorage.getItem('baste_atrib') || '{}'); } catch (error) {}

    emitir('generate_lead', {
      form_id: d.form_id, form_name: d.form_name, lead_type: d.lead_type,
      lead_origen: d.lead_origen || atrib.entrada || location.pathname,
      lead_canal: d.lead_canal || atrib.canal || atrib.utm_source || '',
      lead_tratamiento: d.lead_tratamiento, lead_bloque: d.lead_bloque
    });

    if (!produccion) return;
    window.dataLayer.push({ event: 'lead', lead_origen: d.lead_origen || location.pathname });
    if (d.ads_event) window.dataLayer.push({ event: d.ads_event });
  }

  window.siteMeasurement = { updateConsent: actualizar, emit: emitir, lead: lead };

  window.actualizarConsentimiento = function () {
    actualizar();
    if (leer().marketing && window.cargarPixelMeta) window.cargarPixelMeta();
  };

  window.medirClic = function (accion) { emitir('lp_click', { lp_action: accion }); };

  if (produccion) window.gtag('consent', 'default', senales({ analytics: false, marketing: false }));
  actualizar();
  if (leer().marketing && window.cargarPixelMeta) window.cargarPixelMeta();

  /* ── Clics de contacto ─────────────────────────────────────────────────
     Un solo listener delegado, no uno por enlace: así cubre también los que
     aparecen después (el botón flotante de WhatsApp, los modales, los
     carruseles) sin volver a enlazar nada. Y se cuenta el enlace, no lo que
     hay dentro: un clic sobre el <svg> de un <a> y otro sobre el <a> son dos
     eventos distintos para el navegador según el tema, y closest() los
     reduce al mismo sitio. */
  var ultimo = { clave: '', t: 0 };
  document.addEventListener('click', function (evento) {
    var enlace = evento.target.closest && evento.target.closest('a[href]');
    if (!enlace) return;

    var url;
    try { url = new URL(enlace.href, location.href); } catch (error) { return; }

    var nombre = url.protocol === 'tel:' ? 'click_telefono'
      : url.protocol === 'mailto:' ? 'email_click'
      : /^(wa\.me|www\.wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)$/.test(url.hostname) ? 'click_whatsapp'
      : /^(maps\.app\.goo\.gl|maps\.google\.com)$/.test(url.hostname)
        || (/^(www\.)?google\.[a-z.]+$/.test(url.hostname) && url.pathname.indexOf('/maps') === 0)
        || (url.hostname === 'goo.gl' && url.pathname.indexOf('/maps') === 0) ? 'maps_click'
      : null;
    if (!nombre) return;

    // El destino separa en los informes el móvil del fijo, o un WhatsApp de
    // otro. Solo el número, sin el texto prerrellenado del mensaje.
    var destino = url.protocol === 'tel:' ? url.pathname.replace(/[\s.-]/g, '')
      : url.protocol === 'mailto:' ? url.pathname
      : nombre === 'click_whatsapp' ? (url.pathname.replace(/\D/g, '') || url.searchParams.get('phone') || '')
      : '';

    // El doble clic impaciente en un botón de llamar es un contacto, no dos
    var clave = nombre + destino;
    var ahora = Date.now();
    if (ultimo.clave === clave && ahora - ultimo.t < 1000) return;
    ultimo = { clave: clave, t: ahora };

    emitir(nombre, {
      contact_destino: destino,
      link_location: enlace.closest('footer') ? 'footer' : enlace.closest('header') ? 'header' : 'content'
    });
  });

  /* ── Formularios que navegan de verdad ────────────────────────────────
     Los formularios con data-lead hacen un POST nativo y se llevan la página
     por delante, así que el lead se mide en el 'submit': el evento sale por
     sendBeacon y sobrevive a la navegación.

     Los formularios que envían por fetch NO llevan data-lead. Esos llaman a
     siteMeasurement.lead() ellos mismos cuando el servidor confirma, que es
     lo correcto: así no se cuentan los envíos que fallan. Si un formulario
     llevara las dos cosas, cada lead se contaría dos veces. */
  document.addEventListener('submit', function (evento) {
    var form = evento.target;
    if (!form || !form.hasAttribute || !form.hasAttribute('data-lead')) return;
    lead({
      form_id: form.getAttribute('data-lead') || 'formulario',
      form_name: form.getAttribute('name') || form.getAttribute('data-lead') || 'formulario',
      lead_type: 'contact'
    });
  });

  var hitos = {};
  window.addEventListener('scroll', function () {
    var raiz = document.documentElement;
    var total = raiz.scrollHeight - window.innerHeight;
    if (total <= 0) return;
    var porcentaje = 100 * window.scrollY / total;
    [25, 50, 75, 90].forEach(function (hito) {
      if (hitos[hito] || porcentaje < hito) return;
      hitos[hito] = true;
      emitir('scroll_depth', { percent_scrolled: hito });
    });
  }, { passive: true });
})();
