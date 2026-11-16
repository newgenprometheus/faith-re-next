"""Diff pixel entre deux captures (contrat « même rendu »).
Usage: python scripts/diff-screens.py A.png B.png [out_heatmap.png]
Sortie: bbox des pixels changés, mean abs diff, % pixels changés.
mean ~0 et 0% => rendu identique.
"""
import sys
from PIL import Image, ImageChops

a = Image.open(sys.argv[1]).convert("RGB")
b = Image.open(sys.argv[2]).convert("RGB")
if a.size != b.size:
    print(f"SIZE DIFF: {a.size} vs {b.size}")
    sys.exit(2)

diff = ImageChops.difference(a, b)
bbox = diff.getbbox()
gray = diff.convert("L")
hist = gray.histogram()
npx = a.size[0] * a.size[1]
total = sum(i * hist[i] for i in range(256))
mean = total / npx
nonzero = sum(hist[1:])
print(f"{sys.argv[1].split(chr(92))[-1]} vs {sys.argv[2].split(chr(92))[-1]}")
print(f"  changed bbox   : {bbox}")
print(f"  mean abs diff  : {mean:.4f} / 255")
print(f"  changed pixels : {nonzero}/{npx} ({100*nonzero/npx:.3f}%)")
if bbox and len(sys.argv) > 3:
    diff.save(sys.argv[3])
    print(f"  heatmap        : {sys.argv[3]}")
