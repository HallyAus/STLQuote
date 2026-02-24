#!/bin/bash
# =============================================================================
# STLQuote — Server Setup Script
# Run this INSIDE the VM after it boots.
#
# Usage (one-liner from fresh VM):
#   curl -fsSL https://raw.githubusercontent.com/HallyAus/STLQuote/main/deploy/setup.sh | bash
#
# Or if already cloned:
#   bash deploy/setup.sh
# =============================================================================

set -euo pipefail

APP_DIR="${HOME}/STLQuote"
REPO="https://github.com/HallyAus/STLQuote.git"

echo "============================================"
echo "  STLQuote — Server Setup"
echo "============================================"
echo ""

# --- System updates ---
echo "[1/5] Updating system packages..."
sudo apt update -qq
sudo apt upgrade -y -qq
sudo apt install -y -qq ca-certificates curl git

# --- Install Docker ---
if command -v docker &> /dev/null; then
    echo "[2/5] Docker already installed, skipping."
else
    echo "[2/5] Installing Docker..."
    sudo install -m 0755 -d /etc/apt/keyrings

    # Detect distro (Ubuntu or Debian)
    . /etc/os-release
    DISTRO="${ID}"
    CODENAME="${VERSION_CODENAME}"

    sudo curl -fsSL "https://download.docker.com/linux/${DISTRO}/gpg" \
        -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
        https://download.docker.com/linux/${DISTRO} ${CODENAME} stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt update -qq
    sudo apt install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

    sudo usermod -aG docker "${USER}"
    echo "  Docker installed. Group membership will apply after re-login."
fi

# --- Clone repo ---
if [ -d "${APP_DIR}" ]; then
    echo "[3/5] Repo already exists, pulling latest..."
    cd "${APP_DIR}"
    git pull
else
    echo "[3/5] Cloning STLQuote..."
    git clone "${REPO}" "${APP_DIR}"
    cd "${APP_DIR}"
fi

# --- Configure environment ---
echo "[4/5] Configuring environment..."
if [ ! -f .env ]; then
    cp env.example .env

    # Generate a real NextAuth secret
    SECRET=$(openssl rand -base64 32)
    sed -i "s|generate-a-secret-with-openssl-rand-base64-32|${SECRET}|" .env

    echo "  .env created with generated NEXTAUTH_SECRET"
    echo ""
    echo "  ┌─────────────────────────────────────────────┐"
    echo "  │  Review .env before starting:               │"
    echo "  │    nano ${APP_DIR}/.env                     │"
    echo "  │                                             │"
    echo "  │  Key settings:                              │"
    echo "  │    NEXTAUTH_URL — your public URL           │"
    echo "  │    DATABASE_URL — default is fine for local  │"
    echo "  └─────────────────────────────────────────────┘"
    echo ""
else
    echo "  .env already exists, skipping."
fi

# --- Start services ---
echo "[5/5] Starting STLQuote..."

# Use sudo for docker if group hasn't taken effect yet
DOCKER_CMD="docker"
if ! docker info &> /dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
fi

${DOCKER_CMD} compose up -d --build

echo ""
echo "============================================"
echo "  STLQuote is running!"
echo "============================================"
echo ""
echo "  App:     http://$(hostname -I | awk '{print $1}'):3000"
echo "  Status:  ${DOCKER_CMD} compose ps"
echo "  Logs:    ${DOCKER_CMD} compose logs -f"
echo "  Stop:    ${DOCKER_CMD} compose down"
echo "  Update:  git pull && ${DOCKER_CMD} compose up -d --build"
echo ""
echo "  To expose publicly, add a Cloudflare Tunnel:"
echo "    cloudflared tunnel --url http://localhost:3000"
echo ""
