# 0. Asset Preparation
echo "🎨 Optimizing Icon & Generating Sets..."
# Reset icon state from source if needed
# (Assuming latest source icon is already app_icon.png from previous steps)
python3 optimize_icon.py
./create_icons.sh

# 1. Install Node dependencies
echo "📦 Installing Electron..."
npm install

# 2. Ensure Python dependencies
echo "🐍 Checking Python dependencies..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
.venv/bin/pip install -r requirements.txt --quiet

# 3. Build App
echo "🏗️  Building macOS App..."
npm run build

echo "
✅ Build Complete!
------------------
App: dist/mac/iMessage Archiver.app
DMG: dist/iMessage Archiver-1.0.0.dmg

To install:
open dist/*.dmg
"
