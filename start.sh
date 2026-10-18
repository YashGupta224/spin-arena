#!/usr/bin/env bash
# Launch the game on http://localhost:3000
cd "$(dirname "$0")"
echo "Starting Spin Arena at http://localhost:3000"
echo "Test mode: http://localhost:3000/?test&debug"
python3 -m http.server 3000
