/* El CSS entra dentro del HTML, no por <link>.
 *
 * Con la hoja aparte el navegador no puede pintar nada hasta que termina de
 * pedirla: en movil eso eran 600 ms de espera en blanco, el ida y vuelta de
 * una peticion mas, no el peso del fichero. Dentro del HTML llega en la misma
 * respuesta y el retraso desaparece. De paso se acorta la cadena de las
 * tipografias, que antes era HTML -> CSS -> fuente y ahora es HTML -> fuente.
 *
 * Lo que cuesta: la hoja deja de guardarse en cache, asi que cada pagina que
 * se visita carga sus ~9 KB comprimidos otra vez. Para una web de folleto, en
 * la que casi nadie pasa de dos paginas, sale a favor.
 *
 * ds.css se sigue copiando a /assets/css/ porque un HTML viejo guardado en
 * algun navegador todavia lo pide.
 */
const fs = require("fs");
const path = require("path");

const FUENTE = path.join(__dirname, "..", "assets", "css", "ds.css");

/* Minificado a proposito corto de miras: fuera los comentarios (13 de los 56 KB
 * del fichero) y los espacios alrededor de { } y ;. No toca los dos puntos ni
 * las comas, que es donde se rompen los minificadores escritos a mano:
 * calc(100% - 10px) necesita sus espacios y un selector puede llevarlos. Con
 * esto el fichero baja a ~38 KB, que es casi todo lo que daria un minificador
 * de verdad, sin meter una dependencia nueva en el build. */
function minificar(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{};])\s*/g, "$1")
    .trim();
}

module.exports = () => ({ ds: minificar(fs.readFileSync(FUENTE, "utf8")) });
