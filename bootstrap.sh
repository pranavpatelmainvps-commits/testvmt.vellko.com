#!/bin/bash
set -e

echo "=== BOOTSTRAP START ==="

# Detect package manager
if command -v apt-get >/dev/null 2>&1; then
  PKG_INSTALL="apt-get update -y && apt-get install -y"
elif command -v dnf >/dev/null 2>&1; then
  PKG_INSTALL="dnf install -y"
elif command -v yum >/dev/null 2>&1; then
  PKG_INSTALL="yum install -y"
else
  echo "Unsupported OS"
  exit 1
fi

# Install Docker if missing
if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

echo "=== BOOTSTRAP DONE ==="
