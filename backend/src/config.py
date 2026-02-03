import os
import sys

# --- CONFIG & ENV ---
if getattr(sys, 'frozen', False):
    # PyInstaller bundle path
    SCRIPT_DIR = sys._MEIPASS
else:
    # Use environment variable or default to current directory
    # Note: When running via archiver.sh, SCRIPT_DIR is exported
    SCRIPT_DIR = os.environ.get("SCRIPT_DIR") or os.getcwd()

DEFAULT_DB_PATH = os.path.expanduser("~/Library/Messages/chat.db")
TMP_DB = os.path.expandvars(os.environ.get("TMP_DB", ""))

# REDIRECT: Default to ~/Analyzed as requested
OUT_DIR = os.path.expandvars(os.environ.get("OUT_DIR", os.path.expanduser("~/Analyzed")))

TMP_CONTACTS_DIR = os.path.expandvars(os.environ.get("TMP_CONTACTS_DIR", ""))
METADATA_FILE = os.path.expandvars(os.environ.get("METADATA_FILE", os.path.join(SCRIPT_DIR, "metadata.json")))
OCR_BIN = os.path.expandvars(os.environ.get("OCR_BIN", os.path.join(SCRIPT_DIR, "bin", "ocr_helper")))
TRANSCRIBE_BIN = os.path.expandvars(os.environ.get("TRANSCRIBE_BIN", os.path.join(SCRIPT_DIR, "bin", "transcribe_helper")))

# T-006: Binary Hash Pinning (Security Hardening)
OCR_HASH = "62e7dd0608edfb3a46dda9411dc9b24cfcdafe50a2d565613ed785f8fe7bb29b"
TRANSCRIBE_HASH = "8ef2b3237023d5cefc35a0a1a2a60353cd54852d785241f76551de0f8ea56ced"

REACTION_MAP = {
    2000: "Loved", 2001: "Liked", 2002: "Disliked", 2003: "Laughed",
    2004: "Emphasized", 2005: "Questioned", 3000: "Removed Love",
    3001: "Removed Like", 3002: "Removed Dislike", 3003: "Removed Laugh",
    3004: "Removed Emphasis", 3005: "Removed Question",
}
