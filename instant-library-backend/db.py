# db.py - local JSON file persistence (lowdb-style: load once, keep in memory, write whole file)
import json
import os
import threading

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "db.json")

DEFAULTS = {
    "users": [],
    "books": [],
    "requests": [],
    "audits": [],
    "otps": [],  # pending email OTP challenges (codes are stored hashed)
}


class JsonDB:
    def __init__(self, path, defaults):
        self.path = path
        self.lock = threading.RLock()
        self.data = self._read()

        # ✅ Provide default structure (IMPORTANT)
        for key, value in defaults.items():
            self.data.setdefault(key, list(value))
        self.write()

    def _read(self):
        if not os.path.exists(self.path):
            return {}
        # utf-8-sig also accepts files saved with a BOM (common with Windows editors/PowerShell)
        with open(self.path, "r", encoding="utf-8-sig") as f:
            content = f.read().strip()
        if not content:
            return {}
        try:
            return json.loads(content)
        except json.JSONDecodeError as err:
            raise ValueError(f"Malformed JSON in file: {self.path}\n{err}") from err

    def write(self):
        with self.lock:
            tmp_path = f"{self.path}.tmp"
            # backslashreplace writes lone surrogates from user input as \udXXX escapes (valid JSON,
            # same as JSON.stringify) instead of failing every future write
            with open(tmp_path, "w", encoding="utf-8", errors="backslashreplace") as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
            os.replace(tmp_path, self.path)

    def get(self, collection):
        """All items in a collection (like db.get('users').value())."""
        return self.data[collection]

    def find(self, collection, **attrs):
        """First item whose fields match attrs (like db.get('users').find({...}).value())."""
        with self.lock:
            for item in self.data[collection]:
                if all(item.get(key) == value for key, value in attrs.items()):
                    return item
        return None

    def push(self, collection, item):
        """Append an item and persist (like db.get('users').push(item).write())."""
        with self.lock:
            self.data[collection].append(item)
            self.write()

    def remove(self, collection, predicate):
        """Delete every item for which predicate(item) is true and persist. Returns the number removed."""
        with self.lock:
            items = self.data[collection]
            kept = [item for item in items if not predicate(item)]
            removed = len(items) - len(kept)
            if removed:
                items[:] = kept
                self.write()
            return removed


db = JsonDB(DB_FILE, DEFAULTS)
