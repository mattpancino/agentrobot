#!/usr/bin/env bash
# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Deploy Sovereign PII Tokenizer Microservice to Cloud Run
set -euo pipefail

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-sovereignagent}"
REGION="${GOOGLE_CLOUD_LOCATION:-australia-southeast1}"
SERVICE_NAME="sovereign-pii-tokenizer"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

echo "============================================================"
echo "🚀 Deploying Sovereign PII Tokenizer Microservice to Cloud Run"
echo "   Project: ${PROJECT_ID}"
echo "   Region:  ${REGION}"
echo "   Service: ${SERVICE_NAME}"
echo "============================================================"

# Step 1: Submit Google Cloud Build
echo "📦 Building container image via Google Cloud Build..."
gcloud builds submit \
    --project="${PROJECT_ID}" \
    --config="src/services/pii_tokenizer/cloudbuild.yaml" \
    --substitutions=_IMAGE_NAME="${IMAGE_NAME}" .

# Step 2: Deploy to Cloud Run (Hardened In-Region Sovereign Configuration)
echo "☁️ Deploying to Cloud Run in ${REGION}..."
gcloud run deploy "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --image="${IMAGE_NAME}" \
    --region="${REGION}" \
    --platform="managed" \
    --ingress="internal" \
    --no-allow-unauthenticated \
    --service-account="sa-presidio@${PROJECT_ID}.iam.gserviceaccount.com" \
    --vpc-connector="projects/${PROJECT_ID}/locations/${REGION}/connectors/vpc-connector-syd" \
    --memory="4Gi" \
    --cpu="2" \
    --min-instances=1 \
    --max-instances=100 \
    --concurrency=80 \
    --set-env-vars="SOVEREIGN_ENABLE_PII_TOKENIZATION=true,SOVEREIGN_PII_ENGINE=presidio"

# Step 3: Grant IAM Invoke Permission to Agent Service Account (Zero Trust RBAC)
echo "🔒 Binding roles/run.invoker to sa-sovereign-agent..."
gcloud run services add-iam-policy-binding "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --member="serviceAccount:sa-sovereign-agent@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/run.invoker" \
    --quiet || true

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --format="value(status.url)")

echo "============================================================"
echo "✅ Sovereign PII Tokenizer successfully deployed!"
echo "   Service Endpoint: ${SERVICE_URL}"
echo "   Health Check:     ${SERVICE_URL}/health"
echo "   Access:           Internal VPC & Authorized Service Account Only"
echo "============================================================"

