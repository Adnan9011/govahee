#!/bin/sh
set -eu

# This VPS cannot reach npmjs / Chinese mirrors (timeout or NXDOMAIN).
# Probe Iranian registries first; skip any host that does not answer quickly.
npm config set fetch-retries 2
npm config set fetch-retry-mintimeout 5000
npm config set fetch-retry-maxtimeout 20000
npm config set fetch-timeout 25000
npm config set progress true
npm config set loglevel http

try_registry() {
  reg="$1"
  [ -n "$reg" ] || return 1
  echo "=== probe ${reg} ==="
  if ! wget -q -T 15 -t 1 -O /dev/null "${reg%/}/react"; then
    echo "=== skip (unreachable): ${reg} ==="
    return 1
  fi
  echo "=== npm install ${reg} ==="
  npm config set registry "$reg"
  timeout 300 npm install --no-audit --no-fund
}

fail=1
for reg in ${NPM_REGISTRY:-} \
  https://mirror.kargadan.ir/repository/npm-group/ \
  https://package-mirror.liara.ir/repository/npm/ \
  https://mirror-npm.runflare.com \
  https://mirror.abrha.net/repository/npm/; do
  if try_registry "$reg"; then
    fail=0
    break
  fi
done

[ "$fail" -eq 0 ]
