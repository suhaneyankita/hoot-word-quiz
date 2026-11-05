#!/usr/bin/env bash
# Publish the word list and app to GitHub Pages.
#   bash tools/publish.sh            export, test, commit and push
#   bash tools/publish.sh --dry-run  export and test only
set -euo pipefail
cd "$(dirname "$0")/.."
source tools/github_personal.sh

branch="$(git branch --show-current)"
if [[ "$branch" != "main" ]]; then
  echo "Publish from main (you're on '$branch')." >&2
  exit 1
fi

if [[ "${1:-}" != "--dry-run" ]]; then
  use_personal_account
  if gh repo view "$OWNER/$REPO" > /dev/null 2>&1; then pull_main; fi
fi

.venv/bin/python tools/export_words.py "Word List.xlsx" app/data/words.json
node --test tests/*.test.mjs > /dev/null
.venv/bin/pytest -q tests > /dev/null
echo "Tests passed"

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "Dry run: nothing committed or pushed"
  exit 0
fi

git add app/data/words.json
git diff --cached --quiet || git commit -q -m "chore: update word list"

if ! gh repo view "$OWNER/$REPO" > /dev/null 2>&1; then
  gh repo create "$OWNER/$REPO" --public --description "Hoot's Word Quiz for iPad"
fi
push_main

# The website is the app/ folder, published on its own gh-pages branch.
# Each publish gets a fresh offline-cache name so the iPad picks up the new files.
site="$(mktemp -d)"
cp -R app/. "$site"
sed -i '' "s/const CACHE = \"hoot-[A-Za-z0-9]*\"/const CACHE = \"hoot-$(git rev-parse --short=8 HEAD)-$(date +%s)\"/" "$site/sw.js"
touch "$site/.nojekyll"
(
  cd "$site"
  git init -q -b gh-pages
  git add -A
  git -c user.name="$OWNER" -c user.email="$OWNER@users.noreply.github.com" commit -q -m "chore: publish site"
  git_personal push -q --force "$REMOTE" gh-pages
)
rm -rf "$site"

# Point Pages at the gh-pages branch (creates the site the first time, switches it otherwise).
if ! gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=legacy -f "source[branch]=gh-pages" -f "source[path]=/" > /dev/null 2>&1; then
  gh api -X PUT "repos/$OWNER/$REPO/pages" -f build_type=legacy -f "source[branch]=gh-pages" -f "source[path]=/" > /dev/null
fi
echo "Published: https://$OWNER.github.io/$REPO/ (live in a minute or two)"
