#!/bin/bash
set -eu

# Source the banner for login shells
chmod +x /etc/profile.d/*.sh 2>/dev/null || true

# Start ttyd web terminal with default settings
exec ttyd \
  --port 7681 \
  --writable \
  --credential attacker:pmp2026 \
  /bin/bash --login
