#!/usr/bin/env bash
# =====================================================================
# scripts/create_argolis_vm.sh - Deploy Argolis-Safe Gemma 2 (2B) VM
# =====================================================================
# Provisions an e2-standard-4 (4 vCPU, 16 GB RAM) in australia-southeast1-a
# with an automated startup script to install Ollama + google/gemma-2-2b-it.
# Configures dual auto-stop protection (daily 7 PM cron + idle watchdog)
# to guarantee zero overnight or idle billing on Argolis accounts.
# =====================================================================
set -eo pipefail

cd "$(dirname "$0")/.."

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-sovereignagent}"
ZONE="${ZONE:-australia-southeast1-a}"
REGION="${ZONE%-*}"
VM_NAME="${VM_NAME:-sovereign-gemma-2b-vm}"
MACHINE_TYPE="${MACHINE_TYPE:-e2-standard-4}"

echo "====================================================================="
echo " Deploying Argolis-Safe Local Gemma 2 (2B) VM"
echo " Project:      ${PROJECT_ID}"
echo " Zone:         ${ZONE}"
echo " VM Name:      ${VM_NAME}"
echo " Machine Type: ${MACHINE_TYPE} (4 vCPU, 16 GB RAM - No GPU Quota Needed)"
echo " Auto-Stop:    Daily 7:00 PM shutdown + 60-min Idle Watchdog"
echo "====================================================================="

echo "Verifying Sovereign VPC, Firewall, and Cloud NAT for airgapped private egress..."
gcloud compute networks create sovereign-vpc --subnet-mode=auto --project="${PROJECT_ID}" --quiet 2>/dev/null || true
gcloud compute firewall-rules create allow-sovereign-access --network=sovereign-vpc --allow=tcp:22,tcp:8001,icmp --source-ranges=35.235.240.0/20,10.0.0.0/8 --project="${PROJECT_ID}" --quiet 2>/dev/null || true
gcloud compute routers create sovereign-nat-router --network=sovereign-vpc --region="${REGION}" --project="${PROJECT_ID}" --quiet 2>/dev/null || true
gcloud compute routers nats create sovereign-nat-config --router=sovereign-nat-router --auto-allocate-nat-external-ips --nat-all-subnet-ip-ranges --region="${REGION}" --project="${PROJECT_ID}" --quiet 2>/dev/null || true

# Create the VM instance using gcloud compute with Shielded VM policies and no external IP (--no-address)
gcloud compute instances create "${VM_NAME}" \
    --project="${PROJECT_ID}" \
    --zone="${ZONE}" \
    --network=sovereign-vpc \
    --no-address \
    --machine-type="${MACHINE_TYPE}" \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --boot-disk-size=50GB \
    --boot-disk-type=pd-balanced \
    --shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --tags=sovereign-gemma-server,http-server \
    --metadata-from-file=startup-script=scripts/vm_startup.sh \
    --quiet

echo ""
echo "====================================================================="
echo " VM '${VM_NAME}' Created Successfully!"
echo ""
echo " 1. Monitor bootstrap progress:"
echo "    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} --command='sudo journalctl -u google-startup-scripts -f'"
echo ""
echo " 2. Test OpenAI-compatible endpoint on port 8001 via SSH tunnel:"
echo "    gcloud compute ssh ${VM_NAME} --zone=${ZONE} --project=${PROJECT_ID} -- -L 8001:localhost:8001"
echo ""
echo " 3. Auto-Stop Protections Active:"
echo "    - Automatic daily shutdown at 7:00 PM"
echo "    - 60-minute low-CPU idle watchdog"
echo "====================================================================="
