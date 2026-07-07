#!/bin/bash
# The Daily AI — morning job: fetch news, re-tune to your work, email the digest.
# Invoked by the launchd agent com.thedailyai.digest (see scripts/daily.sh setup in README).
export PATH="/Users/ishtiaqhossain/.nvm/versions/node/v24.14.0/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
cd /Users/ishtiaqhossain/ai-newspaper || exit 1
mkdir -p data
LOG="data/daily.log"
{
  echo "======== The Daily AI run: $(date) ========"
  npm run digest
  npm run tune
  npm run email
  echo "======== done: $(date) ========"
  echo
} >> "$LOG" 2>&1
