import datetime
import plistlib
import re
import hashlib
import os

def mac_timestamp_to_iso(mac_ts):
    if not mac_ts: return ""
    ts = mac_ts / 1_000_000_000 + 978307200
    try: return datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")
    except: return ""

def normalize_handle(handle):
    if not handle: return ""
    if "@" in handle: return handle.lower().strip()
    norm = "".join(c for c in handle if c.isdigit())
    return norm[-10:] if len(norm) >= 10 else norm

def decode_body(text, attributed):
    if text: return text
    if not attributed: return ""
    
    # T-002: Improved decoding for NSKeyedArchiver (bplist) blobs
    try:
        if attributed.startswith(b"bplist"):
            plist = plistlib.loads(attributed)
            if isinstance(plist, dict) and "$objects" in plist:
                # The actual message string is usually the first non-technical string after the root
                # We look for the first string that isn't a class name or attribute name
                exclude = {
                    "NSAttributedString", "NSString", "NSDictionary", "NSColor", "NSFont", 
                    "NSParagraphStyle", "NSMutableString", "NSShadow", "NSBackgroundColor",
                    "NSKern", "NSStrikethrough", "NSUnderline", "NSExpansion", "NSObliqueness"
                }
                for obj in plist["$objects"]:
                    if isinstance(obj, str) and obj not in exclude and len(obj) > 0:
                        # Avoid returning metadata-like keys
                        if not obj.startswith("NS") and not obj.startswith("-"):
                            return obj
    except (AttributeError, plistlib.InvalidFileException):
        pass
    
    # Fallback to UTF-8 decoding with sanitization
    try:
        decoded = attributed.decode("utf-8", errors="ignore")
        # Extract sequences of printable characters if standard decoding fails
        match = re.search(r"[\x20-\x7E\s]{4,}", decoded)
        if match:
            return match.group(0).strip()
    except:
        pass
        
    # Final fallback: Return a hex snippet to maintain auditability without crashing
    return f"[Decryption/Decode Failed: {attributed[:20].hex()}...]"

def get_file_hash(path):
    try:
        stat = os.stat(path)
        return hashlib.md5(f"{path}:{stat.st_mtime}:{stat.st_size}".encode()).hexdigest()
    except: return None
