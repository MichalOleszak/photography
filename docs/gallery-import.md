# Gallery automation

This gallery has one input: full-resolution photos in `images/fulls`.

To add photos, place final JPEG or PNG files in a country folder, then run:

```sh
cd photography-git
python3 scripts/sync_gallery.py
```

For example:

```text
images/fulls/peru/machu-picchu-01.jpg
images/fulls/peru/machu-picchu-02.jpg
```

The script is safe to run repeatedly. It never touches your full-resolution
files or overwrites a thumbnail. For each country folder containing photos it:

1. creates any missing 1000px-long-side thumbnails in `images/thumbs/<country>`;
2. creates `_countries/<country>.html` if the country does not yet have a page;
3. makes the country clickable and blue (visited) on the homepage map.

For a country that is not already on the map, it resolves the folder name once
from the same World Atlas dataset used by the homepage map to obtain its ISO
numeric map code and display name. Use ordinary lowercase folder names such as `peru`,
`new_zealand`, or `costa-rica`; the script recognizes the existing short names
`us`, `uk`, `uae`, `macedonia`, and `costarica` too.

After synchronizing, verify the rendered site and commit the changes:

```sh
bundle exec jekyll build
git status --short
```

Small territories that are rendered as map markers rather than country shapes
(for example the Faroe Islands) remain curated in `map/map-leaflet.js`; add
those manually when needed.
