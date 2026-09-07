/* Panel de redacción: edita las noticias en memoria y las publica
   commiteando data/noticias.js contra la API de GitHub (el repo ES la base
   de datos; GitHub Pages redespliega al recibir el commit). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  /* ── puerta de administradores ─────────────────────────────────────────
     Lista de correos con acceso al panel. OJO: esto es un control de
     conveniencia en el cliente (el código es público en Pages); la
     autorización real para escribir la pone el token de GitHub. */
  var ADMINS = [
    "marcosreciosanchez@gmail.com",
    "n.jimenezmercader@gmail.com",
    "m.jimenezmercader@gmail.com",
    "vicfleki@hotmail.com"
  ];
  var USER_KEY = "t2p-admin-user";
  var currentUser = null;
  try { currentUser = localStorage.getItem(USER_KEY); } catch (e) { /* ok */ }
  if (currentUser && ADMINS.indexOf(currentUser) === -1) currentUser = null;

  var showPanel = function () {
    $("gate").hidden = true;
    $("panel").hidden = false;
    $("session-email").textContent = currentUser;
  };
  if (currentUser) {
    showPanel();
  } else {
    $("gate").hidden = false;
  }
  $("gate-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("gate-email").value.trim().toLowerCase();
    if (ADMINS.indexOf(email) === -1) {
      $("gate-error").hidden = false;
      return;
    }
    currentUser = email;
    try { localStorage.setItem(USER_KEY, email); } catch (e2) { /* ok */ }
    showPanel();
  });
  $("btn-logout").addEventListener("click", function () {
    try { localStorage.removeItem(USER_KEY); } catch (e) { /* ok */ }
    location.reload();
  });

  var articles = ((window.T2P_NOTICIAS || {}).articles || []).map(function (a) {
    return Object.assign({}, a);
  });
  var dirty = false;      // noticias con cambios sin publicar
  var siteDirty = false;  // textos/imágenes del sitio con cambios sin publicar
  var editingId = null;

  var site = {
    textos: Object.assign({}, ((window.T2P_SITIO || {}).textos || {})),
    imagenes: Object.assign({}, ((window.T2P_SITIO || {}).imagenes || {})),
    // ajustes de vídeos hechos desde el modo edición visual: se conservan tal cual
    videos: (window.T2P_SITIO || {}).videos || {}
  };
  var anyDirty = function () { return dirty || siteDirty; };

  /* ── config de conexión ── */
  var CFG_KEY = "t2p-admin-config";
  var loadCfg = function () {
    try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; }
  };
  var saveCfg = function (cfg) {
    try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* modo privado */ }
  };

  /* ── serialización: el fichero que se commitea ── */
  var serialize = function () {
    var payload = {
      updated: new Date().toISOString().slice(0, 10),
      articles: articles
    };
    return "window.T2P_NOTICIAS = " + JSON.stringify(payload, null, 2) + ";\n";
  };
  var serializeSite = function () {
    var payload = {
      updated: new Date().toISOString().slice(0, 10),
      textos: site.textos,
      imagenes: site.imagenes,
      videos: site.videos
    };
    return "window.T2P_SITIO = " + JSON.stringify(payload, null, 2) + ";\n";
  };

  var slugify = function (s) {
    return s.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      .slice(0, 60) || "noticia";
  };

  /* ── listado ── */
  var renderList = function () {
    $("list").innerHTML = "";
    if (!articles.length) {
      $("list").innerHTML = '<p class="hint">Todavía no hay noticias.</p>';
    }
    articles.forEach(function (a) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "news-item" + (dirty ? " dirty" : "");
      b.innerHTML = '<span><span class="tt"></span><br><span class="dd"></span></span><span>✎</span>';
      b.querySelector(".tt").textContent = a.title;
      b.querySelector(".dd").textContent = a.date + " · " + a.category;
      b.addEventListener("click", function () { openEditor(a.id); });
      $("list").appendChild(b);
    });
    var pending = [];
    if (dirty) pending.push("noticias");
    if (siteDirty) pending.push("textos del sitio");
    $("draft-state").textContent = pending.length
      ? "Cambios sin publicar: " + pending.join(" y ") + ". Publica para que lleguen al portal."
      : "Sin cambios pendientes.";
    $("btn-publish").disabled = !anyDirty();
    $("btn-download").disabled = !anyDirty();
  };

  /* ── editor ── */
  var openEditor = function (id) {
    editingId = id;
    var f = $("form");
    f.reset();
    $("btn-delete").hidden = !id;
    $("editor-title").textContent = id ? "Editar noticia" : "Nueva noticia";
    if (id) {
      var a = articles.find(function (x) { return x.id === id; });
      if (!a) return;
      f.title.value = a.title;
      f.author.value = a.author;
      f.image.value = a.image || "";
      f.summary.value = a.summary || "";
      f.body.value = a.body || "";
    }
    $("editor").hidden = false;
    f.title.focus();
  };

  var closeEditor = function () {
    $("editor").hidden = true;
    editingId = null;
  };

  $("btn-new").addEventListener("click", function () { openEditor(null); });
  $("btn-cancel").addEventListener("click", closeEditor);

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target;
    var data = {
      id: editingId || slugify(f.title.value),
      title: f.title.value.trim(),
      category: "Noticias", // todo lo de redaccion es Noticias

      date: new Date().toISOString().slice(0, 10),
      author: f.author.value.trim(),
      image: f.image.value.trim(),
      summary: f.summary.value.trim(),
      body: f.body.value.trim()
    };
    if (!editingId) {
      // id único aunque dos noticias compartan título
      var base = data.id, n = 2;
      while (articles.some(function (x) { return x.id === data.id; })) data.id = base + "-" + n++;
      articles.unshift(data);
    } else {
      var i = articles.findIndex(function (x) { return x.id === editingId; });
      data.date = articles[i].date; // la fecha de publicación no cambia al editar
      articles[i] = data;
    }
    dirty = true;
    closeEditor();
    renderList();
  });

  $("btn-delete").addEventListener("click", function () {
    if (!editingId) return;
    if (!confirm("¿Eliminar esta noticia? Se borrará del portal al publicar.")) return;
    articles = articles.filter(function (x) { return x.id !== editingId; });
    dirty = true;
    closeEditor();
    renderList();
  });

  /* ── formulario de textos e imágenes del sitio ── */
  var siteForm = $("site-form");
  var fillSiteForm = function () {
    var f = siteForm;
    f.lema.value = site.textos.lema || "";
    f.titulo_videos.value = site.textos.titulo_videos || "";
    f.sub_redaccion.value = site.textos.sub_redaccion || "";
    f.lateral_texto.value = site.textos.lateral_texto || "";
    f.imagen_lateral.value = site.imagenes.lateral || "";
    f.footer.value = site.textos.footer || "";
    f.contacto_intro.value = site.textos.contacto_intro || "";
    f.email_contacto.value = site.textos.email_contacto || "";
  };
  fillSiteForm();
  siteForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = siteForm;
    site.textos.lema = f.lema.value.trim();
    site.textos.titulo_videos = f.titulo_videos.value.trim();
    site.textos.sub_redaccion = f.sub_redaccion.value.trim();
    site.textos.lateral_texto = f.lateral_texto.value.trim();
    site.imagenes.lateral = f.imagen_lateral.value.trim();
    site.textos.footer = f.footer.value.trim();
    site.textos.contacto_intro = f.contacto_intro.value.trim();
    site.textos.email_contacto = f.email_contacto.value.trim().toLowerCase();
    siteDirty = true;
    renderList();
    log("Textos guardados en borrador.", "ok");
  });

  /* ── ficheros que hay que publicar (los que tengan cambios) ──
     Al cambiar noticias se regeneran también sus páginas estáticas
     (SEO/Open Graph), el sitemap y el RSS con la plantilla compartida. */
  var pendingFiles = function () {
    var files = [];
    var tpl = window.T2P_PLANTILLA;
    if (dirty) {
      files.push({ path: "data/noticias.js", name: "noticias.js", content: serialize() });
      if (tpl) {
        articles.forEach(function (a) {
          files.push({ path: "noticias/" + a.id + ".html", name: a.id + ".html", content: tpl.articleHtml(a) });
        });
        files.push({ path: "sitemap.xml", name: "sitemap.xml", content: tpl.sitemapXml(articles) });
        files.push({ path: "rss.xml", name: "rss.xml", content: tpl.rssXml(articles) });
      }
    }
    if (siteDirty) files.push({ path: "data/sitio.js", name: "sitio.js", content: serializeSite() });
    return files;
  };

  /* ── descarga manual (alternativa sin token) ── */
  $("btn-download").addEventListener("click", function () {
    pendingFiles().forEach(function (file) {
      var blob = new Blob([file.content], { type: "text/javascript;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    log("Descargado. Sustituye el/los fichero(s) en data/ del repo y haz commit.", "ok");
  });

  /* ── publicación via API de GitHub ── */
  var log = function (msg, cls) {
    $("publish-log").textContent = msg;
    $("publish-log").className = "hint " + (cls || "");
  };

  var b64utf8 = function (s) {
    var bytes = new TextEncoder().encode(s);
    var bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  };

  var gh = function (cfg, path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({
      "Authorization": "Bearer " + cfg.token,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }, opts.headers || {});
    return fetch("https://api.github.com/repos/" + cfg.owner + "/" + cfg.repo + path, opts);
  };

  $("btn-publish").addEventListener("click", function () {
    var cfg = loadCfg();
    if (!cfg.owner || !cfg.repo || !cfg.token) {
      $("config").showModal();
      log("Configura la conexión con GitHub primero (botón ⚙ Conexión).", "err");
      return;
    }
    $("btn-publish").disabled = true;
    log("Publicando…");

    var branch = cfg.branch || "main";
    var ghJson = function (path, opts, what) {
      return gh(cfg, path, opts).then(function (r) {
        if (!r.ok) return r.json().catch(function () { return {}; }).then(function (e) {
          throw new Error("GitHub respondió " + r.status + " en " + what + ": " + (e.message || ""));
        });
        return r.json();
      });
    };

    var files = pendingFiles();
    var deletions = [];

    // páginas de noticias borradas: se quitan del repo en el mismo commit
    var findOrphans = dirty
      ? gh(cfg, "/contents/noticias?ref=" + encodeURIComponent(branch)).then(function (r) {
          if (!r.ok) return []; // 404 = la carpeta aún no existe
          return r.json();
        }).then(function (list) {
          var keep = {};
          articles.forEach(function (a) { keep[a.id + ".html"] = true; });
          (list || []).forEach(function (f) {
            if (f.type === "file" && /\.html$/.test(f.name) && !keep[f.name]) {
              deletions.push({ path: "noticias/" + f.name, mode: "100644", type: "blob", sha: null });
            }
          });
        })
      : Promise.resolve();

    // un único commit con todo, via API de árboles de git
    var headSha, baseTree;
    findOrphans
      .then(function () { return ghJson("/git/ref/heads/" + branch, {}, "leer la rama"); })
      .then(function (ref) {
        headSha = ref.object.sha;
        return ghJson("/git/commits/" + headSha, {}, "leer el commit");
      })
      .then(function (commit) {
        baseTree = commit.tree.sha;
        return Promise.all(files.map(function (file) {
          return ghJson("/git/blobs", {
            method: "POST",
            body: JSON.stringify({ content: b64utf8(file.content), encoding: "base64" })
          }, "subir " + file.name).then(function (blob) {
            return { path: file.path, mode: "100644", type: "blob", sha: blob.sha };
          });
        }));
      })
      .then(function (entries) {
        return ghJson("/git/trees", {
          method: "POST",
          body: JSON.stringify({ base_tree: baseTree, tree: entries.concat(deletions) })
        }, "crear el árbol");
      })
      .then(function (tree) {
        return ghJson("/git/commits", {
          method: "POST",
          body: JSON.stringify({
            message: "Publica desde el panel de redacción (" + (currentUser || "admin") + ")",
            tree: tree.sha,
            parents: [headSha]
          })
        }, "crear el commit");
      })
      .then(function (commit) {
        return ghJson("/git/refs/heads/" + branch, {
          method: "PATCH",
          body: JSON.stringify({ sha: commit.sha })
        }, "mover la rama").then(function () { return commit; });
      })
      .then(function (commit) {
        dirty = false;
        siteDirty = false;
        renderList();
        log("Publicado — commit " + commit.sha.slice(0, 7) + " (" + files.length + " fichero(s)" +
          (deletions.length ? ", " + deletions.length + " borrado(s)" : "") +
          "). GitHub Pages tarda ~1 minuto en redesplegar.", "ok");
      })
      .catch(function (e) {
        $("btn-publish").disabled = false;
        log(String(e.message || e), "err");
      });
  });

  /* ── diálogo de configuración ── */
  $("btn-config").addEventListener("click", function (e) {
    e.preventDefault();
    var cfg = loadCfg();
    $("cfg-owner").value = cfg.owner || "";
    $("cfg-repo").value = cfg.repo || "";
    $("cfg-branch").value = cfg.branch || "main";
    $("cfg-token").value = cfg.token || "";
    $("config").showModal();
  });
  $("cfg-save").addEventListener("click", function () {
    saveCfg({
      owner: $("cfg-owner").value.trim(),
      repo: $("cfg-repo").value.trim(),
      branch: $("cfg-branch").value.trim() || "main",
      token: $("cfg-token").value.trim()
    });
  });

  /* ── métricas (data/metricas.js, foto diaria del bot) ── */
  (function () {
    var M = (window.T2P_METRICAS || {});
    var hist = M.history || [];
    if (!hist.length) {
      $("metrics-note").textContent = "Sin datos todavía: el bot toma la primera foto en su próxima ejecución.";
      return;
    }
    var last = hist[hist.length - 1];
    var prev = hist.length > 1 ? hist[hist.length - 2] : null;
    var fmt = function (n) { return Number(n).toLocaleString("es-ES"); };
    var delta = function (key) {
      if (!prev) return "";
      var d = last[key] - prev[key];
      var cls = d > 0 ? "up" : d < 0 ? "down" : "flat";
      var sign = d > 0 ? "▲ +" : d < 0 ? "▼ " : "= ";
      return '<div class="d ' + cls + '">' + sign + fmt(d) + " vs. ayer</div>";
    };
    var tiles = [
      ["subs", "Suscriptores"],
      ["videos", "Vídeos publicados"],
      ["views_recientes", "Visitas · 30 últimos vídeos"],
      ["views_shorts", "Visitas · Shorts"]
    ];
    $("stat-row").innerHTML = tiles.map(function (t) {
      return '<div class="stat-tile"><div class="n">' + fmt(last[t[0]]) + "</div>" +
        '<div class="l">' + t[1] + "</div>" + delta(t[0]) + "</div>";
    }).join("");

    // línea temporal: una serie por gráfico, escala propia, marca fina,
    // rejilla recesiva y último valor etiquetado (color validado #e62429)
    var lineChart = function (containerId, key) {
      var el = $(containerId);
      if (hist.length < 2) {
        el.innerHTML = '<p class="empty-chart">La tendencia se dibuja a partir del segundo día de datos.</p>';
        return;
      }
      var W = 320, H = 110, padL = 6, padR = 44, padT = 10, padB = 18;
      var xs = hist.map(function (_, i) {
        return padL + i * (W - padL - padR) / (hist.length - 1);
      });
      var values = hist.map(function (h) { return h[key] || 0; });
      var lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
      if (hi === lo) { hi += 1; lo -= 1; }
      var y = function (v) { return padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo)); };
      var pts = values.map(function (v, i) { return xs[i].toFixed(1) + "," + y(v).toFixed(1); });

      var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Evolución diaria">';
      [0.25, 0.5, 0.75].forEach(function (f) {
        var gy = (padT + (H - padT - padB) * f).toFixed(1);
        svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy +
          '" stroke="var(--line)" stroke-width="1"/>';
      });
      svg += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#e62429" ' +
        'stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      hist.forEach(function (h, i) {
        var cx = xs[i].toFixed(1), cy = y(values[i]).toFixed(1);
        var lastPt = i === hist.length - 1;
        svg += '<circle class="hit" cx="' + cx + '" cy="' + cy + '" r="9" fill="transparent">' +
          "<title>" + h.date + ": " + fmt(values[i]) + "</title></circle>" +
          '<g class="pt' + (lastPt ? " last" : "") + '">' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="3.5" fill="#e62429" stroke="var(--surface2)" stroke-width="2"/>' +
          (lastPt ? '<text x="' + (Number(cx) + 8) + '" y="' + (Number(cy) + 4) +
            '" font-size="11" fill="var(--text)" style="font-variant-numeric:tabular-nums">' + fmt(values[i]) + "</text>" : "") +
          "</g>";
      });
      var d0 = hist[0].date.slice(5), d1 = last.date.slice(5);
      svg += '<text x="' + padL + '" y="' + (H - 4) + '" font-size="10" fill="var(--muted)">' + d0 + "</text>" +
        '<text x="' + (W - padR) + '" y="' + (H - 4) + '" font-size="10" fill="var(--muted)" text-anchor="end">' + d1 + "</text></svg>";
      el.innerHTML = svg;
    };
    lineChart("chart-subs", "subs");
    lineChart("chart-shorts", "views_shorts");
    $("metrics-note").textContent = "Histórico: " + hist.length + " día(s) · última foto " + M.updated + ".";
  })();

  /* ── radar de temas para el podcast (data/temas.js, lo escribe el bot) ── */
  var radar = (window.T2P_TEMAS || {});
  var temas = radar.temas || [];
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  if (temas.length) {
    $("radar-list").innerHTML = temas.map(function (t, i) {
      return "<li><span class=\"rt\">" +
        (t.hot ? '<span class="hot-tag">Caliente</span> ' : "") +
        '<a href="' + esc(t.url) + '" target="_blank" rel="noopener">' + esc(t.title) + "</a>" +
        '<span class="rm">' + esc(t.source) + " · " + esc(t.when) + "</span></span>" +
        '<button type="button" class="rb" data-tema="' + i + '">→ noticia</button></li>';
    }).join("");
    $("radar-updated").textContent = "Radar actualizado: " + (radar.updated || "");
    $("radar-list").addEventListener("click", function (e) {
      var btn = e.target.closest(".rb");
      if (!btn) return;
      var t = temas[Number(btn.dataset.tema)];
      if (!t) return;
      openEditor(null);
      var f = $("form");
      f.title.value = t.title;
      f.body.value = "\n\nFuente: " + t.url;
      f.summary.focus();
    });
    $("btn-escaleta").addEventListener("click", function () {
      var lines = ["ESCALETA — temas candidatos (" + (radar.updated || "") + ")", ""];
      temas.forEach(function (t) {
        lines.push((t.hot ? "🔥 " : "· ") + t.title + " — " + t.source + " (" + t.url + ")");
      });
      navigator.clipboard.writeText(lines.join("\n")).then(function () {
        $("radar-updated").textContent = "Escaleta copiada al portapapeles ✔";
      }, function () {
        $("radar-updated").textContent = "No se pudo copiar (¿permisos del navegador?)";
      });
    });
  } else {
    $("radar-list").innerHTML = '<li><span class="rt">El bot todavía no ha recopilado temas — se actualiza a diario.</span></li>';
  }

  renderList();

  /* enlace directo desde el modo edición visual: admin.html#editar=<id> */
  var hash = location.hash.match(/^#editar=(.+)$/);
  if (hash && currentUser) {
    var target = decodeURIComponent(hash[1]);
    if (articles.some(function (a) { return a.id === target; })) openEditor(target);
  }
})();
