"""Radar de temas para el podcast: recopila titulares recientes de la prensa
gamer (feeds RSS publicos) y genera data/temas.js para el panel de admins.

Uso:  python scripts/temas.py
Lo ejecuta la tarea diaria del bot (scripts/bot.cmd). Solo stdlib.
"""
import gzip
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "temas.js"
MAX_ITEMS = 25
MAX_AGE_H = 48

FEEDS = [
    ("Vandal", "https://vandal.elespanol.com/xml.cgi"),
    ("Eurogamer.es", "https://www.eurogamer.es/feed"),
    ("Gematsu", "https://www.gematsu.com/feed"),
    ("PlayStation Blog", "https://blog.es.playstation.com/feed/"),
]

STOPWORDS = set("""
de la el los las un una y o en a para por con del al que se su sus es son este
esta the of and for with from to in on at is are its new nuevo nueva anuncia
tras mas más ya como sera será tendra tendrá juego juegos game games video
""".split())


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (talk2play-radar)"})
    with urllib.request.urlopen(req, timeout=20) as r:
        raw = r.read()
    # algunos servidores (Vandal) mandan gzip aunque no se pida
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    return raw


def parse_feed(source: str, raw: bytes) -> list[dict]:
    items = []
    root = ET.fromstring(raw)
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = item.findtext("pubDate") or ""
        if not title or not link:
            continue
        try:
            when = parsedate_to_datetime(pub)
            if when.tzinfo is None:
                when = when.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
        items.append({"title": title, "url": link, "source": source, "when": when})
    return items


def keywords(title: str) -> set[str]:
    words = re.findall(r"[\wáéíóúñü]+", title.lower())
    return {w for w in words if len(w) > 3 and w not in STOPWORDS}


def main():
    cutoff = datetime.now(timezone.utc) - timedelta(hours=MAX_AGE_H)
    collected: list[dict] = []
    for source, url in FEEDS:
        try:
            collected += [t for t in parse_feed(source, fetch(url)) if t["when"] >= cutoff]
        except Exception as e:  # una fuente caida no tumba el radar
            print(f"aviso: {source} fallo ({e}); se sigue sin ella")

    if not collected:
        raise SystemExit("Ninguna fuente devolvio temas; no se toca el fichero.")

    # "caliente" = el mismo asunto aparece en mas de una fuente
    kw = [(t, keywords(t["title"])) for t in collected]
    for t, words in kw:
        t["hot"] = any(
            len(words & other_words) >= 2
            for other, other_words in kw
            if other is not t and other["source"] != t["source"]
        )

    collected.sort(key=lambda t: (not t["hot"], t["when"]), reverse=False)
    collected.sort(key=lambda t: t["when"], reverse=True)
    collected.sort(key=lambda t: not t["hot"])  # calientes primero, luego por fecha

    payload = {
        "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "temas": [
            {
                "title": t["title"],
                "url": t["url"],
                "source": t["source"],
                "when": t["when"].astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M"),
                "hot": t["hot"],
            }
            for t in collected[:MAX_ITEMS]
        ],
    }
    OUT.write_text(
        "window.T2P_TEMAS = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    hot = sum(1 for t in payload["temas"] if t["hot"])
    print(f"OK: {len(payload['temas'])} temas ({hot} calientes) → {OUT}")


if __name__ == "__main__":
    main()
