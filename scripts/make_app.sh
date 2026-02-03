#!/bin/bash
set -e

APP_NAME="iMessage Archiver.app"
SCRIPT_PATH="$(pwd)/archiver.sh"
ICON_SOURCE="/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ToolbarFavoritesIcon.icns" # Generic Heart/Favorite Icon

echo "Creating $APP_NAME..."

# Create the AppleScript wrapper
# This script tells Terminal to launch our shell script
osacompile -o "$APP_NAME" -e "tell application \"Terminal\" to do script \"$SCRIPT_PATH\"" -e "tell application \"Terminal\" to activate"

# Add a custom icon if we can (Optional polish)
# Copying a system icon to the bundle resources
if [[ -f "$ICON_SOURCE" ]]; then
    cp "$ICON_SOURCE" "$APP_NAME/Contents/Resources/applet.icns"
fi

# Update Info.plist to hide the applet dock icon if desired, 
# but we want it visible. We might want to set LSUIElement to 1 if we wanted it background only,
# but for a terminal wrapper, standard behavior is fine.

echo "✅ App Bundle Created at: $(pwd)/$APP_NAME"
echo "You can drag this to your /Applications folder or Dock."
