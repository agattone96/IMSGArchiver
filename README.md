# 📦 iMessage Archiver

A desktop app for browsing, searching, and exporting iMessage history locally on macOS.

> **Stack:** Electron + React + FastAPI + SQLite

## Quickstart (copy/paste)

```bash
git clone <repo-url>
cd IMSGArchiver
cp .env.example .env
npm install
cd frontend && npm install && cd ..
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt
```

Run in two terminals:

```bash
# Terminal A
npm run dev

# Terminal B
npm run start
```

## What this app does

- Archive conversations from local iMessage data.
- Explore chats and messages in a desktop UI.
- Export chat data to CSV, JSON, or Markdown.
- View conversation and global analytics.

## Current frontend implementation status

Implemented screens and interactions:

- **Dashboard**: pulls `/stats/global` and `/chats/recent`, shows KPI cards and recent chat list.
- **Messages**: searchable chat list using `/chats/recent?search=...`, selectable conversation view with `/chats/{guid}/messages`.
- **Analytics**: global stat cards plus a chart built from `/stats/global`.
- **Media**: chat export workflow with format selector and action buttons calling `/chats/{guid}/archive`.

UI states implemented across these pages: loading, API error, and empty-result handling.

## Prerequisites

- macOS (required for `~/Library/Messages/chat.db` access)
- Node.js 18+
- Python 3.10+

## Build and package

```bash
npm run build
npm run dist
```

Additional macOS targets:

```bash
npm run dist:mac
npm run dist:unsigned
npm run dist:signed
npm run dist:notarized
```

Build output: `release/`.

## Configuration

Use `.env.example` as the source template:

```bash
cp .env.example .env
```

Backend environment variables are defined in `backend/src/config.py` and documented in `backend/README.md`.

## Project structure

```text
.
├── electron/   # Desktop main/preload code
├── frontend/   # React UI
├── backend/    # FastAPI service + archive engine
├── scripts/    # Build/install/utility scripts
├── docs/       # Stable project docs + ADRs
└── assets/     # App icons and branding
```

## Repository docs

- Backend details: `backend/README.md`
- Frontend details: `frontend/README.md`
- Contribution guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- License: `LICENSE`
- ADRs: `docs/adr/`

## Troubleshooting

### Permission issues reading iMessage DB

Grant **Full Disk Access** to:

- Terminal (development)
- Archiver app (packaged builds)

Path: System Settings → Privacy & Security → Full Disk Access.

### Backend fails to start

- Confirm `python3` points to environment with dependencies installed.
- Confirm no process is already bound to `127.0.0.1:8000`.
