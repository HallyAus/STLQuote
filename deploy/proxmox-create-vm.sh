#!/bin/bash
# =============================================================================
# Proxmox VM Creator — STLQuote
# Run this ON your Proxmox host (not inside a VM)
#
# Usage:
#   bash proxmox-create-vm.sh
#   bash proxmox-create-vm.sh --vmid 200 --ip 10.0.0.50/24 --gateway 10.0.0.1
# =============================================================================

set -euo pipefail

# --- Defaults (override with flags) ---
VMID="${VMID:-200}"
VM_NAME="stlquote"
CORES=2
MEMORY=2048
DISK_SIZE="20G"
STORAGE="local-lvm"        # Change to your Proxmox storage (e.g., local-zfs, ceph, etc.)
BRIDGE="vmbr0"
IP="dhcp"                  # Set to "10.0.0.50/24" for static
GATEWAY=""                 # Set to "10.0.0.1" for static
DNS="1.1.1.1"
SSH_KEYS=""                # Path to public key file, e.g., ~/.ssh/id_rsa.pub
CLOUD_IMAGE_URL="https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img"
CLOUD_IMAGE_NAME="noble-server-cloudimg-amd64.img"
TEMPLATE_STORAGE="local"   # Where to store the cloud image

# --- Parse flags ---
while [[ $# -gt 0 ]]; do
    case $1 in
        --vmid)     VMID="$2"; shift 2 ;;
        --name)     VM_NAME="$2"; shift 2 ;;
        --cores)    CORES="$2"; shift 2 ;;
        --memory)   MEMORY="$2"; shift 2 ;;
        --disk)     DISK_SIZE="$2"; shift 2 ;;
        --storage)  STORAGE="$2"; shift 2 ;;
        --bridge)   BRIDGE="$2"; shift 2 ;;
        --ip)       IP="$2"; shift 2 ;;
        --gateway)  GATEWAY="$2"; shift 2 ;;
        --ssh-keys) SSH_KEYS="$2"; shift 2 ;;
        *)          echo "Unknown flag: $1"; exit 1 ;;
    esac
done

echo "============================================"
echo "  Creating VM: ${VM_NAME} (VMID: ${VMID})"
echo "============================================"
echo "  Cores:   ${CORES}"
echo "  Memory:  ${MEMORY} MB"
echo "  Disk:    ${DISK_SIZE}"
echo "  Storage: ${STORAGE}"
echo "  Network: ${BRIDGE} (${IP})"
echo "============================================"
read -p "Continue? (y/N) " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || exit 0

# --- Download cloud image if not present ---
IMG_PATH="/var/lib/vz/template/iso/${CLOUD_IMAGE_NAME}"
if [ ! -f "${IMG_PATH}" ]; then
    echo "[1/6] Downloading Ubuntu 24.04 cloud image..."
    wget -q --show-progress -O "${IMG_PATH}" "${CLOUD_IMAGE_URL}"
else
    echo "[1/6] Cloud image already exists, skipping download."
fi

# --- Create VM ---
echo "[2/6] Creating VM ${VMID}..."
qm create "${VMID}" \
    --name "${VM_NAME}" \
    --ostype l26 \
    --cores "${CORES}" \
    --memory "${MEMORY}" \
    --net0 "virtio,bridge=${BRIDGE}" \
    --agent enabled=1 \
    --onboot 1 \
    --scsihw virtio-scsi-single

# --- Import disk ---
echo "[3/6] Importing cloud image as disk..."
qm set "${VMID}" --scsi0 "${STORAGE}:0,import-from=${IMG_PATH},discard=on,iothread=1"
qm disk resize "${VMID}" scsi0 "${DISK_SIZE}"

# --- Configure boot and cloud-init ---
echo "[4/6] Configuring boot and cloud-init..."
qm set "${VMID}" --boot order=scsi0
qm set "${VMID}" --ide2 "${STORAGE}:cloudinit"
qm set "${VMID}" --serial0 socket --vga serial0

# --- Cloud-init settings ---
echo "[5/6] Setting cloud-init config..."
qm set "${VMID}" --ciuser "deploy"
qm set "${VMID}" --cipassword "$(openssl rand -base64 12)"
qm set "${VMID}" --nameserver "${DNS}"

if [ "${IP}" = "dhcp" ]; then
    qm set "${VMID}" --ipconfig0 "ip=dhcp"
else
    qm set "${VMID}" --ipconfig0 "ip=${IP},gw=${GATEWAY}"
fi

if [ -n "${SSH_KEYS}" ] && [ -f "${SSH_KEYS}" ]; then
    qm set "${VMID}" --sshkeys "${SSH_KEYS}"
    echo "  SSH key loaded from ${SSH_KEYS}"
fi

# --- Start VM ---
echo "[6/6] Starting VM..."
qm start "${VMID}"

echo ""
echo "============================================"
echo "  VM ${VM_NAME} (${VMID}) is starting!"
echo "============================================"
echo ""
echo "  User: deploy"
echo "  Password was randomly generated (use SSH keys instead)"
echo ""
if [ "${IP}" = "dhcp" ]; then
    echo "  IP: Waiting for DHCP... check with:"
    echo "    qm guest cmd ${VMID} network-get-interfaces"
else
    echo "  IP: ${IP%%/*}"
fi
echo ""
echo "  Once the VM is up, SSH in and run:"
echo "    curl -fsSL https://raw.githubusercontent.com/HallyAus/STLQuote/main/deploy/setup.sh | bash"
echo ""
echo "  Or manually:"
echo "    ssh deploy@<vm-ip>"
echo "    git clone https://github.com/HallyAus/STLQuote.git"
echo "    cd STLQuote && bash deploy/setup.sh"
echo ""
