#!/bin/bash
set -e

echo "🎨 Creating macOS Icon Set..."

# Create iconset directory
mkdir -p build/icon.iconset

# Generate all required icon sizes from app_icon.png
sips -s format png -z 16 16     app_icon.png --out build/icon.iconset/icon_16x16.png
sips -s format png -z 32 32     app_icon.png --out build/icon.iconset/icon_16x16@2x.png
sips -s format png -z 32 32     app_icon.png --out build/icon.iconset/icon_32x32.png
sips -s format png -z 64 64     app_icon.png --out build/icon.iconset/icon_32x32@2x.png
sips -s format png -z 128 128   app_icon.png --out build/icon.iconset/icon_128x128.png
sips -s format png -z 256 256   app_icon.png --out build/icon.iconset/icon_128x128@2x.png
sips -s format png -z 256 256   app_icon.png --out build/icon.iconset/icon_256x256.png
sips -s format png -z 512 512   app_icon.png --out build/icon.iconset/icon_256x256@2x.png
sips -s format png -z 512 512   app_icon.png --out build/icon.iconset/icon_512x512.png
sips -s format png -z 1024 1024 app_icon.png --out build/icon.iconset/icon_512x512@2x.png

# Convert to .icns
iconutil -c icns build/icon.iconset -o build/icon.icns

echo "✅ Icon created: build/icon.icns"
