#!/usr/bin/env bash
# Copy the progress the iPad saved to GitHub into Word List.xlsx, then save the spreadsheet back to GitHub.
#   bash tools/update_progress.sh
set -euo pipefail
cd "$(dirname "$0")/.."
source tools/github_personal.sh

use_personal_account
pull_main

if [[ ! -f progress/progress.json ]]; then
  echo "No progress saved from the iPad yet (progress/progress.json is missing)."
  exit 0
fi

.venv/bin/python tools/import_progress.py progress/progress.json "Word List.xlsx"
git add "Word List.xlsx"
if git diff --cached --quiet; then
  echo "Spreadsheet already up to date"
else
  git commit -q -m "chore: update progress in Word List.xlsx"
  push_main
  echo "Spreadsheet updated and saved to GitHub"
fi
