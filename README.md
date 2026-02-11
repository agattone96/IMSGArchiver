# 📦 iMessage Archiver

A polished desktop application for browsing, searching, and exporting iMessage history locally on your Mac.

> **Stack:** Electron + React + FastAPI + SQLite

---

## ✨ What this app does

- Archive conversations from your local iMessage database.
- Explore chats and messages in a modern desktop UI.
- Export chat data to **CSV**, **JSON**, or **Markdown**.
- View conversation-level analytics and global stats.

---

## 🧱 Architecture

| Layer | Technology | Purpose |
|---|---|---|
| Desktop shell | Electron | Native desktop windowing, lifecycle, packaging |
| Frontend | React 18 + TypeScript + Vite + Tailwind | UI, routing, data display |
| Backend API | FastAPI + Uvicorn | Data access, archive operations |
| Data source | macOS `chat.db` (SQLite) | iMessage message/chat storage |

---

## ✅ Prerequisites

- **macOS** (required to access `~/Library/Messages/chat.db`)
- **Node.js 18+**
- **Python 3.10+**

---

## 🚀 Development setup

### 1) Install JavaScript dependencies

From repository root:

```bash
npm install
cd frontend && npm install && cd ..
```

### 2) Install backend Python dependencies

```bash
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt
```

> The Electron process uses `python3` in your environment. If using a virtualenv, run Electron commands from the activated shell.

### 3) Run in development

Use two terminals:

**Terminal A (frontend + TypeScript watch):**
```bash
npm run dev
```

**Terminal B (launch Electron app):**
```bash
npm run start
```

`npm run dev` starts Vite and continuously compiles Electron TypeScript. `npm run start` launches Electron.

---

## 🏗️ Build and package

### Build app artifacts (no installer)

```bash
npm run build
```

### Create distributables

```bash
npm run dist
```

Additional macOS targets:

```bash
npm run dist:mac
npm run dist:unsigned
npm run dist:signed
npm run dist:notarized
```

Build output is written to `release/`.

---

## 🔐 Signing / notarization environment variables

For signed/notarized macOS builds, configure:

- `CSC_NAME` **or** `CSC_LINK` + `CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

---

## 📁 Project structure

```text
.
├── electron/   # Desktop main/preload code
├── frontend/   # React UI
├── backend/    # FastAPI service + archive engine
├── scripts/    # Build/install/utility scripts
└── assets/     # App icons and branding
```

---

## ⚙️ Backend environment configuration

To avoid documentation drift, backend runtime environment variables are maintained in **one place**:

- See [`backend/README.md#environment-variables-single-source-of-truth`](backend/README.md#environment-variables-single-source-of-truth)

The canonical implementation is `backend/src/config.py`.

---

## 🩺 Troubleshooting

### Permission issues reading iMessage DB

Grant **Full Disk Access** to:

- Terminal (for development)
- Archiver app (for packaged builds)

Path: **System Settings → Privacy & Security → Full Disk Access**.

### Backend fails to start

- Confirm `python3` points to an environment with dependencies installed.
- Confirm no process is already bound to `127.0.0.1:8000`.

---

## 📚 Additional docs

- Backend details: [`backend/README.md`](backend/README.md)
- Frontend details: [`frontend/README.md`](frontend/README.md)
