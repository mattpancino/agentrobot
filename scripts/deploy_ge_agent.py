#!/usr/bin/env python3
# Copyright 2026 Google LLC. All Rights Reserved.
"""
Deployment script for Sovereign Agent into Vertex AI Agent Engine for Gemini Enterprise.

Packages the SovereignAdkApp and deploys to Vertex AI in australia-southeast1
(or target testing region like us-east7) and prepares Agent Registry A2A metadata.
"""

import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import vertexai
from vertexai.preview import reasoning_engines
from src.adk.ge_adk_app import SovereignAdkApp
from src.adk.subagents import FleetOperationsAgent

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "sovereignagent")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "australia-southeast1")
STAGING_BUCKET = f"gs://{PROJECT_ID}-vertex-reasoning-staging"


def deploy_ge_agent():
    print("=" * 70)
    print(f"🚀 Deploying Sovereign Fleet Agent to Vertex AI Agent Engine for GE")
    print(f"   Project:        {PROJECT_ID}")
    print(f"   Region:         {LOCATION}")
    print(f"   Staging Bucket: {STAGING_BUCKET}")
    print("=" * 70)

    vertexai.init(project=PROJECT_ID, location=LOCATION, staging_bucket=STAGING_BUCKET)

    # Initialize agent and AdkApp streaming wrapper
    agent_instance = FleetOperationsAgent()
    app = SovereignAdkApp(
        agent=agent_instance,
        project_id=PROJECT_ID,
        location=LOCATION,
    )

    print("\n📦 Packaging dependencies and provisioning Reasoning Engine...")
    remote_engine = reasoning_engines.ReasoningEngine.create(
        reasoning_engine=app,
        requirements=[
            "google-cloud-aiplatform[agent_engines,adk]>=1.44.0",
            "presidio-analyzer>=2.2.354",
            "presidio-anonymizer>=2.2.354",
            "spacy>=3.7.4",
            "pydantic>=2.6.0",
            "requests>=2.31.0",
        ],
        display_name="Sovereign AU Fleet Agent",
        description="Sovereign AU Fleet Management Agent with in-region PII redaction and Drive/Trix Grounding for Gemini Enterprise.",
    )

    print("\n" + "=" * 70)
    print("✅ Successfully Deployed to Vertex AI Agent Engine!")
    print(f"   Resource Name: {remote_engine.resource_name}")
    print("=" * 70)

    print("\n📋 Next Steps to Complete Gemini Enterprise Binding:")
    print("1. Verify registration in Pantheon Agent Registry:")
    print(f"   gcloud alpha agent-registry agents list --project={PROJECT_ID} --location={LOCATION}")
    print("\n2. In RPC Studio, call UpdateEngine / CreateAgent to bind this Agent to GE.")
    print("3. Configure Mendel flags for Workspace / GE Web UI hydration.")


if __name__ == "__main__":
    deploy_ge_agent()
