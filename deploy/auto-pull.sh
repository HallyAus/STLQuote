#!/bin/bash
# =============================================================================
# STLQuote — Auto-pull deploy
# Checks GitHub for new commits and rebuilds if changes detected.
# Designed to run via cron every minute.
#
# Install: bash deploy/auto-pull.sh --install
# Logs:    journalctl -t stlquote-deploy -f
# =============================================================================

set -euo pipefail

APP_DIR="${HOME}/STLQuote"
LOCKFILE="/tmp/stlquote-deploy.lock"
LOG_TAG="stlquote-deploy"

# --- Install mode: set up the cron job ---
if [[ "${1:-}" == "--install" ]]; then
    SCRIPT_PATH="$(cd "${APP_DIR}" && pwd)/deploy/auto-pull.sh"
    CRON_ENTRY="* * * * * ${SCRIPT_PATH}"

    if crontab -l 2>/dev/null | grep -qF "auto-pull.sh"; then
        echo "Cron job already installed."
    else
        (crontab -l 2>/dev/null; echo "${CRON_ENTRY}") | crontab -
        echo "Cron job installed — checking for updates every minute."
    fi
    echo "Logs: journalctl -t ${LOG_TAG} -f"
    exit 0
fi

# --- Uninstall mode ---
if [[ "${1:-}" == "--uninstall" ]]; then
    crontab -l 2>/dev/null | grep -vF "auto-pull.sh" | crontab -
    echo "Cron job removed."
    exit 0
fi

# --- Prevent concurrent runs ---
if [ -f "${LOCKFILE}" ]; then
    exit 0
fi
trap 'rm -f "${LOCKFILE}"' EXIT
touch "${LOCKFILE}"

cd "${APP_DIR}" || exit 1

# --- Check for remote changes ---
git fetch origin main --quiet 2>/dev/null

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "${LOCAL}" = "${REMOTE}" ]; then
    exit 0
fi

# --- New commits found — pull and rebuild ---
logger -t "${LOG_TAG}" "New commits detected (${LOCAL:0:7} → ${REMOTE:0:7}). Deploying..."

git pull --quiet

# Use sudo for docker if needed
DOCKER_CMD="docker"
if ! docker info &> /dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
fi

${DOCKER_CMD} compose up -d --build --quiet-pull 2>&1 | logger -t "${LOG_TAG}"

logger -t "${LOG_TAG}" "Deploy complete. Now running ${REMOTE:0:7}."
