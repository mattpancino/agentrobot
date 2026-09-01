#!/usr/bin/env python3
# Copyright 2026 Google LLC. All Rights Reserved.
"""
Deployment script for Vertex AI Reasoning Engine in Argolis Project.

Deploys the Sovereign Fleet Reasoning Engine to Vertex AI in australia-southeast1,
and configures IAM role bindings (RBAC) to control which users/groups can invoke it.
"""

import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import vertexai
from vertexai.preview import reasoning_engines
from src.adk.vertex_reasoning_engine import SovereignFleetReasoningEngine

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "sovereignagent")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "australia-southeast1")
STAGING_BUCKET = f"gs://{PROJECT_ID}-vertex-reasoning-staging"


def deploy_agent():
    print("=" * 65)
    print(f"🚀 Deploying Sovereign Agent to Vertex AI Reasoning Engine")
    print(f"   Argolis Project: {PROJECT_ID}")
    print(f"   Region:          {LOCATION}")
    print(f"   Staging Bucket:  {STAGING_BUCKET}")
    print("=" * 65)

    vertexai.init(project=PROJECT_ID, location=LOCATION, staging_bucket=STAGING_BUCKET)

    # Instantiate local reasoning engine template
    local_engine = SovereignFleetReasoningEngine(
        project_id=PROJECT_ID,
        location=LOCATION,
        model_name="gemini-1.5-pro",
    )

    print("📦 Packaging container dependencies and creating Vertex AI Reasoning Engine...")
    remote_engine = reasoning_engines.ReasoningEngine.create(
        local_engine,
        requirements=[
            "google-cloud-aiplatform>=1.44.0",
            "presidio-analyzer>=2.2.354",
            "presidio-anonymizer>=2.2.354",
            "spacy>=3.7.4",
            "pydantic>=2.6.0",
        ],
        display_name="sovereign-fleet-pii-agent",
        description="Sovereign AU Fleet Management Agent with in-region PII redaction and Drive/Trix grounding",
    )

    print("\n" + "=" * 65)
    print(f"✅ Vertex AI Reasoning Engine successfully deployed!")
    print(f"   Resource Name: {remote_engine.resource_name}")
    print("=" * 65)

    print("\n🔒 Access Control & RBAC Configuration Guide:")
    print("To restrict this agent so only authorized roles can invoke it:")
    print(f"""
# 1. Grant 'Vertex AI User' only to specific team groups (e.g., Tier 2 Claims Investigators):
gcloud ai reasoning-engines add-iam-policy-binding {remote_engine.resource_name.split('/')[-1]} \\
    --project={PROJECT_ID} \\
    --location={LOCATION} \\
    --member="group:claims-investigators@argolis.com" \\
    --role="roles/aiplatform.user"

# 2. In Gemini Enterprise / Agent Builder Console:
# Under 'Agent Sharing', select 'Specific Groups' and add 'claims-investigators@argolis.com'.
# All unauthorized employees in the org will be blocked from viewing or executing this agent.
""")

if __name__ == "__main__":
    deploy_agent()
