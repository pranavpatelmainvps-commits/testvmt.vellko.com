#!/bin/bash

echo "=== VERIFY STACK ==="

fail=0

check() {
  if eval "$1"; then
    echo "[OK] $2"
  else
    echo "[FAIL] $2"
    fail=1
  fi
}

# Containers
check "docker ps | grep -q pmta-dashboard" "Dashboard container"
check "docker ps | grep -q mariadb" "MariaDB container"
check "docker ps | grep -q redis" "Redis container"
check "docker ps | grep -q dovecot" "Dovecot container"
check "docker ps | grep -q postfix" "Postfix container"

# Ports
check "ss -lntup | grep -q :5000" "Dashboard port 5000"
check "ss -lntup | grep -q :25" "SMTP port"
check "ss -lntup | grep -q :53" "DNS port"

# HTTP health
check "curl -sf http://localhost:5000 >/dev/null" "Dashboard HTTP"

# Redis ping
check "docker exec antigravity-redis redis-cli ping | grep -q PONG" "Redis ping"

echo "===================="

if [ $fail -eq 0 ]; then
  echo "✅ STACK HEALTHY"
else
  echo "❌ ISSUES DETECTED"
fi
