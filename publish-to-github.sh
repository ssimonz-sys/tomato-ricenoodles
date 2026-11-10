#!/bin/sh
# Run from the extracted tomato-ricenoodles directory on macOS.
set -eu
cd "$(dirname "$0")"
if ! command -v git >/dev/null 2>&1; then
  echo "Git is not installed. Install Xcode Command Line Tools first: xcode-select --install"
  exit 1
fi
repo="https://github.com/ssimonz-sys/tomato-ricenoodles.git"
if [ ! -d .git ]; then
  git init
  git branch -M main
fi
if git remote get-url origin >/dev/null 2>&1; then
  current=$(git remote get-url origin)
  if [ "$current" != "$repo" ] && [ "$current" != "git@github.com:ssimonz-sys/tomato-ricenoodles.git" ]; then
    echo "Unexpected origin: $current. Refusing to push to the wrong repository."
    exit 1
  fi
else
  git remote add origin "$repo"
fi
git add -A
if ! git diff --cached --quiet; then
  git commit -m "Publish Tomato Ricenoodles bilingual author website"
fi
git push -u origin main
printf '\nRepository: https://github.com/ssimonz-sys/tomato-ricenoodles\n'
