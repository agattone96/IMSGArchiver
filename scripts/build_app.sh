#!/bin/bash
set -e

# Config
APP_NAME="iMessage Archiver"
ICON_PNG="app_icon.png"
WORK_DIR="$(pwd)"

echo "🔨 Starting Build Process..."

# 1. Install Dependencies
echo "📦 Installing dependencies from requirements.txt..."
pip install -r requirements.txt --quiet
pip install pyobjc --quiet
pip install pyinstaller --quiet

# 2. Create Icon (.icns)
if [[ -f "$ICON_PNG" ]]; then
    echo "🎨 Generating App Icon..."
    ICONSET="AppIcon.iconset"
    mkdir -p "$ICONSET"
    
    # Resize to standard sizes
    sips -z 16 16     -s format png "$ICON_PNG" --out "$ICONSET/icon_16x16.png" >/dev/null
    sips -z 32 32     -s format png "$ICON_PNG" --out "$ICONSET/icon_16x16@2x.png" >/dev/null
    sips -z 32 32     -s format png "$ICON_PNG" --out "$ICONSET/icon_32x32.png" >/dev/null
    sips -z 64 64     -s format png "$ICON_PNG" --out "$ICONSET/icon_32x32@2x.png" >/dev/null
    sips -z 128 128   -s format png "$ICON_PNG" --out "$ICONSET/icon_128x128.png" >/dev/null
    sips -z 256 256   -s format png "$ICON_PNG" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
    sips -z 512 512   -s format png "$ICON_PNG" --out "$ICONSET/icon_512x512.png" >/dev/null
    sips -z 1024 1024 -s format png "$ICON_PNG" --out "$ICONSET/icon_512x512@2x.png" >/dev/null
    
    iconutil -c icns "$ICONSET"
    rm -rf "$ICONSET"
    ICON_FLAG="--icon=AppIcon.icns"
else
    echo "⚠️  Icon not found, using default."
    ICON_FLAG=""
fi

# 3. Clean previous build
rm -rf dist build

# 4. Run PyInstaller
echo "📦 Compiling Bundle..."
# We need to collect metadata for streamlit/altair explicitly sometimes, 
# but often standard hooks work. We include standard libs.
pyinstaller --noconfirm --clean \
    --name "$APP_NAME" \
    --windowed \
    --onedir \
    $ICON_FLAG \
    --add-data "dashboard.py:." \
    --add-data "backend:backend" \
    --add-data "metadata.json:." \
    --add-data "bin:bin" \
    --hidden-import "streamlit" \
    --hidden-import "pandas" \
    --hidden-import "altair" \
    --hidden-import "sqlite3" \
    --hidden-import "webview" \
    --hidden-import "webview.platforms.cocoa" \
    --hidden-import "objc" \
    --hidden-import "Cocoa" \
    --hidden-import "WebKit" \
    --exclude-module "transformers" \
    --exclude-module "torch" \
    --exclude-module "tensorboard" \
    --exclude-module "matplotlib" \
    --collect-all "streamlit" \
    --collect-all "altair" \
    --collect-all "webview" \
    bootstrap.py

# 5. Cleanup
echo "🧹 Cleaning up..."
rm -f "$APP_NAME.spec"
rm -f AppIcon.icns

echo "
✅ Build Complete!
------------------
Your standalone app is located at:
   $(pwd)/dist/$APP_NAME.app

Isolate environment test:
You can move this app to another computer and it should run without Python installed.
"
