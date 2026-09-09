#!/bin/sh
set -eu

# npmjs.org often hangs (no HTTP error) on filtered VPS. Fail each registry
# quickly, then try the next. Shecan DNS helps reach npmjs from Iran.
printf "nameserver 178.22.122.100\nnameserver 185.51.200.2\nnameserver 8.8.8.8\n" > /etc/resolv.conf || true

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
  if ! wget -q -T 12 -t 1 -O /dev/null "${reg%/}/@emotion/react"; then
    echo "=== skip (unreachable): ${reg} ==="
    return 1
  fi
  echo "=== npm install ${reg} ==="
  npm config set registry "$reg"
  # BusyBox timeout: abort hangs that ignore npm fetch-timeout (DNS/TCP).
  timeout 180 npm install --no-audit --no-fund
}

fail=1
for reg in ${NPM_REGISTRY:-} \
  https://registry.npmjs.org \
  https://repo.huaweicloud.com/repository/npm/ \
  https://registry.npmmirror.com \
  https://mirrors.cloud.tencent.com/npm/; do
  if try_registry "$reg"; then
    fail=0
    break
  fi
done

[ "$fail" -eq 0 ]
