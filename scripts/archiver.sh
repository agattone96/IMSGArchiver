#!/bin/zsh
# Export full 1:1 iMessage thread to ~/Analyzed
# Interactive selection of handle.

set -euo pipefail

# --- CONFIG ---------------------------------------
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# VENV Support
if [[ -f "$SCRIPT_DIR/.venv/bin/activate" ]]; then
    source "$SCRIPT_DIR/.venv/bin/activate"
fi

: "${DB_PATH:=$HOME/Library/Messages/chat.db}"
: "${OUT_DIR:=$HOME/Analyzed}"
: "${CONTACTS_DIR:=$HOME/Library/Application Support/AddressBook}"
: "${OCR_BIN:=$SCRIPT_DIR/bin/ocr_helper}"
: "${TRANSCRIBE_BIN:=$SCRIPT_DIR/bin/transcribe_helper}"
: "${METADATA_FILE:=$SCRIPT_DIR/metadata.json}"
: "${TIMESTAMP_FILENAME:=0}"

# CLI Arguments
BATCH_COUNT=0
BATCH_PRESET="csv"

while [[ $# -gt 0 ]]; do
  case $1 in
    --batch)
      BATCH_COUNT="$2"
      shift 2
      ;;
    --preset)
      BATCH_PRESET="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# --- SECURE TEMP HANDLING ---
WORK_DIR=$(mktemp -d)
chmod 700 "$WORK_DIR"
TMP_DB="$WORK_DIR/chat_backup.db"
TMP_CONTACTS_DIR="$WORK_DIR/contacts_export"
mkdir -p "$TMP_CONTACTS_DIR"

cleanup() {
    echo "Cleaning up secure workspace..."
    rm -rf "$WORK_DIR"
}
trap cleanup EXIT INT TERM

export DB_PATH OUT_DIR CONTACTS_DIR OCR_BIN TRANSCRIBE_BIN TIMESTAMP_FILENAME BATCH_COUNT BATCH_PRESET TMP_DB SCRIPT_DIR METADATA_FILE TMP_CONTACTS_DIR

# --------------------------------------------------------------------------

# --- PERMISSION CHECK ---
echo "Checking Messages DB Access..."
if [[ ! -f "$DB_PATH" ]]; then
  echo "ERROR: Messages DB not found at: $DB_PATH" >&2
  exit 1
fi

# Dry-read to verify Full Disk Access
# Detecting actual terminal/process for better guidance
PARENT_PROC=$(ps -p $PPID -o comm= | sed 's:.*/::')

if ! head -c 16 "$DB_PATH" > /dev/null 2>&1; then
  echo "--------------------------------------------------------" >&2
  echo "ERROR: PERMISSION DENIED" >&2
  echo "The script cannot read your iMessage database." >&2
  echo "Please grant 'Full Disk Access' to '${PARENT_PROC:-Terminal}' in:" >&2
  echo "System Settings > Privacy & Security > Full Disk Access" >&2
  echo "--------------------------------------------------------" >&2
  exit 1
fi

echo "Access verified. Creating safe backup..."
if ! sqlite3 "$DB_PATH" ".backup '$TMP_DB'"; then
    echo "ERROR: Safe backup failed. Database may be locked or corrupted." >&2
    exit 1
fi

# --- CONTACTS DB (Address Book) ---
if [[ -d "$CONTACTS_DIR" ]]; then
  echo "Indexing contacts..."
  # T-004: Avoid piping to while loop to preserve variable scope
  # Use process substitution or temp file
  i=0
  while read -r dbfile; do
    cp "$dbfile" "$TMP_CONTACTS_DIR/contacts_${i}.abcddb"
    ((i++))
  done < <(find "$CONTACTS_DIR" -name "*.abcddb" -maxdepth 4)
fi

# --- LAUNCHER LOGIC ---
if [[ $BATCH_COUNT -eq 0 ]] && command -v streamlit >/dev/null 2>&1 && [[ -f "$SCRIPT_DIR/dashboard.py" ]]; then
    if streamlit run "$SCRIPT_DIR/dashboard.py"; then
        exit 0
    fi
    echo "Streamlit failed to launch. Falling back to native UI..."
fi

# --- EXECUTE PYTHON CLI ---
if python3 "$SCRIPT_DIR/cli_main.py"; then
    py_status=0
else
    py_status=$?
fi

# --- CLEANUP & NOTIFY ---

if [[ -f "$TMPDIR/target_outfile.txt" ]]; then
    OUT_FILE=$(cat "$TMPDIR/target_outfile.txt")
    rm "$TMPDIR/target_outfile.txt"
fi

# Cleanup is handled by the trap

if [[ $py_status -ne 0 ]]; then
  echo "Export failed." >&2
  exit "$py_status"
fi

echo "Done: ${OUT_FILE:-unknown}"

if command -v osascript >/dev/null 2>&1; then
  osascript -e 'display notification "Export complete." with title "iMessage export" subtitle "'"${OUT_FILE:-}"'"'
fi

if command -v open >/dev/null 2>&1 && [[ -n "${OUT_FILE:-}" ]]; then
  open -R "$OUT_FILE"
fi
