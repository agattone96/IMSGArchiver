#!/bin/bash
# Enhanced Launch Profiler for iMessage Archiver
# Comprehensive diagnostics with error handling and detailed logging

set -e

APP_PATH="/Applications/iMessage Archiver.app"
LOG_FILE="$HOME/Desktop/launch_profile_$(date +%Y%m%d_%H%M%S).log"
TEMP_LOG="/tmp/streamlit_output_$$.log"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================" | tee "$LOG_FILE"
echo "iMessage Archiver Enhanced Launch Profile" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"
echo "================================================" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Helper function to log with timestamp
log_time() {
    echo "[$(date +%H:%M:%S)] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

# =============================================================================
# PHASE 1: Pre-launch Environment Checks
# =============================================================================
log_time "==> Phase 1: Environment Validation"

# Check if app exists
if [ ! -d "$APP_PATH" ]; then
    log_error "App not found at $APP_PATH"
    exit 1
fi
log_success "App found: $APP_PATH"

APP_SIZE=$(du -sh "$APP_PATH" | cut -f1)
log_time "App bundle size: $APP_SIZE"

# Check Python
log_time "Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    PYTHON_PATH=$(which python3)
    log_success "Python: $PYTHON_VERSION at $PYTHON_PATH"
else
    log_error "python3 not found in PATH"
    exit 1
fi

# Check required Python modules
log_time "Checking Python dependencies..."
REQUIRED_MODULES=("streamlit" "pandas" "altair")
for module in "${REQUIRED_MODULES[@]}"; do
    if python3 -c "import $module" 2>/dev/null; then
        VERSION=$(python3 -c "import $module; print($module.__version__)")
        log_success "$module: v$VERSION"
    else
        log_error "$module not installed"
    fi
done

# Check available ports
log_time "Checking port availability..."
for port in 8501 8502 8503; do
    if lsof -i :$port > /dev/null 2>&1; then
        log_warn "Port $port is in use"
    else
        log_success "Port $port available"
    fi
done

echo "" | tee -a "$LOG_FILE"

# =============================================================================
# PHASE 2: Application Launch
# =============================================================================
log_time "==> Phase 2: Launching Application"

# Kill any existing instances
log_time "Cleaning up old processes..."
pkill -f "iMessage Archiver" 2>/dev/null && log_time "Killed existing app instance"
pkill -f "streamlit run" 2>/dev/null && log_time "Killed existing Streamlit"
sleep 1

# Launch app
log_time "Launching app..."
open -a "$APP_PATH" 2>&1 | tee -a "$LOG_FILE"

# Wait for Electron
sleep 2
ELECTRON_PID=$(pgrep -f "iMessage Archiver.app" | head -1)
if [ -n "$ELECTRON_PID" ]; then
    log_success "Electron process: PID $ELECTRON_PID"
else
    log_error "Electron process not found"
    exit 1
fi

echo "" | tee -a "$LOG_FILE"

# =============================================================================
# PHASE 3: Monitor Python/Streamlit Startup
# =============================================================================
log_time "==> Phase 3: Backend Monitoring"

# Wait for Python process
log_time "Waiting for Python/Streamlit process..."
PYTHON_PID=""
for i in {1..30}; do
    PYTHON_PID=$(pgrep -f "streamlit run" | head -1)
    if [ -n "$PYTHON_PID" ]; then
        log_success "Streamlit process: PID $PYTHON_PID (after ${i}00ms)"
        break
    fi
    sleep 0.1
done

if [ -z "$PYTHON_PID" ]; then
    log_error "Streamlit process never started"
    exit 1
fi

# Capture Streamlit logs
log_time "Capturing Streamlit output..."
sleep 1
ps -p $PYTHON_PID -o command= | tee -a "$LOG_FILE"

# Check what modules Streamlit loaded
log_time "Checking loaded Python modules..."
lsof -p $PYTHON_PID | grep "\.so$" | awk '{print $9}' | grep -E "(pandas|altair|streamlit)" | head -5 | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"

# =============================================================================
# PHASE 4: HTTP Server Health Check
# =============================================================================
log_time "==> Phase 4: Server Health Check"

# Find which port Streamlit is using
log_time "Detecting Streamlit port..."
STREAMLIT_PORT=""
for port in 8501 8502 8503 8504 8505; do
    if lsof -i :$port -sTCP:LISTEN | grep -q $PYTHON_PID; then
        STREAMLIT_PORT=$port
        log_success "Streamlit listening on port $port"
        break
    fi
    sleep 0.2
done

if [ -z "$STREAMLIT_PORT" ]; then
    log_error "Could not find Streamlit port"
    exit 1
fi

# Test HTTP connectivity
log_time "Testing HTTP endpoint..."
HTTP_ATTEMPTS=0
HTTP_SUCCESS=false

for attempt in {1..30}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$STREAMLIT_PORT 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" == "200" ]; then
        log_success "HTTP 200 OK (after $attempt attempts)"
        HTTP_SUCCESS=true
        break
    elif [ "$HTTP_CODE" == "000" ]; then
        log_time "Attempt $attempt: Connection refused"
    else
        log_warn "Attempt $attempt: HTTP $HTTP_CODE"
    fi
    
    sleep 0.5
done

if [ "$HTTP_SUCCESS" = false ]; then
    log_error "Server never returned HTTP 200"
fi

# Fetch actual page content
log_time "Fetching page content..."
CONTENT_FILE="/tmp/streamlit_content_$$.html"
curl -s http://localhost:$STREAMLIT_PORT > "$CONTENT_FILE"
CONTENT_SIZE=$(wc -c < "$CONTENT_FILE")
log_time "Page content size: $CONTENT_SIZE bytes"

# Check for error indicators
if grep -q "error" "$CONTENT_FILE" || grep -q "exception" "$CONTENT_FILE"; then
    log_error "Page contains error/exception text"
    grep -i "error\|exception" "$CONTENT_FILE" | head -5 | tee -a "$LOG_FILE"
else
    log_success "No obvious errors in page content"
fi

# Check if Streamlit actually loaded
if grep -q "streamlit" "$CONTENT_FILE"; then
    log_success "Streamlit framework detected in page"
else
    log_warn "Streamlit framework not detected - page might be blank"
fi

# Check for dashboard-specific content
if grep -q "iMessage" "$CONTENT_FILE" || grep -q "Archive" "$CONTENT_FILE"; then
    log_success "Dashboard content detected"
else
    log_warn "Dashboard-specific content NOT found - page may be empty"
fi

echo "" | tee -a "$LOG_FILE"

# =============================================================================
# PHASE 5: Resource Usage & Process State
# =============================================================================
log_time "==> Phase 5: System Resources"

if [ -n "$ELECTRON_PID" ]; then
    ELECTRON_MEM=$(ps -o rss= -p $ELECTRON_PID 2>/dev/null | awk '{print $1/1024 " MB"}' || echo "N/A")
    ELECTRON_CPU=$(ps -o %cpu= -p $ELECTRON_PID 2>/dev/null || echo "N/A")
    log_time "Electron: $ELECTRON_MEM RAM, $ELECTRON_CPU% CPU"
fi

if [ -n "$PYTHON_PID" ]; then
    PYTHON_MEM=$(ps -o rss= -p $PYTHON_PID 2>/dev/null | awk '{print $1/1024 " MB"}' || echo "N/A")
    PYTHON_CPU=$(ps -o %cpu= -p $PYTHON_PID 2>/dev/null || echo "N/A")
    log_time "Python/Streamlit: $PYTHON_MEM RAM, $PYTHON_CPU% CPU"
fi

# Check for crash/error logs
log_time "Checking for crash logs..."
CRASH_LOG=$(ls -t ~/Library/Logs/DiagnosticReports/iMessage\ Archiver* 2>/dev/null | head -1)
if [ -n "$CRASH_LOG" ]; then
    log_warn "Recent crash log found: $CRASH_LOG"
else
    log_success "No recent crash logs"
fi

echo "" | tee -a "$LOG_FILE"

# =============================================================================
# PHASE 6: Console Error Capture
# =============================================================================
log_time "==> Phase 6: Capturing Console Errors"

# Try to capture stderr from processes
if [ -n "$PYTHON_PID" ]; then
    log_time "Python process stderr (if available):"
    lsof -p $PYTHON_PID 2>/dev/null | grep "2w" | tee -a "$LOG_FILE"
fi

echo "" | tee -a "$LOG_FILE"

# =============================================================================
# SUMMARY
# =============================================================================
log_time "================================================"
log_time "DIAGNOSTIC SUMMARY"
log_time "================================================"

echo "" | tee -a "$LOG_FILE"
log_time "Log saved to: $LOG_FILE"
log_time "Page content saved to: $CONTENT_FILE"
echo "" | tee -a "$LOG_FILE"

if [ "$HTTP_SUCCESS" = true ] && [ $CONTENT_SIZE -gt 1000 ]; then
    log_success "App appears to be running normally"
else
    log_error "App may have issues - review logs above"
fi

echo ""
echo "To debug further, run:"
echo "  cat $CONTENT_FILE | head -100"
echo "  tail -f ~/.streamlit/logs/*.log"
