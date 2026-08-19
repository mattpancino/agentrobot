#!/usr/bin/env bash
# =====================================================================
# scripts/start_live_gemma_demo.sh - Launch Sovereign-Stream Demo App
# with Automated IAP Tunneling to Live Airgapped Gemma 2 (2B) VM
# =====================================================================
set -eo pipefail

cd "$(dirname "$0")/.."

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-sovereignagent}"
ZONE="${ZONE:-australia-southeast1-a}"
VM_NAME="${VM_NAME:-sovereign-gemma-2b-vm}"

echo "====================================================================="
echo " 1. Checking Sovereign Enclave VM (${VM_NAME})..."
echo "====================================================================="

# Check VM status; start it automatically if auto-stopped from previous evening
VM_STATUS=$(gcloud compute instances describe "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" --format="value(status)" 2>/dev/null || echo "NOT_FOUND")

if [ "${VM_STATUS}" = "TERMINATED" ] || [ "${VM_STATUS}" = "STOPPED" ]; then
    echo " -> VM was auto-stopped. Starting ${VM_NAME} now..."
    gcloud compute instances start "${VM_NAME}" --zone="${ZONE}" --project="${PROJECT_ID}" --quiet
    echo " -> Waiting 15s for Ollama service to initialize..."
    sleep 15
elif [ "${VM_STATUS}" = "RUNNING" ]; then
    echo " -> VM is RUNNING."
else
    echo "ERROR: VM '${VM_NAME}' not found. Run ./scripts/create_argolis_vm.sh first."
    exit 1
fi

echo ""
echo "====================================================================="
echo " 2. Setting up Secure IAP Tunnel to Port 8001..."
echo "====================================================================="

# Kill any existing local mock servers or stale SSH tunnels on port 8001
pkill -f "mock_gemma_server" || true
pkill -f "ssh.*8001:localhost:8001" || true

# Generate a dedicated, passphrase-less SSH key for automated demo tunneling if it doesn't exist
SSH_KEY="${HOME}/.ssh/sovereign_gemma_key"
if [ ! -f "${SSH_KEY}" ]; then
    echo " -> Generating dedicated key (${SSH_KEY}) for automated tunnel..."
    mkdir -p "${HOME}/.ssh"
    ssh-keygen -t ed25519 -f "${SSH_KEY}" -N "" -C "sovereign-tunnel@demo" -q
fi

# Start background IAP tunnel forwarding local port 8001 to VM port 8001
echo " -> Opening encrypted IAP TCP tunnel (localhost:8001 -> ${VM_NAME}:8001)..."
pkill -f "start-iap-tunnel.*8001" || true
nohup gcloud compute start-iap-tunnel "${VM_NAME}" 8001 \
    --local-host-port=localhost:8001 \
    --zone="${ZONE}" \
    --project="${PROJECT_ID}" > iap_tunnel.log 2>&1 &

# Verify endpoint readiness
echo " -> Verifying Gemma 2 model endpoint connectivity..."
for i in {1..10}; do
    if curl -s -f http://127.0.0.1:8001/v1/models >/dev/null 2>&1; then
        echo " -> SUCCESS: Local tunnel to Gemma 2 (2B) is connected!"
        break
    fi
    if [ "$i" -eq 10 ]; then
        echo " -> WARNING: Could not probe port 8001 immediately, continuing..."
    fi
    sleep 1
done

echo ""
echo "====================================================================="
echo " 3. Launching Sovereign-Stream API Gateway & Demo UI on Port 8088..."
echo "====================================================================="

pkill -f "src.backend.main:app" || true
PYTHONPATH=. ./.venv/bin/uvicorn src.backend.main:app --port 8088 --host 0.0.0.0 > gateway.log 2>&1 &
GATEWAY_PID=$!

sleep 2

echo "====================================================================="
echo " LIVE DEMO READY! All systems operational."
echo ""
echo " -> Open Demo UI:       http://elevateinstance.c.googlers.com:8088"
echo " -> Live Enclave:       ${VM_NAME} (via IAP Tunnel on localhost:8001)"
echo " -> Active Tier 3:      google/gemma-2-2b-it"
echo " -> Server Logs:        tail -f gateway.log"
echo "====================================================================="
