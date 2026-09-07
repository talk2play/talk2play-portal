"""Tracking de metricas del canal: toma una foto diaria (suscriptores, videos,
visitas de los ultimos videos y de los shorts) y la acumula como historico en
data/metricas.js, que el panel de admins pinta como tendencia.

Uso:  python scripts/metricas.py
Lo ejecuta la tarea diaria del bot. Fuente: paginas publicas del canal.
"""
import json
import re
from datetime import date
from pathlib import Path

from update import CHANNEL, fetch, find_key, initial_data

OUT = Path(__file__).resolve().parent.parent / "data" / "metricas.js"
TWITCH_USER = "talk2play"


def twitch_followers() -> int | None:
    """Seguidores via DecAPI (api publica sin clave). None si falla: una caida
    de DecAPI no debe tumbar la foto diaria de YouTube."""
    try:
        return int(fetch(f"https://decapi.me/twitch/followcount/{TWITCH_USER}").strip())
    except Exception as e:
        print(f"aviso: Twitch sin dato hoy ({e})")
        return None


def view_count(text: str) -> float:
    """'1,8 K visualizaciones' -> 1800 ; '25 visualizaciones' -> 25"""
    m = re.search(r"([\d.,]+)\s*(K|M)?", text.replace("\xa0", " "))
    if not m:
        return 0
    n = float(m.group(1).replace(",", "."))
    unit = (m.group(2) or "").upper()
    return n * (1000 if unit == "K" else 1000000 if unit == "M" else 1)


def snapshot() -> dict:
    data = initial_data(fetch(f"{CHANNEL}/videos"))

    subs = videos_total = 0
    for header in find_key(data, "pageHeaderViewModel"):
        for row in find_key(header, "metadataParts"):
            for part in row:
                text = part.get("text", {}).get("content", "")
                if re.search(r"suscriptor", text, re.I):
                    subs = int(view_count(text))
                elif re.search(r"v.deos", text, re.I):
                    videos_total = int(view_count(text))

    views_recent = 0
    for lv in find_key(data, "lockupViewModel"):
        for row in find_key(lv.get("metadata", {}), "metadataParts"):
            for part in row:
                text = part.get("text", {}).get("content", "")
                if re.search(r"visualiza|vista|view", text, re.I) and re.search(r"\d", text):
                    views_recent += int(view_count(text))

    views_shorts = 0
    shorts_data = initial_data(fetch(f"{CHANNEL}/shorts"))
    for s in find_key(shorts_data, "shortsLockupViewModel"):
        secondary = find_key(s, "secondaryText")
        if secondary and secondary[0].get("content"):
            views_shorts += int(view_count(secondary[0]["content"]))

    snap = {
        "date": date.today().isoformat(),
        "subs": subs,
        "videos": videos_total,
        "views_recientes": views_recent,
        "views_shorts": views_shorts,
    }
    twitch = twitch_followers()
    if twitch is not None:
        snap["twitch"] = twitch
    return snap


def main():
    history = []
    if OUT.exists():
        m = re.match(r"window\.T2P_METRICAS = ({.*});\s*$", OUT.read_text(encoding="utf-8"), re.S)
        if m:
            try:
                history = json.loads(m.group(1)).get("history", [])
            except json.JSONDecodeError:
                history = []

    snap = snapshot()
    if snap["subs"] == 0 and snap["views_recientes"] == 0:
        raise SystemExit("El scrape no devolvio metricas; se conserva el historico tal cual.")

    # una entrada por dia: la de hoy se sobreescribe si el bot corre dos veces
    history = [h for h in history if h.get("date") != snap["date"]]
    history.append(snap)
    history.sort(key=lambda h: h["date"])

    payload = {"updated": snap["date"], "history": history}
    OUT.write_text(
        "window.T2P_METRICAS = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"OK: foto de hoy anadida ({snap['subs']} subs, {len(history)} dia(s) de historico) → {OUT}")


if __name__ == "__main__":
    main()
