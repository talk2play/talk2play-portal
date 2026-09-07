/* Plantilla ÚNICA de las páginas estáticas de noticia y de sitemap/RSS.
   La usan el panel (navegador, al publicar) y scripts/build.js (Node).
   Si cambias el HTML de una noticia, cámbialo aquí y solo aquí. */
(function (root) {
  "use strict";

  var BASE_URL = "https://talk2play.github.io/talk2play-portal/";

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  var articleHtml = function (a) {
    var url = BASE_URL + "noticias/" + a.id + ".html";
    var description = (a.summary || a.body || "").slice(0, 300);
    var paragraphs = String(a.body || "").split(/\n\n+/).filter(function (p) { return p.trim(); })
      .map(function (p) { return "<p>" + esc(p.trim()) + "</p>"; }).join("\n      ");
    return '<!DOCTYPE html>\n<html lang="es">\n<head>\n' +
      '<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      "<title>" + esc(a.title) + " — Talk2Play</title>\n" +
      '<meta name="description" content="' + esc(description) + '">\n' +
      '<link rel="canonical" href="' + esc(url) + '">\n' +
      '<meta property="og:type" content="article">\n' +
      '<meta property="og:site_name" content="Talk2Play">\n' +
      '<meta property="og:title" content="' + esc(a.title) + '">\n' +
      '<meta property="og:description" content="' + esc(description) + '">\n' +
      '<meta property="og:url" content="' + esc(url) + '">\n' +
      (a.image ? '<meta property="og:image" content="' + esc(a.image) + '">\n' : "") +
      '<meta property="article:published_time" content="' + esc(a.date) + '">\n' +
      '<meta name="twitter:card" content="' + (a.image ? "summary_large_image" : "summary") + '">\n' +
      '<link rel="icon" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>🎙️</text></svg>">\n' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap">\n' +
      '<link rel="stylesheet" href="../assets/style.css">\n' +
      "<style>\n" +
      ".article{max-width:760px;margin:0 auto;padding:36px 20px 72px}\n" +
      ".article h1{font-size:clamp(1.7rem,4.5vw,2.6rem);text-transform:none;font-variation-settings:\"wdth\" 112;margin:18px 0 0;line-height:1.15}\n" +
      ".article .meta{margin-top:14px;font-size:.84rem;color:var(--muted)}\n" +
      ".article .cover{margin:26px 0 0;border-radius:12px;overflow:hidden;border:1px solid var(--line)}\n" +
      ".article .cover img{width:100%;display:block}\n" +
      ".article .body{margin-top:28px;font-size:1.06rem;line-height:1.75;max-width:65ch}\n" +
      ".article .body p{margin:0 0 1.2em}\n" +
      ".article .summary{margin-top:22px;font-size:1.15rem;color:var(--muted);line-height:1.55;border-left:3px solid var(--talk);padding-left:16px;max-width:60ch}\n" +
      "</style>\n</head>\n<body>\n" +
      '<header class="topbar"><div class="wrap topbar-inner">\n' +
      '<a class="logo" href="../index.html" aria-label="Talk2Play, portada"><span class="t">Talk</span><span>2</span><span class="p">Play</span><small>PORTAL GAMER</small></a>\n' +
      '<nav class="cats" aria-label="Páginas"><a href="../index.html">Portada</a><a href="../contacto.html">Contacto</a></nav>\n' +
      '<a class="btn-sub" href="https://www.youtube.com/@Talk2PlayPodcast?sub_confirmation=1" target="_blank" rel="noopener">▶ Suscríbete</a>\n' +
      "</div></header>\n" +
      '<article class="article">\n' +
      '<a class="back" href="../index.html">← Volver a la portada</a>\n' +
      "<h1>" + esc(a.title) + "</h1>\n" +
      '<div class="meta"><span class="chip Noticias">Noticias</span> &nbsp; ' + esc(a.date) + " · " + esc(a.author) + "</div>\n" +
      (a.summary ? '<p class="summary">' + esc(a.summary) + "</p>\n" : "") +
      (a.image ? '<figure class="cover"><img src="' + esc(a.image) + '" alt="' + esc(a.title) + '"></figure>\n' : "") +
      '<div class="body">\n      ' + paragraphs + "\n</div>\n</article>\n" +
      '<footer><div class="wrap foot-inner">\n' +
      "<span>© 2026 Talk2Play · Portal de noticias gamer</span>\n" +
      '<span><a href="../terminos.html">Términos</a> · <a href="../contacto.html">Contacto</a></span>\n' +
      '<a href="https://www.youtube.com/@Talk2PlayPodcast" target="_blank" rel="noopener">YouTube</a>\n' +
      "</div></footer>\n" +
      "<script>window.T2P_BASE=\"../\";</script>\n" +
      '<script src="../assets/cookies.js"></script>\n' +
      "</body>\n</html>\n";
  };

  var sitemapXml = function (articles) {
    var urls = ["", "contacto.html", "terminos.html"].map(function (p) { return BASE_URL + p; })
      .concat(articles.map(function (a) { return BASE_URL + "noticias/" + a.id + ".html"; }));
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(function (u) { return "  <url><loc>" + esc(u) + "</loc></url>"; }).join("\n") +
      "\n</urlset>\n";
  };

  var rssXml = function (articles) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<rss version="2.0"><channel>\n' +
      "<title>Talk2Play — Noticias</title>\n" +
      "<link>" + esc(BASE_URL) + "</link>\n" +
      "<description>Las noticias del mundo gamer firmadas por la redacción de Talk2Play</description>\n" +
      "<language>es</language>\n" +
      articles.map(function (a) {
        return "<item>\n" +
          "  <title>" + esc(a.title) + "</title>\n" +
          "  <link>" + esc(BASE_URL + "noticias/" + a.id + ".html") + "</link>\n" +
          "  <guid>" + esc(BASE_URL + "noticias/" + a.id + ".html") + "</guid>\n" +
          "  <pubDate>" + new Date(a.date + "T12:00:00Z").toUTCString() + "</pubDate>\n" +
          "  <description>" + esc(a.summary || "") + "</description>\n" +
          "</item>";
      }).join("\n") +
      "\n</channel></rss>\n";
  };

  var api = { BASE_URL: BASE_URL, articleHtml: articleHtml, sitemapXml: sitemapXml, rssXml: rssXml };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.T2P_PLANTILLA = api;
})(this);
