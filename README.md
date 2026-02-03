# iMessage Archiver

A professional macOS application to archive, browse, and analyze your iMessage history with a modern, native-feeling desktop experience.

![App Icon](app_icon.png)

## ✨ Features
- **Modern User Interface**: Built with React, Tailwind CSS, and Framer Motion for smooth animations and a premium feel.
- **Glassmorphism Design**: Native macOS aesthetics with frosted glass backgrounds and vibrant accents.
- **High-Performance Messaging**: Virtualized message list handling thousands of messages efficiently.
- **Unified specific Dashboard**: Command Center for stats, trends, and quick actions.
- **Search & Archive**: Instantly find threads and archive them with a single click.
- **Intelligent Processing**:
    - **OCR**: Extract text from images automatically.
    - **Transcription**: Convert audio messages to text.
- **Privacy First**: All processing happens locally on your machine. No data ever leaves your device.

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4, Framer Motion
- **Backend**: FastAPI (Python), Uvicorn
- **Container**: Electron
- **Database**: Direct SQLite integration with macOS `chat.db`

## 🚀 Getting Started

### Prerequisites
- **macOS**: Required for access to iMessage data.
- **Full Disk Access**: The application requires Full Disk Access to read your local `chat.db`.
    - Go to `System Settings > Privacy & Security > Full Disk Access`.
    - Add and enable **Archiver**.

### Development Setup

1. **Install Dependencies**
   ```bash
   # Install Frontend dependencies
   cd frontend
   npm install

   # Install Backend dependencies
   cd ..
   pip install -r requirements.txt
   ```

2. **Run in Development Mode**
   You need two terminal windows:

   **Terminal 1 (Frontend Dev Server)**:
   ```bash
   cd frontend
   npm run dev
   ```

   **Terminal 2 (Electron Host)**:
   ```bash
   # From root directory
   npm start
   ```

### Production Build

To create a distributable `.dmg` or `.app`:

1. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```
   This generates optimized assets in `frontend/dist`.

2. **Package Electron App**:
   ```bash
   # From root directory (ensure you have built the frontend first)
   npm run build-all
   ```
   The artifacts will be available in the `dist` folder.

## 📂 Output Structure
Exports are automatically organized in `~/Downloads/iMessage_Exports/`:
```
<Contact Name>/
├── chat_export.csv       # Categorized Message History
└── Media/                # High-res Attachments
    ├── Photos/
    ├── Videos/
    ├── Audio/            # Voice Memos + Transcripts
    └── OCR/              # Image Text Analysis
```

## 📄 License
MIT License - see [LICENSE](LICENSE) for details.
