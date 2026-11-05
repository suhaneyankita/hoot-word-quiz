# Shared by the tools: act as the personal GitHub account, never the work one.
# Source this file; it defines OWNER, REPO, REMOTE and the pull_main / push_main helpers.

OWNER="suhaneyankita"
REPO="hoot-word-quiz"
REMOTE="https://github.com/$OWNER/$REPO.git"

use_personal_account() {
  unset GITHUB_TOKEN
  GH_TOKEN="$(gh auth token --hostname github.com --user "$OWNER" 2>/dev/null || true)"
  export GH_TOKEN
  local login
  login="$( [[ -n "$GH_TOKEN" ]] && gh api user --jq .login 2>/dev/null || true)"
  if [[ "$login" != "$OWNER" ]]; then
    echo "Not signed in as '$OWNER'. Run: env -u GITHUB_TOKEN gh auth login --hostname github.com --git-protocol https --web" >&2
    exit 1
  fi
}

git_personal() { git -c credential.helper= -c credential.helper='!gh auth git-credential' "$@"; }

# The iPad saves progress straight to GitHub, so always bring those commits in first.
pull_main() { git_personal pull -q --rebase "$REMOTE" main; }
push_main() { git_personal push -q "$REMOTE" main; }
