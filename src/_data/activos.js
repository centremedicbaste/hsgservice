/* Huella de cada fichero de /assets/js.
 *
 * El JS se reescribe con el mismo nombre en cada despliegue, asi que no se
 * podia guardar en cache mas de una hora: quien lo tuviera se quedaba con la
 * version vieja. Con la huella en la URL (ui.js?v=3f9a1c2b) el nombre cambia
 * cuando cambia el contenido, y entonces si se puede pedir al navegador que lo
 * guarde un ano entero. Lo configura _headers.
 *
 * OJO: cualquier <script> nuevo tiene que llevar su ?v={{ activos.<nombre> }}.
 * Sin la huella, el navegador se queda con esa version un ano.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DIR = path.join(__dirname, "..", "assets", "js");

module.exports = () => {
  const huellas = {};
  for (const fichero of fs.readdirSync(DIR)) {
    if (!fichero.endsWith(".js")) continue;
    huellas[fichero.replace(/\.js$/, "")] = crypto
      .createHash("sha1")
      .update(fs.readFileSync(path.join(DIR, fichero)))
      .digest("hex")
      .slice(0, 8);
  }
  return huellas;
};
