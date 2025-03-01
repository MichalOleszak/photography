"""
Usage example:
cd ~/Documents/photography
python create_thumb.py --countries morocco georgia
"""

import argparse
import os
import sys

from PIL import Image
from pathlib import Path

fulls_path = os.path.join("images", "fulls")
thumbs_path = os.path.join("images", "thumbs")

parser = argparse.ArgumentParser()
parser.add_argument("--countries", nargs="+")
parser.add_argument('--force', default=False, required=False, action="store_true")
args = parser.parse_args()

print(f"Running for:\n  countries: {args.countries}\n  force: {args.force}")

for country in args.countries:
    files = [Path(fulls_path, country, f) for f in os.listdir(os.path.join(fulls_path, country)) if f.lower().endswith(".jpg")]
    for infile in files:
        outdir = os.path.join(thumbs_path, country)
        outfile = os.path.join(outdir, infile.name)
        os.makedirs(outdir, exist_ok=True)
        if os.path.exists(outfile) and not args.force:
            print(f"{outfile} already exists, skipping")
            continue
        try:
            im = Image.open(infile)
            size = im.size[0] // 4, im.size[1] // 4
            im.thumbnail(size)
            im.save(outfile, "JPEG")
        except IOError as e:
            print(f"Cannot create thumbnail for {infile}, error{e}")
print("Finished successfully! :)")