/* Panel de redacción: edita las noticias en memoria y las publica
   commiteando data/noticias.js contra la API de GitHub (el repo ES la base
   de datos; GitHub Pages redespliega al recibir el commit). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  var articles = ((window.T2P_NOTICIAS || {}).articles || []).map(function (a) {
    return Object.assign({}, a);
  });
  var dirty = false;
  var editingId = null;

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
    $("draft-state").textContent = dirty
      ? "Hay cambios sin publicar. Publica para que lleguen al portal."
      : "Sin cambios pendientes.";
    $("btn-publish").disabled = !dirty;
    $("btn-download").disabled = !dirty;
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
      f.category.value = a.category;
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
      category: f.category.value,
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

  /* ── descarga manual (alternativa sin token) ── */
  $("btn-download").addEventListener("click", function () {
    var blob = new Blob([serialize()], { type: "text/javascript;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "noticias.js";
    a.click();
    URL.revokeObjectURL(a.href);
    log("Descargado. Sustituye data/noticias.js en el repo y haz commit.", "ok");
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
    var file = "data/noticias.js";
    gh(cfg, "/contents/" + file + "?ref=" + encodeURIComponent(cfg.branch || "main"))
      .then(function (r) {
        if (r.status === 404) return { sha: undefined };
        if (!r.ok) throw new Error("GitHub respondió " + r.status + " al leer el fichero (¿owner/repo/token correctos?)");
        return r.json();
      })
      .then(function (cur) {
        return gh(cfg, "/contents/" + file, {
          method: "PUT",
          body: JSON.stringify({
            message: "Publica noticias desde el panel de redacción",
            content: b64utf8(serialize()),
            sha: cur.sha,
            branch: cfg.branch || "main"
          })
        });
      })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (e) {
          throw new Error("GitHub rechazó el commit (" + r.status + "): " + (e.message || ""));
        });
        return r.json();
      })
      .then(function (res) {
        dirty = false;
        renderList();
        log("Publicado — commit " + res.commit.sha.slice(0, 7) +
          ". GitHub Pages tarda ~1 minuto en redesplegar.", "ok");
      })
      .catch(function (e) {
        $("btn-publish").disabled = false;
        log(String(e.message || e), "err");
      });
  });

  /* ── diálogo de configuración ── */
  $("btn-config").addEventListener("click", function () {
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

  renderList();
})();
