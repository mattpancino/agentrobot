# Copyright 2026 Google LLC. All Rights Reserved.
# Project Sovereign-Stream: Resilient Multi-Tier AI Failover Demo
"""
Sovereign PII Tokenizer Microservice for Cloud Run / VPC Enclaves.

Provides high-throughput, low-latency (<5ms) PII tokenization and de-tokenization
APIs isolated inside private sovereign boundaries (AU-SYD).
"""

import time
from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from src.adk.pii_tokenizer import SovereignPIITokenizer

app = FastAPI(
    title="Sovereign PII Tokenizer Service",
    description="Dedicated microservice for PII tokenization and deterministic vault management.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tokenizer_engine = SovereignPIITokenizer()


class TokenizeRequest(BaseModel):
    text: str
    sessionId: str = "default-session"
    vault: Optional[Dict[str, Any]] = None


class TokenizeResponse(BaseModel):
    tokenizedText: str
    vault: Dict[str, Any]
    telemetry: Dict[str, Any]


class DetokenizeRequest(BaseModel):
    text: str
    vault: Dict[str, Any] = Field(default_factory=dict)


class DetokenizeResponse(BaseModel):
    detokenizedText: str


@app.get("/health")
async def health():
    """Ultra-fast liveness probe for Cloud Run and Kubernetes (<5ms)."""
    return {
        "status": "ok",
        "service": "sovereign-pii-tokenizer",
        "engine": "presidio-spacy-enclave",
        "timestamp": time.time(),
    }


@app.post("/v1/tokenize", response_model=TokenizeResponse)
async def tokenize_endpoint(req: TokenizeRequest):
    """Tokenizes incoming prompt and returns updated vault and telemetry."""
    try:
        tokenized_text, updated_vault, telemetry = tokenizer_engine.tokenize(
            text=req.text,
            session_id=req.sessionId,
            vault=req.vault,
        )
        return TokenizeResponse(
            tokenizedText=tokenized_text,
            vault=updated_vault,
            telemetry=telemetry.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/v1/detokenize", response_model=DetokenizeResponse)
async def detokenize_endpoint(req: DetokenizeRequest):
    """De-tokenizes model response using fuzzy mutation healer."""
    try:
        detokenized_text = tokenizer_engine.detokenize(
            text=req.text,
            vault=req.vault,
        )
        return DetokenizeResponse(detokenizedText=detokenized_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
