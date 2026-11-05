#!/usr/bin/env bash
# Publish the word list and app to GitHub Pages.
#   bash tools/publish.sh            export, test, commit and push
#   bash tools/publish.sh --dry-run  export and test only
set -euo pipefail
cd "$(dirname "$0")/.."

OWNER="suhaneyankita"
REPO="hoot-word-quiz"

.venv/bin/python tools/export_words.py "Word List.xlsx" app/data/words.json
node --test tests/*.test.mjs > /dev/null
.venv/bin/pytest -q tests > /dev/null
echo "Tests passed"

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "Dry run: nothing committed or pushed"
  exit 0
fi

login="$(gh api user --jq .login 2>/dev/null || true)"
if [[ "$login" != "$OWNER" ]]; then
  echo "GitHub CLI is signed in as '${login:-nobody}', not '$OWNER'. Run: gh auth login" >&2
  exit 1
fi

# New cache name so the iPad picks up the new files.
n="$(grep -o 'hoot-v[0-9]*' app/sw.js | grep -o '[0-9]*$')"
sed -i '' "s/hoot-v$n\"/hoot-v$((n + 1))\"/" app/sw.js

git add app
git diff --cached --quiet || git commit -q -m "chore: update word list"

if ! git remote get-url origin > /dev/null 2>&1; then
  gh repo create "$OWNER/$REPO" --public --source . --remote origin --description "Hoot's Word Quiz for iPad"
  git push -u origin main
  gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow > /dev/null
else
  git push origin main
fi
echo "Published: https://$OWNER.github.io/$REPO/"
