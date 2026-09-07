"""Gate determinista del portal: valida datos, estructura y referencias.

Uso:  python scripts/check.py        (exit 0 = verde, exit 1 = rojo con motivo)
Es el criterio de terminado de SCOPE.md y lo ejecuta el pre-commit.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATEGORIES = {"Noticias", "Reacciones", "Gameplays", "Directos"}
errors: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def check_data() -> None:
    data_file = ROOT / "data" / "videos.js"
    if not data_file.exists():
        err("data/videos.js no existe — ejecuta scripts/update.py")
        return
    raw = data_file.read_text(encoding="utf-8")
    m = re.match(r"window\.T2P_DATA = ({.*});\s*$", raw, re.S)
    if not m:
        err("data/videos.js no tiene el formato 'window.T2P_DATA = {...};'")
        return
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError as e:
        err(f"data/videos.js no es JSON valido: {e}")
        return

    videos = data.get("videos", [])
    shorts = data.get("shorts", [])
    if len(videos) < 5:
        err(f"solo {len(videos)} videos en los datos (minimo razonable: 5)")
    for i, v in enumerate(videos):
        if not re.fullmatch(r"[\w-]{11}", v.get("id") or ""):
            err(f"videos[{i}] sin id valido de YouTube: {v.get('id')!r}")
        if not v.get("title"):
            err(f"videos[{i}] sin titulo")
        if v.get("category") not in CATEGORIES:
            err(f"videos[{i}] con categoria desconocida: {v.get('category')!r}")
    for i, s in enumerate(shorts):
        if not re.fullmatch(r"[\w-]{11}", s.get("id") or ""):
            err(f"shorts[{i}] sin id valido de YouTube: {s.get('id')!r}")
    # la portada ordena por visitas: al menos un video debe traer el dato
    if videos and not any(v.get("views") for v in videos):
        err("ningun video trae 'views' — el parser de update.py ha dejado de casar con YouTube")


def check_noticias() -> None:
    news_file = ROOT / "data" / "noticias.js"
    if not news_file.exists():
        err("data/noticias.js no existe")
        return
    raw = news_file.read_text(encoding="utf-8")
    m = re.match(r"window\.T2P_NOTICIAS = ({.*});\s*$", raw, re.S)
    if not m:
        err("data/noticias.js no tiene el formato 'window.T2P_NOTICIAS = {...};'")
        return
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError as e:
        err(f"data/noticias.js no es JSON valido: {e}")
        return
    seen: set[str] = set()
    for i, a in enumerate(data.get("articles", [])):
        for field in ("id", "title", "date", "author", "body", "category"):
            if not a.get(field):
                err(f"articles[{i}] sin campo '{field}'")
        if a.get("category") and a["category"] not in CATEGORIES:
            err(f"articles[{i}] con categoria desconocida: {a['category']!r}")
        if a.get("id") in seen:
            err(f"articles[{i}] con id duplicado: {a['id']!r}")
        seen.add(a.get("id"))


def check_references() -> None:
    index = ROOT / "index.html"
    if not index.exists():
        err("index.html no existe")
        return
    html = index.read_text(encoding="utf-8")
    for ref in re.findall(r'(?:src|href)="((?:assets|data)/[^"]+)"', html):
        if not (ROOT / ref).exists():
            err(f"index.html referencia {ref} y no existe")
    for element_id in ("hero", "grid", "toplist", "shorts-strip", "ticker-reel", "updated"):
        if f'id="{element_id}"' not in html:
            err(f"index.html perdio el elemento id=\"{element_id}\" que app.js rellena")


def check_admin() -> None:
    for page in ("admin.html", "noticia.html"):
        f = ROOT / page
        if not f.exists():
            err(f"{page} no existe")
            continue
        html = f.read_text(encoding="utf-8")
        for ref in re.findall(r'(?:src|href)="((?:assets|data)/[^"]+)"', html):
            if not (ROOT / ref).exists():
                err(f"{page} referencia {ref} y no existe")


def main() -> int:
    check_data()
    check_noticias()
    check_references()
    check_admin()
    if errors:
        print(f"ROJO — {len(errors)} problema(s):")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("VERDE — datos validos y referencias completas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
