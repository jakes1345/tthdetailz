#!/bin/bash
# Run this when adding new images — converts JPGs to WebP
# Usage: ./optimize-images.sh [directory]
# Default: public/media/images/

DIR="${1:-public/media/images}"

for img in "$DIR"/*.jpg "$DIR"/*.jpeg; do
  [ -f "$img" ] || continue
  webp="${img%.*}.webp"
  if [ ! -f "$webp" ] || [ "$img" -nt "$webp" ]; then
    cwebp -q 80 "$img" -o "$webp" 2>/dev/null && \
      echo "Converted: $(basename "$img") → $(basename "$webp")"
  fi
done
