#!/bin/bash
set -e

APP_NAME="Archiver.app"
INSTALL_DIR="/Applications"
SOURCE_APP=$(ls -d dist/mac*/$APP_NAME | head -n 1)

echo "📦 Installing Electron App..."

# 1. Build
echo "🏗️  Building Production Bundle..."
./build_electron.sh

# 2. Cleanup Old Versions
if [[ -d "$INSTALL_DIR/$APP_NAME" ]]; then
    echo "🗑️  Removing old version..."
    rm -rf "$INSTALL_DIR/$APP_NAME"
fi

# 3. Install
echo "🚀 Moving App to $INSTALL_DIR..."
cp -R "$SOURCE_APP" "$INSTALL_DIR/"

# 4. Refresh Icon Cache
echo "🔄 Refreshing Icon Cache..."
touch "$INSTALL_DIR/$APP_NAME"
killall Dock || true

# 4. Verify
if [[ -d "$INSTALL_DIR/$APP_NAME" ]]; then
    echo "
✅ Installation Complete!
-----------------------
The app has been installed to:
   $INSTALL_DIR/iMessage Archiver.app

You can now launch it directly. No Python or Terminal required.
"
else
    echo "❌ Installation failed."
    exit 1
fi
