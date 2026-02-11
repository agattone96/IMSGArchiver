# 🔧 Archiver Backend (FastAPI)

This backend provides the local API used by the Electron app to query iMessage data and export archives.

---

## Stack

- **Framework:** FastAPI
- **Server:** Uvicorn
- **Validation:** Pydantic
- **Data source:** SQLite (`~/Library/Messages/chat.db`, via internal DB helpers)

---

## Setup

From repository root:

```bash
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt
```

---

## Run standalone

Run from repository root so Python can resolve the `backend` package:

```bash
python3 -m backend.src.app
```

Service URL: `http://127.0.0.1:8000`

Health check:

```bash
curl http://127.0.0.1:8000/health
```

---

## API endpoints (single source of truth)

To keep docs synchronized with FastAPI routes, do **not** maintain a manual endpoint table.

Use one of these runtime sources instead:

- OpenAPI docs: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

Optional route-list command (reads directly from `app.routes`):

```bash
python3 - <<'PY'
from backend.src.app import app
for route in sorted(app.routes, key=lambda r: getattr(r, 'path', '')):
    methods = ','.join(sorted(m for m in (route.methods or []) if m not in {'HEAD', 'OPTIONS'}))
    if methods and getattr(route, 'path', None):
        print(f"{methods:10} {route.path}")
PY
```

> This command intentionally derives endpoint data from the running code rather than duplicating it in markdown.

---

## Environment variables (single source of truth)

Environment variables are defined in `src/config.py`. Keep this list aligned to that file.

| Variable | Default | Purpose |
|---|---|---|
| `SCRIPT_DIR` | `os.getcwd()` (or exported value) | Working directory used to resolve metadata/bin paths |
| `TMP_DB` | empty | Override temporary `chat.db` copy path |
| `OUT_DIR` | `~/Analyzed` | Destination directory for archived outputs |
| `TMP_CONTACTS_DIR` | empty | Optional override for temporary contacts directory |
| `METADATA_FILE` | `${SCRIPT_DIR}/metadata.json` | Metadata persistence file path |
| `OCR_BIN` | `${SCRIPT_DIR}/bin/ocr_helper` | OCR helper binary path |
| `TRANSCRIBE_BIN` | `${SCRIPT_DIR}/bin/transcribe_helper` | Transcription helper binary path |

Related constant in application logic:

- `TIMESTAMP_FILENAME` can be set to `1` to append timestamps to exported filenames.

---

## Source layout

- `src/app.py` — FastAPI routes and models
- `src/engine.py` — archive orchestration and stats helpers
- `src/db.py` — SQLite access helpers
- `src/config.py` — environment-driven settings
- `src/helpers.py` — utility formatting/transform helpers

---

## Notes

- This service is intended for **local desktop use**, not internet-facing deployment.
- Access to `~/Library/Messages` may require Full Disk Access on macOS.
