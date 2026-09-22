#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

PROJECT_ID="$({ sed -n 's/^project_id = "\([^"]*\)"/\1/p' supabase/config.toml | head -n 1; })"

if [ -z "$PROJECT_ID" ]; then
  echo "Could not read project_id from supabase/config.toml." >&2
  exit 1
fi

container_ids() {
  docker ps -aq --filter "label=com.supabase.cli.project=$PROJECT_ID"
}

case "${1:-}" in
  start)
    containers="$(container_ids)"
    if [ -n "$containers" ]; then
      container_list=()
      while IFS= read -r container_id; do
        [ -n "$container_id" ] && container_list+=("$container_id")
      done <<< "$containers"
      docker start "${container_list[@]}" >/dev/null
      echo "Started existing Supabase containers for $PROJECT_ID."
    else
      echo "No existing Supabase containers found; creating the local stack."
      pnpm exec supabase start
    fi
    ;;
  stop)
    containers="$(container_ids)"
    if [ -z "$containers" ]; then
      echo "No Supabase containers found for $PROJECT_ID."
      exit 0
    fi

    container_list=()
    while IFS= read -r container_id; do
      [ -n "$container_id" ] && container_list+=("$container_id")
    done <<< "$containers"
    docker stop "${container_list[@]}" >/dev/null
    echo "Stopped Supabase containers for $PROJECT_ID without removing them."
    ;;
  delete)
    echo "Deleting the Supabase containers and local data volumes for $PROJECT_ID."
    pnpm exec supabase stop --project-id "$PROJECT_ID" --no-backup
    ;;
  *)
    echo "Usage: $0 {start|stop|delete}" >&2
    exit 2
    ;;
esac
