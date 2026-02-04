# iMessage Archiver

A professional, high-performance desktop application for archiving, searching, and visualizing iMessage history. Built with Electron, React, and FastAPI.

## Features

- **Local Archiving**: Securely archive your iMessages from your local Mac database.
- **Media Extraction**: Automatically extracts and organizes photos, videos, and audio.
- **Search & Explore**: Fast, full-text search across all your conversations.
- **Analytics**: View global stats and chat-specific usage trends.
- **Modern UI**: Dark-mode optimized, responsive interface with smooth animations.
- **Formats**: Export to CSV, JSON, or Markdown globally or per chat.

## Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion.
- **Backend**: Python 3 (FastAPI), SQLite (referencing local `chat.db`).
- **App Wrapper**: Electron.

## Prerequisites

- **macOS**: This application is currently designed for macOS (requires access to `~/Library/Messages/chat.db`).
- **Node.js**: v18.0.0 or higher.
- **Python**: v3.10 or higher.

## Development Setup

1. **Install Frontend/Electron Dependencies**
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```

2. **Setup Python Backend**
   It is recommended to use a virtual environment or ensure your global python3 has the requirements.
   ```bash
   # Create venv (optional but recommended)
   python3 -m venv backend/venv
   source backend/venv/bin/activate

   # Install dependencies
   pip install -r backend/requirements.txt
   ```
   
   > **Note**: The Electron app uses the system `python3` command by default in development. Ensure the dependencies are installed where `python3` resolves, or launch the app from an active virtual environment shell.

3. **Run in Development Mode**
   ```bash
   npm run dev
   ```
   This command starts the Vite dev server and the Electron app. The Electron app will automatically spawn the Python backend server.

## Building for Production

To compile without packaging:

```bash
npm run build
```

To create distributables:

```bash
npm run dist
```

This will:
1. Compile the Electron main process.
2. Build the React frontend.
3. Package the application using `electron-builder`.
4. Output the result to the `release/` directory.

macOS packaging targets:

```bash
npm run dist:mac
npm run dist:unsigned
npm run dist:signed
npm run dist:notarized
```

Signing / notarization environment variables:
- `CSC_NAME` or `CSC_LINK` + `CSC_KEY_PASSWORD` (Developer ID Application identity)
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` (notarization)

## Project Structure

- `electron/`: Main process code (window management, Python process lifecycle).
- `frontend/`: React application (UI, components, pages).
- `backend/`: Python source code.
    - `src/app.py`: FastAPI entry point.
    - `src/engine.py`: Core archiving logic and file processing.
    - `src/db.py`: Database interaction layer.
- `scripts/`: various maintenance scripts.

## Configuration

The backend supports several environment variables to customize behavior:

- **`OUT_DIR`**: Directory where archived chats are saved. Defaults to `~/Analyzed`.
- **`TIMESTAMP_FILENAME`**: Set to `1` to append a timestamp to the export filename (e.g., `chat_export_20240101.csv`).
- **`TMP_DB`**: Override path for the temporary copy of the `chat.db`.
- **`METADATA_FILE`**: Path to the JSON file storing app metadata.

## Troubleshooting

- **Database Permissions**: The app needs "Full Disk Access" or access to `~/Library/Messages`. If you see permission errors, ensure your Terminal (in dev) or the App (in prod) has the necessary permissions in macOS System Settings > Privacy & Security > Full Disk Access.
