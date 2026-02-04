#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
BIN_DIR="$BACKEND_DIR/bin"
SPEC_DIR="$BACKEND_DIR/.pyi_spec"
WORK_DIR="$BACKEND_DIR/.pyi_build"
CACHE_DIR="$BACKEND_DIR/.cache"
HASH_FILE="$CACHE_DIR/backend_build_hash"
OUTPUT_BIN="$BIN_DIR/archiver-backend"

PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
    echo "ERROR: python3 not found. Install Python 3.10+ to build the backend binary." >&2
    exit 1
fi

compute_hash() {
    (
        cd "$ROOT_DIR" || exit 1
        {
            find backend -type d \( \
                -name bin -o -name .pyi_build -o -name .pyi_spec -o -name .cache -o -name __pycache__ -o -name venv -o -name .venv \
            \) -prune -false -o -type f -print
            echo "scripts/build_backend_binary.sh"
        } | sort | while IFS= read -r file; do
            if [[ -f "$file" ]]; then
                hash="$(shasum -a 256 "$file" | awk '{print $1}')"
                printf '%s\t%s\n' "$file" "$hash"
            fi
        done
    ) | shasum -a 256 | awk '{print $1}'
}

mkdir -p "$CACHE_DIR"
CURRENT_HASH="$(compute_hash)"
if [[ -f "$HASH_FILE" && -f "$OUTPUT_BIN" ]]; then
    LAST_HASH="$(cat "$HASH_FILE")"
    if [[ "$CURRENT_HASH" == "$LAST_HASH" ]]; then
        echo "Backend binary up-to-date, skipping"
        exit 0
    fi
fi

echo "Building backend binary with ${PYTHON_BIN}..."
"$PYTHON_BIN" -m pip install --quiet -r "$BACKEND_DIR/requirements.txt" pyinstaller

rm -rf "$BIN_DIR"
mkdir -p "$BIN_DIR"

"$PYTHON_BIN" -m PyInstaller --noconfirm --clean \
    --name archiver-backend \
    --onefile \
    --distpath "$BIN_DIR" \
    --workpath "$WORK_DIR" \
    --specpath "$SPEC_DIR" \
    "$BACKEND_DIR/src/app.py"

rm -rf "$WORK_DIR" "$SPEC_DIR"
echo "$CURRENT_HASH" > "$HASH_FILE"
echo "Backend binary ready: $BIN_DIR/archiver-backend"
