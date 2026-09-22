#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

pnpm exec supabase db reset --local

echo
echo "Local database reset with 20 users, 4 active games, and 2 completed games."
echo "Sign in as hello@simonbeirouti.com for the seeded administrator view."
