#!/usr/bin/env bash

set -Eeuo pipefail

exec opencode /workspace/atlas-console \
  --session ses_01J00000000000000000000000 \
  --print-logs \
  --log-level DEBUG \
  2>/tmp/opencode.log
