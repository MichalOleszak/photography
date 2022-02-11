import os
import sys

from PIL import Image
from pathlib import Path

fulls_path = os.path.join("images", "fulls")
thumbs_path = os.path.join("images", "thumbs")

for country in sys.argv[1:]:
    files = [Path(fulls_path, country, f) for f in os.listdir(os.path.join(fulls_path, country)) if f.lower().endswith(".jpg")]
    for infile in files:
        outfile = os.path.join(thumbs_path, country, infile.name)
        try:
            im = Image.open(infile)
            size = im.size[0] // 4, im.size[1] // 4
            im.thumbnail(size)
            im.save(outfile, "JPEG")
        except IOError:
            print(f"Cannot create thumbnail for", {infile})
print("Finished successfully! :)")