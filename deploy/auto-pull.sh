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
DEPLOY_LOG_DIR="${APP_DIR}/deploy/logs"
DEPLOY_LOG="${DEPLOY_LOG_DIR}/deploys.jsonl"

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

# Grab commit list before building
COMMITS=""
if command -v jq &> /dev/null; then
    COMMITS=$(git log --oneline "${LOCAL}..${REMOTE}" | head -20 | jq -R -s 'split("\n") | map(select(. != ""))')
else
    COMMITS="[]"
fi

# Use sudo for docker if needed
DOCKER_CMD="docker"
if ! docker info &> /dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
fi

DEPLOY_START=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Capture docker output and exit code
DOCKER_OUTPUT=$(${DOCKER_CMD} compose up -d --build --quiet-pull 2>&1) || true
DOCKER_EXIT=${PIPESTATUS[0]:-$?}

DEPLOY_END=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Log to journalctl as before
echo "${DOCKER_OUTPUT}" | logger -t "${LOG_TAG}"

if [ "${DOCKER_EXIT}" -eq 0 ]; then
    logger -t "${LOG_TAG}" "Deploy complete. Now running ${REMOTE:0:7}."
    SUCCESS="true"
else
    logger -t "${LOG_TAG}" "Deploy FAILED (exit ${DOCKER_EXIT}). Check logs."
    SUCCESS="false"
fi

# --- Write structured deploy record ---
mkdir -p "${DEPLOY_LOG_DIR}"

# Rotate if over 500 entries
if [ -f "${DEPLOY_LOG}" ] && [ "$(wc -l < "${DEPLOY_LOG}")" -gt 500 ]; then
    tail -200 "${DEPLOY_LOG}" > "${DEPLOY_LOG}.tmp" && mv "${DEPLOY_LOG}.tmp" "${DEPLOY_LOG}"
fi

# Build JSON record
if command -v jq &> /dev/null; then
    ESCAPED_OUTPUT=$(echo "${DOCKER_OUTPUT}" | head -50 | jq -R -s '.')
    jq -n -c \
        --arg ts "${DEPLOY_END}" \
        --arg from "${LOCAL:0:7}" \
        --arg to "${REMOTE:0:7}" \
        --argjson success "${SUCCESS}" \
        --arg start "${DEPLOY_START}" \
        --arg end "${DEPLOY_END}" \
        --argjson commits "${COMMITS}" \
        --argjson output "${ESCAPED_OUTPUT}" \
        '{timestamp:$ts,fromHash:$from,toHash:$to,success:$success,startedAt:$start,endedAt:$end,commits:$commits,dockerOutput:$output}' \
        >> "${DEPLOY_LOG}"
else
    # Fallback without jq — minimal JSON
    echo "{\"timestamp\":\"${DEPLOY_END}\",\"fromHash\":\"${LOCAL:0:7}\",\"toHash\":\"${REMOTE:0:7}\",\"success\":${SUCCESS},\"startedAt\":\"${DEPLOY_START}\",\"endedAt\":\"${DEPLOY_END}\",\"commits\":[],\"dockerOutput\":\"\"}" >> "${DEPLOY_LOG}"
fi
