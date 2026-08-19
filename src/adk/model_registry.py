# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Regional Model Catalog & Registry for Project Sovereign-Stream.

Provides a structured catalog of Google GenAI / Vertex AI / Airgap VPC models
grouped by geographic region and sovereignty classification. Allows applications
and users to inspect available models per region and select custom models for
each tier in the Sovereign Cascade.
"""

from typing import Dict, Any, List


REGIONAL_MODEL_CATALOG: List[Dict[str, Any]] = [
    {
        "regionId": "global",
        "name": "Global API (generativelanguage.googleapis.com)",
        "tier": "TIER_1_GLOBAL",
        "sovereigntyClassification": "Global Public",
        "description": "Global Frontier multi-region routing with lowest latency and highest throughput.",
        "models": [
            {
                "id": "gemini-3.7-flash",
                "name": "Gemini 3.7 Flash",
                "type": "Latest Frontier Flash",
                "recommended": True,
                "description": "Google's premier high-speed frontier model with advanced reasoning, coding, and ultra-low latency."
            },
            {
                "id": "gemini-1.5-pro-002",
                "name": "Gemini 1.5 Pro (002)",
                "type": "Frontier Pro",
                "recommended": False,
                "description": "High-reasoning frontier model for complex analysis and multi-step reasoning."
            },
            {
                "id": "gemini-1.5-flash-002",
                "name": "Gemini 1.5 Flash (002)",
                "type": "Fast Multimodal",
                "recommended": False,
                "description": "Low-latency multimodal model optimized for speed and high-frequency workloads."
            },
            {
                "id": "gemini-2.0-flash-001",
                "name": "Gemini 2.0 Flash (001)",
                "type": "Next-Gen Fast",
                "recommended": False,
                "description": "Next-generation fast model with enhanced coding, tool use, and latency."
            },
            {
                "id": "gemini-2.0-pro-exp-02-05",
                "name": "Gemini 2.0 Pro Experimental",
                "type": "Experimental Frontier",
                "recommended": False,
                "description": "Experimental reasoning frontier model with state-of-the-art capabilities."
            },
            {
                "id": "gemini-1.0-pro-002",
                "name": "Gemini 1.0 Pro (002)",
                "type": "Standard Pro",
                "recommended": False,
                "description": "Reliable baseline model for general enterprise conversational tasks."
            }
        ]
    },
    {
        "regionId": "australia-southeast1",
        "name": "Sydney, Australia (australia-southeast1)",
        "tier": "TIER_2_REGIONAL",
        "sovereigntyClassification": "Regional Data Residency",
        "description": "Strict Australian Data Residency (APRA CPS 234 compliant). Data processed in Sydney.",
        "models": [
            {
                "id": "gemini-2.5-flash",
                "name": "Gemini 2.5 Flash",
                "type": "Latest Regional Flash (Australia)",
                "recommended": True,
                "description": "Sydney-hosted premier Gemini Flash 2.5 model with ultra-low latency and guaranteed Australian data residency."
            },
            {
                "id": "gemini-1.5-flash-002",
                "name": "Gemini 1.5 Flash (002)",
                "type": "Fast Regional",
                "recommended": False,
                "description": "Optimized Sydney-hosted Flash model for rapid APRA-compliant responses."
            },
            {
                "id": "gemini-1.5-pro-002",
                "name": "Gemini 1.5 Pro (002)",
                "type": "Frontier Regional",
                "recommended": False,
                "description": "Sydney-hosted Pro model for deep audit, legal, and compliance reasoning."
            },
            {
                "id": "gemini-1.0-pro-002",
                "name": "Gemini 1.0 Pro (002)",
                "type": "Standard Regional",
                "recommended": False,
                "description": "Stable regional baseline model for standard FSI processing."
            },
            {
                "id": "gemini-1.5-flash-001",
                "name": "Gemini 1.5 Flash (001)",
                "type": "Legacy Fast",
                "recommended": False,
                "description": "Previous generation Flash release hosted in Sydney."
            }
        ]
    },
    {
        "regionId": "australia-southeast2",
        "name": "Melbourne, Australia (australia-southeast2)",
        "tier": "TIER_2_REGIONAL",
        "sovereigntyClassification": "Regional Data Residency (Secondary)",
        "description": "Secondary Australian Data Residency region for domestic disaster recovery.",
        "models": [
            {
                "id": "gemini-1.5-flash-002",
                "name": "Gemini 1.5 Flash (002)",
                "type": "Fast Regional",
                "recommended": True,
                "description": "Melbourne-hosted low-latency Flash model."
            },
            {
                "id": "gemini-1.5-pro-002",
                "name": "Gemini 1.5 Pro (002)",
                "type": "Frontier Regional",
                "recommended": False,
                "description": "Melbourne-hosted Pro model for high-assurance reasoning."
            }
        ]
    },
    {
        "regionId": "us-central1",
        "name": "Iowa, USA (us-central1)",
        "tier": "TIER_1_GLOBAL",
        "sovereigntyClassification": "US Regional Vertex AI",
        "description": "Primary Americas Vertex AI model hub with full Model Garden availability.",
        "models": [
            {
                "id": "gemini-1.5-pro-002",
                "name": "Gemini 1.5 Pro (002)",
                "type": "Frontier Pro",
                "recommended": True,
                "description": "US-central hosted Gemini 1.5 Pro."
            },
            {
                "id": "gemini-1.5-flash-002",
                "name": "Gemini 1.5 Flash (002)",
                "type": "Fast Multimodal",
                "recommended": False,
                "description": "US-central hosted Gemini 1.5 Flash."
            },
            {
                "id": "gemini-2.0-flash-001",
                "name": "Gemini 2.0 Flash (001)",
                "type": "Next-Gen Fast",
                "recommended": False,
                "description": "US-central hosted Gemini 2.0 Flash."
            },
            {
                "id": "claude-3-5-sonnet-v2@20241022",
                "name": "Claude 3.5 Sonnet v2 (Model Garden)",
                "type": "Partner Model",
                "recommended": False,
                "description": "Partner model available via Vertex AI Model Garden in us-central1."
            }
        ]
    },
    {
        "regionId": "europe-west1",
        "name": "Belgium (europe-west1)",
        "tier": "TIER_2_REGIONAL",
        "sovereigntyClassification": "EU Sovereign Data Boundary",
        "description": "European Union Data Residency boundary compliant with GDPR and EU AI Act.",
        "models": [
            {
                "id": "gemini-1.5-pro-002",
                "name": "Gemini 1.5 Pro (002)",
                "type": "Frontier Regional",
                "recommended": True,
                "description": "Belgium-hosted Gemini 1.5 Pro."
            },
            {
                "id": "gemini-1.5-flash-002",
                "name": "Gemini 1.5 Flash (002)",
                "type": "Fast Regional",
                "recommended": False,
                "description": "Belgium-hosted Gemini 1.5 Flash."
            }
        ]
    },
    {
        "regionId": "asia-southeast1",
        "name": "Singapore (asia-southeast1)",
        "tier": "TIER_2_REGIONAL",
        "sovereigntyClassification": "APAC Regional Data Residency",
        "description": "Singapore-hosted Vertex AI region for Southeast Asian compliance.",
        "models": [
            {
                "id": "gemini-1.5-pro-002",
                "name": "Gemini 1.5 Pro (002)",
                "type": "Frontier Regional",
                "recommended": True,
                "description": "Singapore-hosted Gemini 1.5 Pro."
            },
            {
                "id": "gemini-1.5-flash-002",
                "name": "Gemini 1.5 Flash (002)",
                "type": "Fast Regional",
                "recommended": False,
                "description": "Singapore-hosted Gemini 1.5 Flash."
            }
        ]
    },
    {
        "regionId": "jurisdictional-subregion-1",
        "name": "Jurisdictional Subregion (In-Country Cloud)",
        "tier": "TIER_2_REGIONAL",
        "sovereigntyClassification": "Jurisdictional Data Residency",
        "description": "Standardized regional cloud boundary ensuring data residency within host nation.",
        "models": [
            {
                "id": "gemini-2.5-flash",
                "name": "Gemini 2.5 Flash",
                "type": "Latest Regional Flash",
                "recommended": True,
                "description": "In-country premier Gemini Flash 2.5 model with ultra-low latency."
            },
            {
                "id": "gemini-1.5-pro-002",
                "name": "Gemini 1.5 Pro (002)",
                "type": "Frontier Regional",
                "recommended": False,
                "description": "In-country Pro model for high-assurance audit and compliance reasoning."
            }
        ]
    },
    {
        "regionId": "airgap-vpc-sovereign",
        "name": "Private Sovereign Enclave (Airgapped VPC / On-Prem)",
        "tier": "TIER_3_SOVEREIGN",
        "sovereigntyClassification": "Airgapped Sovereign VPC",
        "description": "Customer-managed private VPC or on-premise enclave running local vLLM/Ollama without internet egress.",
        "models": [
            {
                "id": "google/gemma-2-2b-it",
                "name": "Gemma 2 (2B IT)",
                "type": "Lightweight Sovereign",
                "recommended": True,
                "description": "Ultra-lightweight 2B model optimized for rapid airgapped CPU/VPC inference."
            },
            {
                "id": "google/gemma-2-9b-it",
                "name": "Gemma 2 (9B IT)",
                "type": "Open Weights Sovereign",
                "recommended": False,
                "description": "Optimal 9B parameter open-weights model for fast airgapped inference."
            },
            {
                "id": "google/gemma-2-27b-it",
                "name": "Gemma 2 (27B IT)",
                "type": "Large Open Weights",
                "recommended": False,
                "description": "High-capacity 27B model for complex offline reasoning inside isolated VPC."
            }
        ]
    }
]


DEFAULT_TIER_CONFIGS: Dict[str, Dict[str, str]] = {
    "TIER_1_GLOBAL": {
        "region": "global",
        "model": "gemini-3.7-flash",
    },
    "TIER_2_REGIONAL": {
        "region": "jurisdictional-subregion-1",
        "model": "gemini-2.5-flash",
    },
    "TIER_3_SOVEREIGN": {
        "region": "airgap-vpc-sovereign",
        "model": "google/gemma-2-2b-it",
    },
}


def get_regional_catalog() -> List[Dict[str, Any]]:
    """Returns the complete catalog of regions and their available models."""
    return REGIONAL_MODEL_CATALOG


def get_default_tier_settings() -> Dict[str, Dict[str, str]]:
    """Returns default region and model mapping for the 3 cascade tiers."""
    return DEFAULT_TIER_CONFIGS.copy()


def get_region_info(region_id: str) -> Dict[str, Any]:
    """Finds a specific region by ID in the catalog."""
    for reg in REGIONAL_MODEL_CATALOG:
        if reg["regionId"] == region_id:
            return reg
    return {
        "regionId": region_id,
        "name": f"Custom Region ({region_id})",
        "tier": "TIER_2_REGIONAL",
        "sovereigntyClassification": "Custom Region",
        "description": f"User-selected region {region_id}",
        "models": []
    }
