#!/bin/bash
set -eu

# Source the banner for login shells
chmod +x /etc/profile.d/*.sh 2>/dev/null || true

# Start ttyd web terminal (no credential — auth handled by portal JWT)
exec ttyd \
  --port 7681 \
  --writable \
  /bin/bash --login
