# Auto-Deploy Setup

The VM polls GitHub every minute and automatically rebuilds when new commits are detected on `main`.

## Install

On the VM, after the initial setup:

```bash
cd ~/STLQuote
bash deploy/auto-pull.sh --install
```

That's it. A cron job will check for new commits every minute and redeploy if changes are found.

## How it works

1. Cron runs `deploy/auto-pull.sh` every minute
2. Script does `git fetch` and compares local HEAD to `origin/main`
3. If there are new commits: `git pull` + `docker compose up -d --build`
4. If no changes: exits silently

## Logs

```bash
journalctl -t stlquote-deploy -f
```

## Uninstall

```bash
bash ~/STLQuote/deploy/auto-pull.sh --uninstall
```
