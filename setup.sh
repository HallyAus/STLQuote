#!/bin/bash
# ============================================
# Claude Code Project Setup
# ============================================
# Usage: ./setup.sh [project-name]
#
# Prerequisites:
#   - git
#   - Claude Code CLI (claude)
#   - Beads CLI (bd): curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash
# ============================================

set -e

PROJECT_NAME="${1:-my-project}"

echo "🚀 Setting up: $PROJECT_NAME"
echo "================================================"

# Check prerequisites
check_cmd() {
    if ! command -v "$1" &>/dev/null; then
        echo "⚠️  $1 not found. $2"
    else
        echo "✅ $1"
    fi
}

echo ""
echo "Prerequisites:"
check_cmd "git" "https://git-scm.com"
check_cmd "claude" "npm install -g @anthropic-ai/claude-code"
check_cmd "bd" "curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash"
echo ""

# Update project name in files
if [ -f "CLAUDE.md" ]; then
    sed -i "s/\[PROJECT_NAME\]/$PROJECT_NAME/g" CLAUDE.md
    echo "✅ Updated CLAUDE.md"
fi
if [ -f "strategy/project-prd.md" ]; then
    sed -i "s/\[PROJECT_NAME\]/$PROJECT_NAME/g" strategy/project-prd.md
    mv strategy/project-prd.md "strategy/${PROJECT_NAME}-prd.md" 2>/dev/null || true
    echo "✅ Renamed PRD to ${PROJECT_NAME}-prd.md"
fi

# Git init
if [ ! -d ".git" ]; then
    git init
    echo "✅ Initialised git"
else
    echo "✅ Git exists"
fi

# Beads init
if command -v bd &>/dev/null; then
    if [ ! -d ".beads" ]; then
        bd init --quiet
        echo "✅ Initialised Beads"
    else
        echo "✅ Beads exists"
    fi
    bd setup claude 2>/dev/null || true
    echo "✅ Beads hooks configured"
else
    echo "⚠️  Skipping Beads (bd not installed)"
fi

# Timestamp handoff
if [ -f "memory/HANDOFF.md" ]; then
    sed -i "s/\[YYYY-MM-DD HH:MM\]/$(date '+%Y-%m-%d %H:%M')/g" memory/HANDOFF.md
    sed -i "s/\[current branch\]/$(git branch --show-current 2>/dev/null || echo 'main')/g" memory/HANDOFF.md
fi

echo ""
echo "================================================"
echo "✅ Done!"
echo ""
echo "Next:"
echo "  1. Edit CLAUDE.md — fill in stack, commands, warnings"
echo "  2. Edit strategy/${PROJECT_NAME}-prd.md — define what you're building"
echo "  3. Edit .claude/skills/ — customise for your patterns"
echo "  4. Run 'claude' then /start-session"
echo ""
echo "Commands:"
echo "  /start-session    Load context, see priorities"
echo "  /end-session      Save state, wrap up"
echo "  /plan-feature     Break down feature into beads tasks"
echo "  /review           Review code changes"
echo "  /status           Quick status check"
echo "  /reflect          Capture session learnings"
echo ""
echo "Beads:"
echo "  bd list           All open issues"
echo "  bd ready          Next actionable task"
echo "  bd create \"...\"   Create issue"
echo "  bd close bd-XXX   Close issue"
echo "================================================"
