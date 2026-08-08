#!/usr/bin/env python3
"""Synchronize the photography site from images/fulls. Run with no arguments.

Drop final full-resolution JPEG/PNG files into images/fulls/<country>/ and run
this script from anywhere. It creates missing thumbnails, country pages, and
visited-country map links. Existing files are never overwritten.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"
COUNTRY_RE = re.compile(r"^[a-z0-9]+(?:[_-][a-z0-9]+)*$")
MAP_ENTRY_RE = re.compile(
    r"^(?P<indent>\s*)'(?P<code>\d{3})': \{ slug: (?P<slug>null|'[^']+'), name: '(?P<name>[^']+)' \},?$",
    re.MULTILINE,
)


def country_query(slug: str) -> str:
    """Turn a gallery folder name into a World Atlas country name."""
    aliases = {
        "costarica": "Costa Rica",
        "macedonia": "North Macedonia",
        "uae": "United Arab Emirates",
        "uk": "United Kingdom",
        "us": "United States of America",
    }
    return aliases.get(slug, slug.replace("_", " ").replace("-", " "))


def normalized_country_name(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def country_details(slug: str) -> tuple[str, str]:
    """Return ISO numeric code and display name from the map's own dataset."""
    query = country_query(slug)
    try:
        with urlopen(WORLD_ATLAS_URL, timeout=15) as response:  # nosec B310: fixed HTTPS endpoint
            geometries = json.load(response)["objects"]["countries"]["geometries"]
    except (HTTPError, URLError, TimeoutError) as exc:
        raise RuntimeError(f"Could not load the country map data for {query!r}: {exc}") from exc
    countries = [
        geometry
        for geometry in geometries
        if normalized_country_name(geometry.get("properties", {}).get("name", "")) == normalized_country_name(query)
    ]
    if len(countries) != 1:
        raise RuntimeError(f"Could not uniquely identify {query!r} to update the map")
    country = countries[0]
    return str(country["id"]).zfill(3), country["properties"]["name"]


def create_thumbnail(source: Path, destination: Path) -> None:
    subprocess.run(
        ["sips", "-Z", "1000", str(source), "--out", str(destination)],
        check=True,
        capture_output=True,
        text=True,
    )


def ensure_country_page(countries_dir: Path, slug: str) -> bool:
    page = countries_dir / f"{slug}.html"
    if page.exists():
        return False
    page.write_text("---\nlayout: country\n---\n")
    return True


def ensure_map_entry(map_path: Path, slug: str) -> str:
    """Link a gallery country on the map, returning what changed."""
    text = map_path.read_text()
    if re.search(r"slug: '" + re.escape(slug) + r"'", text):
        return "already linked"

    code, name = country_details(slug)
    entries = list(MAP_ENTRY_RE.finditer(text))
    existing = next((entry for entry in entries if entry.group("code") == code), None)
    if existing:
        replacement = f"{existing.group('indent')}'{code}': {{ slug: '{slug}', name: '{existing.group('name')}' }},"
        map_path.write_text(text[: existing.start()] + replacement + text[existing.end() :])
        return f"linked existing {name} map entry"

    marker = "    };\n\n    // Small territories"
    if marker not in text:
        raise RuntimeError("Could not find the visitedCountries block in map/map-leaflet.js")
    entry = f"        '{code}': {{ slug: '{slug}', name: '{name}' }},\n"
    map_path.write_text(text.replace(marker, entry + marker, 1))
    return f"added {name} to map"


def main() -> int:
    repo = Path(__file__).resolve().parents[1]
    fulls_root = repo / "images" / "fulls"
    thumbs_root = repo / "images" / "thumbs"
    countries_dir = repo / "_countries"
    map_path = repo / "map" / "map-leaflet.js"

    countries = sorted(path for path in fulls_root.iterdir() if path.is_dir())
    changes = []
    for full_dir in countries:
        slug = full_dir.name
        if not COUNTRY_RE.fullmatch(slug):
            print(f"Skipping invalid country folder: {slug}", file=sys.stderr)
            continue
        images = sorted(path for path in full_dir.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS)
        if not images:
            continue
        # Resolve the map entry first. If the country cannot be identified,
        # avoid leaving new thumbnails or a page behind in a partial sync.
        map_result = ensure_map_entry(map_path, slug.replace("_", "-"))
        thumb_dir = thumbs_root / slug
        thumb_dir.mkdir(parents=True, exist_ok=True)
        created_thumbnails = 0
        for image in images:
            thumbnail = thumb_dir / image.name
            if not thumbnail.exists():
                create_thumbnail(image, thumbnail)
                created_thumbnails += 1
        page_created = ensure_country_page(countries_dir, slug)
        if created_thumbnails or page_created or map_result != "already linked":
            changes.append(f"{slug}: {created_thumbnails} thumbnail(s), "
                           f"country page {'created' if page_created else 'already present'}, {map_result}")

    if changes:
        print("Gallery synchronized:")
        print("\n".join(f"  {change}" for change in changes))
    else:
        print("Gallery already synchronized; nothing to do.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
