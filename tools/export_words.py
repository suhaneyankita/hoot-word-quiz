"""Turn Word List.xlsx into app/data/words.json for the iPad app."""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from openpyxl import load_workbook

FIELDS = {"word": "Word", "meaning": "Meaning", "synonyms": "Synonyms",
          "antonyms": "Antonyms", "sentence": "Sentence"}


def _text(value) -> str:
    return "" if value is None else str(value).strip()


def _split(value) -> list[str]:
    return [p.strip() for p in _text(value).split(",") if p.strip()]


def read_rows(xlsx: Path) -> list[dict]:
    ws = load_workbook(xlsx, read_only=True)["Words"]
    rows = ws.iter_rows(values_only=True)
    header = [_text(h) for h in next(rows)]
    col = {key: header.index(name) for key, name in FIELDS.items()}
    words = []
    for row in rows:
        word = _text(row[col["word"]]).lower()
        if not word:
            continue
        words.append({
            "word": word,
            "meaning": _text(row[col["meaning"]]),
            "synonyms": _split(row[col["synonyms"]]),
            "antonyms": _split(row[col["antonyms"]]),
            "sentence": _text(row[col["sentence"]]),
        })
    return words


def export(xlsx: Path, out: Path, now: datetime) -> int:
    words = read_rows(xlsx)
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {"version": now.astimezone(timezone.utc).isoformat(timespec="seconds"), "words": words}
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=1))
    return len(words)


if __name__ == "__main__":
    count = export(Path(sys.argv[1]), Path(sys.argv[2]), datetime.now(timezone.utc))
    print(f"Exported {count} words")
