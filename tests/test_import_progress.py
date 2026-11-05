import json
import sys
from pathlib import Path

import pytest
from openpyxl import Workbook, load_workbook

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from import_progress import import_progress  # noqa: E402

HEAD = ["No.", "Word", "Meaning", "Synonyms", "Antonyms", "Sentence", "Status",
        "Times asked", "Times wrong", "Correct in a row", "Last seen"]


@pytest.fixture
def sheet(tmp_path):
    path = tmp_path / "Word List.xlsx"
    wb = Workbook(); ws = wb.active; ws.title = "Words"; ws.append(HEAD)
    ws.append([1, "timid", "shy", "shy", "bold", "The timid mouse.", "New", 0, 0, 0, None])
    ws.append([2, "Arduous", "hard", "tough", "easy", "An arduous task.", "New", 0, 0, 0, None])
    wb.save(path)
    return path


def write(tmp_path, data):
    f = tmp_path / "hoot-progress.json"
    f.write_text(json.dumps(data))
    return f


def row_for(path, word):
    ws = load_workbook(path)["Words"]
    head = [c.value for c in ws[1]]
    for row in ws.iter_rows(min_row=2, values_only=True):
        if str(row[1]).lower() == word:
            return dict(zip(head, row))


def test_import_updates_columns(sheet, tmp_path):
    f = write(tmp_path, {"app": "hoot-word-quiz", "exported": "2026-11-05", "words": {
        "timid": {"status": "Practise", "timesAsked": 3, "timesWrong": 2, "correctInARow": 0, "lastSeen": "2026-11-05"}}})
    assert import_progress(f, sheet) == (1, [])
    r = row_for(sheet, "timid")
    assert (r["Status"], r["Times asked"], r["Times wrong"], r["Correct in a row"], r["Last seen"]) == ("Practise", 3, 2, 0, "2026-11-05")
    assert row_for(sheet, "arduous")["Status"] == "New"


def test_import_matches_any_case(sheet, tmp_path):
    f = write(tmp_path, {"app": "hoot-word-quiz", "words": {
        "arduous": {"status": "Passed", "timesAsked": 1, "timesWrong": 0, "correctInARow": 1, "lastSeen": "2026-11-05"}}})
    assert import_progress(f, sheet) == (1, [])
    assert row_for(sheet, "arduous")["Status"] == "Passed"


def test_import_rejects_foreign_file(sheet, tmp_path):
    with pytest.raises(ValueError):
        import_progress(write(tmp_path, {"app": "other"}), sheet)


def test_import_reports_unknown(sheet, tmp_path):
    f = write(tmp_path, {"app": "hoot-word-quiz", "words": {"zephyr": {"status": "Passed"}}})
    assert import_progress(f, sheet) == (0, ["zephyr"])
