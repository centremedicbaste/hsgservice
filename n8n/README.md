# Alta de socios — lado servidor (n8n)

El formulario vive en `hsgservice.es/alta/` y habla con tres webhooks de n8n.
Este documento describe el contrato, la configuración obligatoria y cómo montar
los tres flujos.

---

## 0. Antes de nada: configuración de n8n

**Sin esto, n8n guardará copias del DNI y del IRPF de los socios dentro de su
base de datos Postgres**, duplicadas respecto a donde las guardes a propósito,
sin política de borrado y visibles para cualquiera que entre al panel.

Añade al servicio `n8n` en el `docker-compose.yml`:

```yaml
environment:
  # Los binarios van al disco, no a la base de datos
  N8N_DEFAULT_BINARY_DATA_MODE: filesystem
  # No conservar el payload de las ejecuciones correctas
  EXECUTIONS_DATA_SAVE_ON_SUCCESS: none
  # Limpiar el historial de errores a los 3 días
  EXECUTIONS_DATA_PRUNE: "true"
  EXECUTIONS_DATA_MAX_AGE: "72"
  # Subidas de hasta 10 MB por archivo, con margen
  N8N_PAYLOAD_SIZE_MAX: "16"
```

Y un volumen dedicado para los expedientes, **separado** del volumen de datos de
n8n:

```yaml
volumes:
  - hsg_expedientes:/data/expedientes
```

Ese volumen **no se publica por Caddy**. No debe existir ninguna URL que sirva
esos archivos.

Después: `docker compose up -d`.

---

## 1. Contrato con el formulario

Base: `https://n8n.digitalstrategy.es/webhook`
(cuando EBS cree el registro, pasará a `https://alta.hsgservice.es/webhook`;
es un solo atributo `data-endpoint` en `src/pages/alta.njk`).

### `POST /hsg-alta-crear`

Crea el expediente. Cuerpo JSON:

```json
{
  "tipo": "autonomo",
  "titular": "...",
  "clinica": "...",
  "nif": "...",
  "localidad": "...",
  "email": "...",
  "telefono": "..."
}
```

Respuesta esperada:

```json
{ "ok": true, "id": "ALTA-2026-0001" }
```

El `id` se le muestra al socio como referencia, así que debe ser legible.

### `POST /hsg-alta-documento`

`multipart/form-data` con tres campos: `id`, `documento` (identificador del tipo
de documento) y `archivo` (el fichero). Se llama una vez por documento, en
cuanto el socio lo selecciona.

Respuesta: `{ "ok": true }`

### `POST /hsg-alta-finalizar`

Cuerpo JSON `{ "id": "ALTA-2026-0001" }`. Cierra el expediente y dispara el
aviso al equipo.

Respuesta: `{ "ok": true }`

---

## 2. Identificadores de documento

El formulario envía estos valores en el campo `documento`:

**Autónomo:** `alta-seguridad-social`, `alta-hacienda`, `dni-titular`,
`tarjeta-colegial`, `certificado-cuenta`, `recibo-autonomo`, `irpf`

**Sociedad:** `escrituras-constitucion`, `escrituras-poderes` (opcional),
`cif-empresa`, `dni-administrador`, `tarjeta-colegial`, `certificado-cuenta`,
`impuesto-sociedades`

---

## 3. Los tres flujos

### Flujo A — crear

**Webhook** → **Code** → **Convert to File** → **Read/Write Files from Disk** → **Respond to Webhook**

- **Webhook**: método `POST`, path `hsg-alta-crear`, *Respond* = `Using Respond to Webhook node`.
  En **Options** añade **Allowed Origins (CORS)** = `https://hsgservice.es`.
  Sin esto el navegador bloquea la petición.
- **Code**: genera el identificador y valida.

