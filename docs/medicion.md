# Medición: HSG Service, Centre Dental Basté y Centre Mèdic Basté

Documento idéntico en los tres repositorios. Si cambias algo, cámbialo en los tres.

## Cómo está montado

Cuatro ficheros, **iguales byte a byte en las tres webs**:

| Fichero | Qué hace |
|---|---|
| `src/assets/js/measurement.js` | Consentimiento, carga de GA4 y del contenedor, y todos los eventos |
| `src/assets/js/consentimiento.js` | El banner y el panel de categorías. No carga ninguna etiqueta |
| `src/_includes/atribucion.njk` | Guarda de dónde viene el visitante para que viaje con el lead |
| `src/_includes/pixel-meta.njk` | Píxel de Meta, solo si la web tiene `meta_pixel_id` |

Lo único que cambia por web está en sus datos (`global.json` / `global_index.json`):

| | HSG Service | Centre Dental Basté | Centre Mèdic Basté |
|---|---|---|---|
| `ga4_id` | G-E6MK6V95JM | G-J55TKTSEM7 | G-20MMG9M5B4 |
| `tag_manager` | GTM-W9PXPCJQ | GTM-52CNSZJZ | GTM-WVPMG322 |
| `ga4_delivery` | gtag | gtag | gtag |
| `meta_pixel_id` | *(vacío)* | *(vacío)* | 1567693248149213 |

## La regla que no se puede romper

**GA4 recibe los datos de `measurement.js`, nunca del contenedor.**

El contenedor sí se carga —ahí viven las conversiones de Google Ads y las
etiquetas de Meta, que son otras herramientas— pero no debe contener ni una
etiqueta de GA4: ni de configuración ni de evento.

Si la hay, cada dato se cuenta dos veces y **no se puede deduplicar después**.
Es el fallo más caro de esta configuración y el más fácil de cometer, porque
las dos mitades se ven bien por separado.

Para cambiar de criterio y que sea el contenedor quien hable con GA4, se pone
`"ga4_delivery": "gtm"` en los datos de esa web y se crean allí las etiquetas.
Lo uno o lo otro, nunca los dos.

## Pendiente en Tag Manager (no se puede hacer desde el código)

### Centre Mèdic Basté — GTM-WVPMG322
El contenedor anterior, GTM-MC2V22R, se dio de baja el 4/11/2026 con su cuenta
y desde entonces `gtm.js?id=GTM-MC2V22R` devuelve 404. La web se cambió a
WVPMG322 ese mismo día.

No se perdió nada: MC2V22R tenía una sola etiqueta publicada, una «Google tag»
con `{{Page URL}}` como ID de medición —rota— y ni un activador ni una
variable propia. No había conversiones de Ads dentro.

- [ ] **No recrees aquella etiqueta de GA4.** G-20MMG9M5B4 ya recibe los datos
      de `measurement.js`; una etiqueta de configuración aquí duplicaría todo.
- [ ] Comprobar en Google Ads (Objetivos → Conversiones → origen de cada
      acción) de dónde salen realmente las conversiones de Mèdic. No salían de
      ese contenedor, así que o van por gtag.js directo, o importadas de GA4.
      El formulario sigue dejando los eventos `lead` y `lead_all_on_4` en el
      dataLayer por si se quieren usar desde WVPMG322.

### Centre Dental Basté — GTM-52CNSZJZ
- [ ] **Pausar las etiquetas de GA4 ya publicadas de teléfono, WhatsApp y
      leads.** Ahora esos tres eventos los manda `measurement.js`; si las
      etiquetas siguen activas, cada llamada y cada lead se cuentan dos veces.
- [ ] Comprobar si hay además una etiqueta de configuración de GA4 y pausarla.
- [ ] Revisar qué conversiones de Ads dependían de esas etiquetas y
      reapuntarlas al evento `lead` del dataLayer.

### HSG Service — GTM-W9PXPCJQ
Conectado y comprobado: carga al aceptar, después de GA4. El contenedor está
vacío, así que hoy no hace nada; está ahí para Ads o Meta cuando haga falta.
- [ ] No crees en él una etiqueta de GA4. G-E6MK6V95JM ya recibe los datos de
      `measurement.js`; una etiqueta de configuración aquí duplicaría todo.

## Pendiente en GA4 (las tres propiedades)

- [ ] Marcar como conversión el evento `generate_lead`.
- [ ] Registrar como dimensiones personalizadas de ámbito evento:
      `form_id`, `form_name`, `lead_type`, `lead_origen`, `lead_canal`,
      `lead_tratamiento`, `lead_bloque`, `contact_destino`, `link_location`,
      `page_type`. Sin registrarlas, GA4 recibe los parámetros pero no los
      guarda y no se pueden usar en informes.
- [ ] Activar el filtro de tráfico interno (está en modo prueba en Dental y
      HSG). Filtra por `traffic_type = internal`, no por IP.
- [ ] Decidir el valor económico de un lead, si se le quiere poner.

## Cómo marcar un dispositivo del equipo

Abrir la web una vez con `?equipo=1`. Ese navegador queda marcado dos años y
sus visitas salen con `traffic_type: internal`. Con `?equipo=0` se desmarca.
Hay que hacerlo en cada dispositivo y cada navegador.

No se filtra por IP a propósito: las IPs no cubren los móviles con datos ni a
quien mire la web desde casa, y caducan solas si la conexión es dinámica.

## Qué se mide

| Evento | Cuándo |
|---|---|
| `page_view` | Automático de GA4 |
| `generate_lead` | Formulario enviado **y confirmado por el servidor** |
| `click_telefono` | Clic en un enlace `tel:` |
| `click_whatsapp` | Clic en un enlace de WhatsApp |
| `email_click` | Clic en un `mailto:` |
| `maps_click` | Clic en un enlace de Google Maps |
| `scroll_depth` | Al pasar el 25, 50, 75 y 90 % de la página |
| `lp_click` | Vídeos y CTA medidos de las landings |

Cada clic se cuenta una vez aunque se pulse varias veces seguidas (guarda de
un segundo) y aunque se pulse el icono de dentro del enlace en vez del enlace.

Los formularios con `data-lead` se miden al enviar, porque hacen un POST que
se lleva la página por delante. Los que envían por `fetch` **no** llevan
`data-lead`: llaman a `siteMeasurement.lead()` cuando el servidor confirma, y
así no se cuentan los envíos que fallan. Un formulario con las dos cosas
contaría cada lead dos veces.

## Consentimiento

Bloqueo previo: no se carga nada de Google ni se manda un solo evento hasta
que el visitante acepta la analítica. Rechazar cuesta lo mismo que aceptar.
Al retirar el consentimiento se borran las cookies `_ga`, `_gid`, `_gcl_` y
las de Meta, y se recarga la página.

La consecuencia hay que saberla: **las visitas de quien rechaza o se va sin
responder no se miden**, así que GA4 verá menos sesiones de las que tiene la
web. Es el precio de esta postura. La alternativa es el Consent Mode
avanzado, que carga GA4 siempre sin escribir cookies hasta que hay permiso y
deja que Analytics modele esas sesiones; es un cambio de criterio legal, no
una línea de código, y por eso no se ha tomado aquí.
