/* Genera las páginas estáticas de noticia, sitemap.xml y rss.xml en local.
   Uso: node scripts/build.js
   El panel de administración hace lo mismo al publicar (misma plantilla:
   assets/plantilla-noticia.js); esto sirve para regenerar a mano. */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const plantilla = require(path.join(ROOT, "assets", "plantilla-noticia.js"));

function loadDataFile(name, globalName) {
  const code = fs.readFileSync(path.join(ROOT, "data", name), "utf8");
  const sandbox = { window: {} };
  new Function("window", code)(sandbox.window);
  return sandbox.window[globalName];
}

const noticias = loadDataFile("noticias.js", "T2P_NOTICIAS");
const articles = (noticias && noticias.articles) || [];

const outDir = path.join(ROOT, "noticias");
fs.mkdirSync(outDir, { recursive: true });

// páginas nuevas o actualizadas
const expected = new Set();
for (const a of articles) {
  const file = path.join(outDir, a.id + ".html");
  fs.writeFileSync(file, plantilla.articleHtml(a), "utf8");
  expected.add(a.id + ".html");
}

// páginas huérfanas de noticias borradas
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith(".html") && !expected.has(f)) {
    fs.unlinkSync(path.join(outDir, f));
    console.log("borrada pagina huerfana:", f);
  }
}

fs.writeFileSync(path.join(ROOT, "sitemap.xml"), plantilla.sitemapXml(articles), "utf8");
fs.writeFileSync(path.join(ROOT, "rss.xml"), plantilla.rssXml(articles), "utf8");

console.log(`OK: ${articles.length} paginas de noticia + sitemap.xml + rss.xml`);