```js
const d = $input.first().json.body ?? $input.first().json;
const req = ['tipo','titular','clinica','nif','localidad','email','telefono'];
for (const k of req) {
  if (!d[k] || String(d[k]).trim() === '') throw new Error('Falta ' + k);
}
if (!['autonomo','sociedad'].includes(d.tipo)) throw new Error('tipo no válido');

const año = new Date().getFullYear();
const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
const id  = `ALTA-${año}-${rnd}`;

return [{ json: {
  id,
  ...Object.fromEntries(req.map(k => [k, String(d[k]).trim().slice(0, 200)])),
  estado: 'pendiente',
  creado: new Date().toISOString()
}}];
```

- **Convert to File**: operación `Convert to JSON`, modo `All Items to One File`.
- **Read/Write Files from Disk**: operación `Write File to Disk`,
  ruta `=/data/expedientes/{{ $('Code').first().json.id }}/solicitud.json`.
- **Respond to Webhook**: `JSON`, cuerpo
  `={{ { ok: true, id: $('Code').first().json.id } }}`.

### Flujo B — documento

**Webhook** → **Code** (validación) → **Read/Write Files from Disk** → **Respond to Webhook**

- **Webhook**: `POST`, path `hsg-alta-documento`, **Binary Property** activado,
  mismo *Allowed Origins*.
- **Code** — la validación del navegador no basta, hay que repetirla aquí:

```js
const item = $input.first();
const b = item.json.body ?? item.json;
const bin = Object.values(item.binary ?? {})[0];

if (!bin) throw new Error('Sin archivo');
if (!/^ALTA-\d{4}-[A-Z0-9]{4}$/.test(b.id || '')) throw new Error('id no válido');

const PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'];
if (!PERMITIDOS.includes(bin.mimeType)) throw new Error('Tipo no permitido');
if ((bin.fileSize ?? 0) > 10 * 1024 * 1024) throw new Error('Demasiado grande');

// El nombre lo ponemos nosotros: nunca el que llega del navegador
const doc = String(b.documento || '').replace(/[^a-z0-9-]/gi, '').slice(0, 40);
if (!doc) throw new Error('documento no válido');
const ext = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' }[bin.mimeType];

return [{ json: { id: b.id, ruta: `/data/expedientes/${b.id}/${doc}.${ext}` }, binary: item.binary }];
```

- **Read/Write Files from Disk**: `Write File to Disk`,
  ruta `={{ $json.ruta }}`, propiedad binaria la que llegue del webhook.
- **Respond to Webhook**: `JSON`, `={{ { ok: true } }}`.

### Flujo C — finalizar

**Webhook** → **Read/Write Files from Disk** (leer `solicitud.json`) → **Send Email** → **Respond to Webhook**

El correo al equipo con los datos del socio y la ruta del expediente. **Nunca
adjuntes los documentos al correo**: multiplica copias sin control. Que el aviso
lleve solo la referencia y quien tenga que revisarlos entre al servidor.

Añade también un segundo **Send Email** al socio confirmando la recepción, con
su referencia.

---

## 4. Lo que falta por decidir

- **Borrado automático.** Un flujo con *Schedule Trigger* semanal que elimine
  expedientes en estado `pendiente` con más de N meses. Hay que fijar N y
  reflejarlo en la política de privacidad.
- **Antivirus.** Pasar ClamAV a los archivos subidos antes de guardarlos.
- **Doble factor en n8n.** Quien entra al panel lo ve todo.
- **Copia de los expedientes fuera del VPS**, cifrada. La copia de OVH guarda
  solo 24 horas.

---

## 5. Comprobación

Con los tres flujos activos:

```bash
curl -X POST https://n8n.digitalstrategy.es/webhook/hsg-alta-crear \
  -H 'Content-Type: application/json' \
  -d '{"tipo":"autonomo","titular":"Prueba","clinica":"Clínica Prueba","nif":"00000000T","localidad":"Barcelona","email":"prueba@example.com","telefono":"600000000"}'
```

Debe devolver `{"ok":true,"id":"ALTA-2026-XXXX"}` y dejar el directorio
`/data/expedientes/ALTA-2026-XXXX/` creado dentro del contenedor.
