#!/bin/bash
set -eu

# Source the banner for login shells
chmod +x /etc/profile.d/*.sh 2>/dev/null || true

# Keep Docker internal DNS (127.0.0.11) so containers on session networks
# are reachable by IP.  Students target machines by IP, not by name.
if [ -w /etc/resolv.conf ]; then
  printf "nameserver 127.0.0.11\noptions ndots:0\n" > /etc/resolv.conf || true
fi

# Start ttyd web terminal (auth handled by portal JWT)
exec ttyd \
  --port 7681 \
  --writable \
  /bin/bash --login
