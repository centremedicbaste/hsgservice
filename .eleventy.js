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



  // Inyecta width/height en las <img> que no los declaran, leyendo el archivo real.
  // Sin estos atributos el navegador no reserva el hueco y la página da saltos al cargar.
  const imageSize = require("image-size");
  const dimCache = new Map();
  eleventyConfig.addTransform("imgDimensions", function (content) {
    if (!(this.page.outputPath || "").endsWith(".html")) return content;
    return content.replace(/<img\b[^>]*>/g, (tag) => {
      if (/\bwidth=/.test(tag) || /\bheight=/.test(tag)) return tag;
      const m = tag.match(/src="(\/[^"]+)"/);
      if (!m) return tag;
      const file = path.join("src", m[1]);
      if (!dimCache.has(file)) {
        try {
          const { width, height } = imageSize(file);
          dimCache.set(file, width && height ? ` width="${width}" height="${height}"` : "");
        } catch (e) {
          dimCache.set(file, "");
        }
      }
      const attrs = dimCache.get(file);
      return attrs ? tag.replace(/<img\b/, `<img${attrs}`) : tag;
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
