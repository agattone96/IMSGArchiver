#!/bin/bash
set -e

echo "📦 Installing iMessage Archiver (Electron)..."

# Open the DMG installer
if [ -f "dist/iMessage Archiver-1.0.0-arm64.dmg" ]; then
    open "dist/iMessage Archiver-1.0.0-arm64.dmg"
    echo "
✅ Installer Opened!
--------------------
Drag 'iMessage Archiver' to your Applications folder.

Once installed, you can launch it from:
/Applications/iMessage Archiver.app
"
else
    echo "❌ DMG file not found. Run ./build_electron.sh first."
    exit 1
fi
