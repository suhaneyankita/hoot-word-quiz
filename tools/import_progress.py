"""Copy her progress file (sent from the iPad) into Word List.xlsx."""
import json
import sys
from pathlib import Path

from openpyxl import load_workbook

COLUMNS = {"status": "Status", "timesAsked": "Times asked", "timesWrong": "Times wrong",
           "correctInARow": "Correct in a row", "lastSeen": "Last seen"}


def import_progress(progress_file: Path, xlsx: Path) -> tuple[int, list[str]]:
    data = json.loads(Path(progress_file).read_text())
    if not isinstance(data, dict) or data.get("app") != "hoot-word-quiz":
        raise ValueError("This isn't a Hoot's Word Quiz progress file")
    progress = {k.lower(): v for k, v in (data.get("words") or {}).items()}

    wb = load_workbook(xlsx)
    ws = wb["Words"]
    header = [c.value for c in ws[1]]
    word_col = header.index("Word")
    cols = {key: header.index(name) for key, name in COLUMNS.items()}

    updated = set()
    for row in ws.iter_rows(min_row=2):
        word = str(row[word_col].value or "").strip().lower()
        if word in progress:
            for key, i in cols.items():
                if key in progress[word]:
                    row[i].value = progress[word][key]
            updated.add(word)
    wb.save(xlsx)
    return len(updated), sorted(set(progress) - updated)


if __name__ == "__main__":
    count, unknown = import_progress(Path(sys.argv[1]), Path(sys.argv[2]))
    print(f"Updated {count} words" + (f"; not in the sheet: {', '.join(unknown)}" if unknown else ""))
