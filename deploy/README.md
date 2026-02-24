# Auto-Deploy Setup

Pushes to `main` trigger a GitHub Actions workflow that SSHes into the VM and redeploys the Docker stack.

## 1. Generate an SSH key on the VM

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -C "github-actions-deploy" -N ""
```

Add the public key to authorised keys:

```bash
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 2. Add GitHub secrets

Go to **Settings > Secrets and variables > Actions** in the repo and add these three secrets:

| Secret | Value |
|--------|-------|
| `DEPLOY_HOST` | IP address or hostname of the VM |
| `DEPLOY_USER` | SSH username on the VM |
| `DEPLOY_KEY` | Contents of `~/.ssh/github_deploy` (the **private** key) |

Copy the private key:

```bash
cat ~/.ssh/github_deploy
```

Paste the entire output — including the `-----BEGIN` and `-----END` lines — into the `DEPLOY_KEY` secret.

## 3. Verify

Push a commit to `main` and check the **Actions** tab. The workflow uses a concurrency group so multiple pushes won't trigger overlapping deploys.
