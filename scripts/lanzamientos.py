"""Bot de lanzamientos: consulta las novedades de la tienda de Steam
(API publica, sin clave) y regenera data/lanzamientos.js para el panel
"Lanzamientos" de la portada.

Uso:  python scripts/lanzamientos.py
Lo ejecuta la tarea programada del bot (scripts/bot.cmd) a diario.
"""
import json
import urllib.request
from datetime import date
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "lanzamientos.js"
API = "https://store.steampowered.com/api/featuredcategories?cc=ES&l=spanish"
MAX_ITEMS = 6


def main():
    req = urllib.request.Request(API, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)

    items = []
    for it in data.get("new_releases", {}).get("items", []):
        if not it.get("id") or not it.get("name"):
            continue
        items.append({
            "appid": it["id"],
            "name": it["name"],
            # céntimos -> euros; 0 = gratis (o precio sin revelar)
            "price": round(it.get("final_price", 0) / 100, 2),
            "discount": it.get("discount_percent", 0),
            "url": f"https://store.steampowered.com/app/{it['id']}/",
        })
        if len(items) >= MAX_ITEMS:
            break

    if not items:
        raise SystemExit("Steam no devolvio novedades; no se toca el fichero.")

    payload = {"updated": date.today().isoformat(), "source": "Steam", "items": items}
    OUT.write_text(
        "window.T2P_LANZAMIENTOS = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"OK: {len(items)} lanzamientos → {OUT}")


if __name__ == "__main__":
    main()
