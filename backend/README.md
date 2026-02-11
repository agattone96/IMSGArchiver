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

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| GET | `/system/status` | API + storage status |
| GET | `/stats/global` | Global message statistics |
| GET | `/chats/recent` | Recent chat list |
| GET | `/chats/{guid}/messages` | Messages for a specific chat |
| POST | `/chats/{guid}/archive` | Export/archive a chat |
| POST | `/onboarding/check-access` | Verify Messages DB access |
| GET | `/onboarding/status` | Read onboarding completion state |
| POST | `/onboarding/complete` | Mark onboarding as complete |

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
