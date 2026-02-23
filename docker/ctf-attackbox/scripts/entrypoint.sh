#!/bin/bash
set -eu

# Source the banner for login shells
chmod +x /etc/profile.d/*.sh 2>/dev/null || true

# Disable Docker internal DNS service discovery for challenge realism.
if [ -w /etc/resolv.conf ]; then
  printf "nameserver 127.0.0.1\noptions ndots:0\n" > /etc/resolv.conf || true
fi

# Start ttyd web terminal (auth handled by portal JWT)
exec ttyd \
  --port 7681 \
  --writable \
  /bin/bash --login
