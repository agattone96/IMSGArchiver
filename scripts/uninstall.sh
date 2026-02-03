#!/bin/bash
# Complete Uninstall Script for iMessage Archiver
# Removes ALL traces of the app from your system

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "iMessage Archiver - Complete Uninstall"
echo "================================================"
echo ""

# Confirm with user
echo -e "${YELLOW}WARNING: This will remove ALL data and traces of iMessage Archiver${NC}"
echo ""
echo "This includes:"
echo "  - Application bundle (/Applications/iMessage Archiver.app)"
echo "  - Diagnostic logs (~/Library/Logs/iMessageArchiver)"
echo "  - Application cache (~/Library/Application Support/imessage-archiver)"
echo "  - User preferences (~/Library/Preferences/com.antigravity.imessagearchiver.plist)"
echo "  - Any exported CSV files (if in default location)"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
echo

if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Uninstall cancelled."
    exit 0
fi

echo ""
echo "Starting uninstall..."
echo ""

# Function to remove and report
remove_if_exists() {
    local path="$1"
    local description="$2"
    
    if [ -e "$path" ]; then
        echo -e "${YELLOW}Removing${NC} $description..."
        rm -rf "$path"
        echo -e "${GREEN}✓${NC} Removed: $path"
    else
        echo -e "  (not found: $path)"
    fi
}

# Kill running processes
echo "Stopping running processes..."
pkill -f "iMessage Archiver" 2>/dev/null && echo -e "${GREEN}✓${NC} Killed app process" || echo "  (no running process found)"
pkill -f "streamlit.*dashboard.py" 2>/dev/null && echo -e "${GREEN}✓${NC} Killed Streamlit process" || echo "  (no Streamlit process)"
sleep 1
echo ""

# Remove application bundle
remove_if_exists "/Applications/iMessage Archiver.app" "Application bundle"
echo ""

# Remove logs
remove_if_exists "$HOME/Library/Logs/iMessageArchiver" "Diagnostic logs"
echo ""

# Remove application support data
remove_if_exists "$HOME/Library/Application Support/imessage-archiver" "Application cache"
echo ""

# Remove preferences
remove_if_exists "$HOME/Library/Preferences/com.antigravity.imessagearchiver.plist" "User preferences"
echo ""

# Remove saved application state
remove_if_exists "$HOME/Library/Saved Application State/com.antigravity.imessagearchiver.savedState" "Saved state"
echo ""

# Ask about exported CSV files
echo "Checking for exported data..."
if [ -d "$HOME/Desktop/iMessageArchives" ]; then
    echo -e "${YELLOW}Found exported archives at:${NC} ~/Desktop/iMessageArchives"
    read -p "Do you want to remove exported CSV files too? (y/N): " -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        remove_if_exists "$HOME/Desktop/iMessageArchives" "Exported CSV archives"
    else
        echo "  Keeping exported files."
    fi
else
    echo "  (no exported files found)"
fi
echo ""

# Clean up any leftover mounted DMG volumes
echo "Cleaning up installer volumes..."
for vol in "/Volumes/iMessage Archiver"*; do
    if [ -d "$vol" ]; then
        echo "  Unmounting: $vol"
        hdiutil detach "$vol" 2>/dev/null || true
    fi
done
echo ""

# Summary
echo "================================================"
echo -e "${GREEN}Uninstall Complete${NC}"
echo "================================================"
echo ""
echo "All traces of iMessage Archiver have been removed from your system."
echo ""
echo "Note: This script does NOT remove:"
echo "  - Your original iMessage database (~/Library/Messages/chat.db)"
echo "  - This uninstall script itself"
echo ""
echo "To reinstall, download a new DMG from the distribution source."
