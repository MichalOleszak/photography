import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).parents[1] / "scripts" / "sync_gallery.py"
SPEC = importlib.util.spec_from_file_location("sync_gallery", SCRIPT)
gallery = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(gallery)


class GallerySyncTests(unittest.TestCase):
    def test_normalizes_folder_names_for_country_lookup(self):
        self.assertEqual(gallery.country_query("new_zealand"), "new zealand")
        self.assertEqual(gallery.country_query("costarica"), "Costa Rica")
        self.assertEqual(gallery.country_query("macedonia"), "North Macedonia")

    def test_creates_missing_country_page_only_once(self):
        with tempfile.TemporaryDirectory() as directory:
            countries = Path(directory)
            self.assertTrue(gallery.ensure_country_page(countries, "peru"))
            self.assertFalse(gallery.ensure_country_page(countries, "peru"))
            self.assertEqual((countries / "peru.html").read_text(), "---\nlayout: country\n---\n")

    def test_adds_clickable_visited_country_to_map(self):
        with tempfile.TemporaryDirectory() as directory:
            map_path = Path(directory) / "map-leaflet.js"
            map_path.write_text("var visitedCountries = {\n    };\n\n    // Small territories\n")
            with patch.object(gallery, "country_details", return_value=("604", "Peru")):
                result = gallery.ensure_map_entry(map_path, "peru")

            self.assertEqual(result, "added Peru to map")
            self.assertIn("'604': { slug: 'peru', name: 'Peru' },", map_path.read_text())

    def test_links_a_previously_visited_country_without_duplicate_entry(self):
        with tempfile.TemporaryDirectory() as directory:
            map_path = Path(directory) / "map-leaflet.js"
            map_path.write_text("    '300': { slug: null, name: 'Greece' },\n")
            with patch.object(gallery, "country_details", return_value=("300", "Greece")):
                result = gallery.ensure_map_entry(map_path, "greece")

            self.assertEqual(result, "linked existing Greece map entry")
            self.assertEqual(map_path.read_text(), "    '300': { slug: 'greece', name: 'Greece' },\n")


if __name__ == "__main__":
    unittest.main()
