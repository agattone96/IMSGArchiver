#!/bin/bash
# View iMessage Archiver diagnostic logs

LOG_DIR="$HOME/Library/Logs/iMessageArchiver"

echo "================================================"
echo "iMessage Archiver Diagnostic Logs"
echo "================================================"
echo ""

if [ ! -d "$LOG_DIR" ]; then
    echo "No logs found. App hasn't been launched yet."
    echo "Log directory: $LOG_DIR"
    exit 1
fi

# List all log files
LOG_COUNT=$(ls -1 "$LOG_DIR"/*.log 2>/dev/null | wc -l)
echo "Found $LOG_COUNT log file(s)"
echo ""

# Get most recent log
LATEST_LOG=$(ls -t "$LOG_DIR"/launch_*.log 2>/dev/null | head -1)

if [ -z "$LATEST_LOG" ]; then
    echo "No launch logs found."
    exit 1
fi

echo "Latest log: $(basename "$LATEST_LOG")"
echo "Created: $(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$LATEST_LOG")"
echo "Size: $(du -h "$LATEST_LOG" | cut -f1)"
echo ""
echo "================================================"
echo "LOG CONTENT:"
echo "================================================"
cat "$LATEST_LOG"
echo ""
echo "================================================"
echo ""
echo "To share this log, run:"
echo "  cat \"$LATEST_LOG\" | pbcopy"
echo "  (copied to clipboard for pasting)"
echo ""
echo "Or email the file:"
echo "  open \"$LATEST_LOG\""
