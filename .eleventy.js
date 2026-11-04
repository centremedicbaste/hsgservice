const path = require("path");
const { DateTime } = require("luxon");
const pluginTOC = require("eleventy-plugin-toc");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItHighlightJS = require("markdown-it-highlightjs");
const embeds = require("eleventy-plugin-embed-everything");
const eleventyWebcPlugin = require("@11ty/eleventy-plugin-webc");
const { eleventyImagePlugin } = require("@11ty/eleventy-img");
const mdOptions = {
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
};
// Solo ids en los encabezados. Los permalinks generaban un <a> con un espacio
// por encabezado: invisible, sin nombre accesible y sin utilidad.
const mdAnchorOpts = {
  permalink: false,
  level: [1, 2, 3, 4],
};
module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("./src/assets");
  eleventyConfig.addPassthroughCopy("src/site.webmanifest");
  eleventyConfig.addPassthroughCopy("src/_redirects");
  eleventyConfig.addPassthroughCopy("src/_headers");

  // ds.css ya no se enlaza: lo incrusta base.njk leyendolo desde
  // src/_data/estilos.js. Sin esto, en `npm start` habria que reiniciar el
  // servidor para ver un cambio de estilos.
  eleventyConfig.addWatchTarget("./src/assets/css/ds.css");



  // --- SEO: atributos de imagen inyectados en build -------------------------
  // Recorre el HTML final y, para cada <img>:
  //   * normaliza width/height invalidos: el atributo HTML solo admite enteros,
  //     asi que width="150px" pasa a width="150" y width="100%" se mueve a
  //     style="width:100%" para no cambiar como se ve.
  //   * anade width y height leidos del fichero real, manteniendo la proporcion
  //     si ya habia uno de los dos, para que el navegador reserve el hueco y la
  //     pagina no de saltos al cargar (CLS). Requiere img{height:auto} en CSS.
  //   * anade loading y decoding: la primera imagen de cada pagina se marca
  //     eager y con prioridad alta porque suele ser la que mide el LCP; el
  //     resto van en diferido.
  // Identico en hsgservice.es, centredentalbaste.com y centremedicbaste.com.
  const imageSize = require("image-size");
  const dimCache = new Map();
  const realSize = (src) => {
    const file = require("path").join("src", src.trim());
    if (!dimCache.has(file)) {
      try {
        const { width, height } = imageSize(file);
        dimCache.set(file, width && height ? { width, height } : null);
      } catch (e) {
        dimCache.set(file, null);
      }
    }
    return dimCache.get(file);
  };
  eleventyConfig.addTransform("imgDimensions", function (content) {
    if (!(this.page.outputPath || "").endsWith(".html")) return content;
    let n = 0;
    return content.replace(/<img\b[^>]*>/g, (tag) => {
      n += 1;
      let out = tag;
      const num = (name) => {
        const m = out.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`));
        if (!m) return null;
        const v = m[1].trim();
        if (/^\d+$/.test(v)) return parseInt(v, 10);
        const px = v.match(/^(\d+(?:\.\d+)?)px$/);
        if (px) {
          out = out.replace(m[0], `${name}="${Math.round(parseFloat(px[1]))}"`);
          return Math.round(parseFloat(px[1]));
        }
        // valor no expresable como entero (100%, auto, 10em): fuera del atributo
        out = out.replace(m[0], "");
        if (v !== "auto") {
          out = /\bstyle\s*=\s*"/.test(out)
            ? out.replace(/\bstyle\s*=\s*"/, `style="${name}:${v};`)
            : out.replace(/<img\b/, `<img style="${name}:${v}"`);
        }
        return null;
      };
      let w = num("width");
      let h = num("height");
      if (w === null || h === null) {
        const m = out.match(/src="\s*(\/[^"]+)\s*"/);
        const real = m ? realSize(m[1]) : null;
        if (real) {
          if (w === null && h === null) { w = real.width; h = real.height; }
          else if (h === null) h = Math.round(w * real.height / real.width);
          else w = Math.round(h * real.width / real.height);
          if (!/\bwidth\s*=/.test(out)) out = out.replace(/<img\b/, `<img width="${w}"`);
          if (!/\bheight\s*=/.test(out)) out = out.replace(/<img\b/, `<img height="${h}"`);
        }
      }
      if (!/\bloading\s*=/.test(out)) {
        out = out.replace(/<img\b/, n === 1 ? '<img loading="eager" fetchpriority="high"' : '<img loading="lazy"');
      }
      if (!/\bdecoding\s*=/.test(out)) out = out.replace(/<img\b/, '<img decoding="async"');
      return out.replace(/\s{2,}/g, " ");
    });
  });

  eleventyConfig.addPairedShortcode("myShortcode", function (content) {
    // Method A: ✅ ideal para encapsular {% myShortcode %}  dfdfdf  {% endmyShortcode %}
    return `<div class="grid grid--3">${content}</div>`;
  });
  eleventyConfig.addShortcode("br", function () {
    // Method A: ✅ ideal para tags de espacios {% br %}
    return `
  <br><br><br>
`;
  });
  
  eleventyConfig.addPlugin(embeds);
  eleventyConfig.setLibrary(
    "md",
    markdownIt(mdOptions)
      .use(markdownItAnchor, mdAnchorOpts)
      .use(markdownItHighlightJS)
  );
  eleventyConfig.addPlugin(pluginTOC);
  eleventyConfig.addFilter("postDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toLocaleString(DateTime.DATE_MED);
  });
  function getIndex(collection, currentSlug) {
    return collection.findIndex((page) => page.fileSlug === currentSlug);
  }
  eleventyConfig.addFilter("nextInCollection", (collection, currentSlug) => {
    const currentIndex = getIndex(collection, currentSlug);
    const pages = collection.filter((page, index) => {
      return index == currentIndex + 1 ? page : false;
    });
    return pages.length ? pages[0] : false;
  });
  eleventyConfig.addFilter("prevInCollection", (collection, currentSlug) => {
    const currentIndex = getIndex(collection, currentSlug);
    const pages = collection.filter((page, index) => {
      return index == currentIndex - 1 ? page : false;
    });
    return pages.length ? pages[0] : false;
  });
  eleventyConfig.addFilter("reverseWords", function (value) {
    if (typeof value === "string") {
      return value.split("").reverse().join("");
    }
    return value;
  });
  // WebC
  eleventyConfig.addPlugin(eleventyWebcPlugin, {
    components: [
      // …
      // Add as a global WebC component
      "npm:@11ty/eleventy-img/*.webc",
    ],
  });
  eleventyConfig.addPlugin(eleventyImagePlugin, {
    // Set global default options
    formats: ["webp"],
    urlPath: "/assets/static/",
    outputDir: "public/assets/static/",
    // Notably `outputDir` is resolved automatically
    // to the project output directory  npm install eleventy-plugin-seo --save falta este
    defaultAttributes: {
      loading: "lazy",
      decoding: "async",
    },
  });
  return {
    dir: {
      data: "_data",
      input: "src",
      output: "public",
    },
    passthroughFileCopy: true,
  };
};
