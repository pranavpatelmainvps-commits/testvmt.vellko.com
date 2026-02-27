#!/bin/bash
set -e

echo "=== DEPLOY STACK START ==="

cd /opt/pmta-dashboard

# Pull latest code if git present
if [ -d .git ]; then
  git pull || true
fi

# Ensure .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env missing"
  exit 1
fi

# Build + start
docker compose up -d --build

echo "Waiting for containers..."
sleep 15

echo "=== DEPLOY STACK DONE ==="
