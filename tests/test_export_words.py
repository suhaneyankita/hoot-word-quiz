import json, sys
from datetime import datetime, timezone
from pathlib import Path
from openpyxl import Workbook

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from export_words import export  # noqa: E402

HEAD = ["No.", "Word", "Meaning", "Synonyms", "Antonyms", "Sentence", "Status",
        "Times asked", "Times wrong", "Correct in a row", "Last seen"]


def make_sheet(path, rows):
    wb = Workbook(); ws = wb.active; ws.title = "Words"; ws.append(HEAD)
    for r in rows:
        ws.append(r)
    wb.save(path)


def test_export_shape(tmp_path):
    x = tmp_path / "w.xlsx"
    make_sheet(x, [
        [1, " Gregarious ", "loving company", "sociable, outgoing,, friendly", "shy", "He is gregarious.", "New", 0, 0, 0, None],
        [2, "annual", "yearly", "yearly", None, "An annual fair.", "New", 0, 0, 0, None],
        [3, None, "x", "", "", "", "New", 0, 0, 0, None],
    ])
    out = tmp_path / "words.json"
    n = export(x, out, datetime(2026, 11, 5, tzinfo=timezone.utc))
    data = json.loads(out.read_text())
    assert n == 2
    assert data["version"].startswith("2026-11-05")
    assert data["words"][0]["word"] == "gregarious"
    assert data["words"][0]["synonyms"] == ["sociable", "outgoing", "friendly"]
    assert data["words"][1]["antonyms"] == []


def test_export_real_sheet(tmp_path):
    out = tmp_path / "words.json"
    n = export(ROOT / "Word List.xlsx", out, datetime.now(timezone.utc))
    words = [w["word"] for w in json.loads(out.read_text())["words"]]
    assert n == 170 and len(set(words)) == 170
