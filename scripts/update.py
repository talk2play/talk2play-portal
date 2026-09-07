"""Regenera data/videos.js con el contenido actual del canal de YouTube.

Uso:  python scripts/update.py
Solo usa la librería estándar (urllib), sin dependencias.
"""
import json
import re
import urllib.request
from datetime import date
from pathlib import Path

CHANNEL = "https://www.youtube.com/@Talk2PlayPodcast"
OUT = Path(__file__).resolve().parent.parent / "data" / "videos.js"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept-Language": "es-ES,es;q=0.9",
    # SOCS evita el muro de consentimiento de cookies de la UE
    "Cookie": "SOCS=CAI",
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def initial_data(html: str) -> dict:
    m = re.search(r"var ytInitialData = ({.*?});</script>", html, re.S)
    if not m:
        raise RuntimeError("No se encontró ytInitialData; YouTube pudo cambiar el formato de la página.")
    return json.loads(m.group(1))


def find_key(obj, key):
    found = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == key:
                found.append(v)
            found.extend(find_key(v, key))
    elif isinstance(obj, list):
        for item in obj:
            found.extend(find_key(item, key))
    return found


def category(title: str) -> str:
    t = title.upper()
    if any(w in t for w in ("DIRECT", "GAMESCOM", "OPENING NIGHT", "STATE OF PLAY")):
        return "Directos"
    if any(w in t for w in ("GAMEPLAY", "JUGAMOS", "PRIMERA HORA", "PRIMERAS IMPRESIONES")):
        return "Gameplays"
    if "REACCI" in t:
        return "Reacciones"
    # los episodios de comentario de noticias son "Actualidad": la seccion
    # "Noticias" del portal es solo para articulos de redaccion
    return "Actualidad"


def scrape_videos() -> list[dict]:
    data = initial_data(fetch(f"{CHANNEL}/videos"))
    videos = []
    for lv in find_key(data, "lockupViewModel"):
        vid = lv.get("contentId")
        md = lv.get("metadata", {}).get("lockupMetadataViewModel", {})
        title = md.get("title", {}).get("content", "")
        if not vid or not title:
            continue
        info = []
        for row in find_key(md, "metadataParts"):
            for part in row:
                text = part.get("text", {}).get("content")
                if text and text != title:
                    info.append(text)
        duration = ""
        for badge in find_key(lv, "thumbnailBadgeViewModel"):
            if badge.get("text"):
                duration = badge["text"]
        videos.append({
            "id": vid,
            "title": title,
            "duration": duration,
            # YouTube alterna variantes de texto ("5 visualizaciones", "5 vistas", "5 views")
            "views": next((i for i in info if re.search(r"\d", i) and re.search(r"visualiza|vista|view", i, re.I)), ""),
            "when": next((i for i in info if i.startswith("hace") or "ago" in i), ""),
            "category": category(title),
        })
    return videos


def scrape_shorts() -> list[dict]:
    data = initial_data(fetch(f"{CHANNEL}/shorts"))
    shorts = []
    for s in find_key(data, "shortsLockupViewModel"):
        endpoints = find_key(s, "reelWatchEndpoint")
        vid = endpoints[0].get("videoId") if endpoints and endpoints[0].get("videoId") else None
        if not vid:
            ids = find_key(s, "videoId")
            vid = ids[0] if ids else None
        primary = find_key(s, "primaryText")
        secondary = find_key(s, "secondaryText")
        shorts.append({
            "id": vid,
            "title": primary[0].get("content", "") if primary else "",
            "views": secondary[0].get("content", "") if secondary else "",
        })
    return [s for s in shorts if s["id"]]


def main():
    videos = scrape_videos()
    shorts = scrape_shorts()
    payload = {
        "channel": {
            "name": "Talk2Play",
            "handle": "@Talk2PlayPodcast",
            "url": CHANNEL,
            "subscribers": "",
        },
        "updated": date.today().isoformat(),
        "videos": videos,
        "shorts": shorts,
    }
    OUT.write_text(
        "window.T2P_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"OK: {len(videos)} vídeos y {len(shorts)} shorts → {OUT}")


if __name__ == "__main__":
    main()
