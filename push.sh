#!/usr/bin/env bash
# Push the main branch to GitHub (minhhoang2007/chess-simulator).
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

echo "Pushing main to github.com/minhhoang2007/chess-simulator ..."

if git push -u origin main; then
  echo ""
  echo "Done. Code: https://github.com/minhhoang2007/chess-simulator"
  echo "Live site (updates in about a minute): https://minhhoang2007.github.io/chess-simulator/"
else
  echo ""
  echo "Push failed. If GitHub asks for a password, use a personal access token"
  echo "(GitHub > Settings > Developer settings > Personal access tokens),"
  echo "or switch to SSH:"
  echo "  git remote set-url origin git@github.com:minhhoang2007/chess-simulator.git"
fi
