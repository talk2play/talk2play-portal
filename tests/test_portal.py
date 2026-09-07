"""Tests del portal: parser de categorías y la gate completa.

Uso:  python -m unittest discover -s tests
Solo stdlib, coherente con la regla 4 de ARCHITECTURE.md.
"""
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from update import category  # noqa: E402


class TestCategoria(unittest.TestCase):
    def test_directos_ganan_a_gameplay(self):
        # un directo de la Gamescom con gameplay en el titulo es un directo
        self.assertEqual(category("GAMEPLAY DE FABLE | XBOX DIA 1 GAMESCOM 2026"), "Directos")

    def test_gameplay(self):
        self.assertEqual(category("PRIMERA HORA CON LOS SANGREFRIA | GAMEPLAY DAWNWALKER"), "Gameplays")

    def test_reaccion(self):
        self.assertEqual(category("REACCIÓN TW3 SONGS OF THE PAST"), "Reacciones")

    def test_actualidad_por_defecto(self):
        # la categoria "Noticias" es exclusiva de la redaccion; los episodios
        # de comentario van a Actualidad
        self.assertEqual(category("SEGA DEFIENDE EL FORMATO FÍSICO"), "Actualidad")


class TestGate(unittest.TestCase):
    def test_check_pasa_sobre_el_repo(self):
        r = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "check.py")],
            capture_output=True, text=True,
        )
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)


if __name__ == "__main__":
    unittest.main()
