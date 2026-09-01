# Copyright 2026 Google LLC. All Rights Reserved.
"""
Sovereign Grounding Interceptor for Enterprise Connectors.

Intercepts, sanitizes, and pseudonymizes grounding context retrieved from
Google Drive, Trix (Google Sheets), and external tools within the sovereign
Australian boundary (australia-southeast1) prior to LLM context assembly.
"""

from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field
from src.adk.pii_tokenizer import SovereignPIITokenizer, PIITelemetry
from src.adk.connectors.gdrive_connector import GDriveConnector, GDriveDocument
from src.adk.connectors.trix_connector import TrixConnector, TrixSheet


class GroundingBundle(BaseModel):
    """Sanitized, zero-PII grounding context bundle ready for LLM prompt insertion."""
    sanitized_context_text: str
    sources_consulted: List[str]
    session_vault: Dict[str, Any]
    telemetry: PIITelemetry
    raw_entities_intercepted: int


class SovereignGroundingInterceptor:
    """
    Orchestrates secure in-region grounding across Google Drive and Trix Sheets.
    Guarantees that all retrieved enterprise data is sanitized before LLM dispatch.
    """

    def __init__(
        self,
        tokenizer: Optional[SovereignPIITokenizer] = None,
        gdrive_connector: Optional[GDriveConnector] = None,
        trix_connector: Optional[TrixConnector] = None,
    ):
        self.tokenizer = tokenizer or SovereignPIITokenizer()
        self.gdrive = gdrive_connector or GDriveConnector()
        self.trix = trix_connector or TrixConnector()

    def retrieve_and_sanitize(
        self,
        query: str,
        session_id: str = "default-session",
        vault: Optional[Dict[str, Any]] = None,
        search_drive: bool = True,
        search_trix: bool = True,
    ) -> GroundingBundle:
        """
        1. Resolves query parameters (de-tokenizing if query contains tokens from previous turns).
        2. Queries Google Drive and Trix Sheets in Australia.
        3. Runs Presidio / Sovereign tokenizer on all retrieved content.
        4. Updates the Session Vault with any new PII mappings.
        5. Returns a sanitized, zero-PII Grounding Bundle.
        """
        active_vault = dict(vault or {})

        # Step 1: If query contains existing session tokens, resolve them for local search
        local_query = self.tokenizer.detokenize(text=query, vault=active_vault)

        raw_chunks: List[str] = []
        sources: List[str] = []

        # Step 2: Search Google Drive docs
        if search_drive:
            drive_docs = self.gdrive.search_documents(local_query, limit=3)
            for doc in drive_docs:
                raw_chunks.append(f"--- Document: {doc.title} (Source: Google Drive) ---\n{doc.content}")
                sources.append(f"drive://{doc.doc_id}")

        # Step 3: Search Trix (Google Sheets) spreadsheets
        if search_trix:
            trix_rows = self.trix.search_sheet_rows(local_query, limit=5)
            if trix_rows:
                lines = ["--- Table: Fleet & Vehicle Registry (Source: Trix / Google Sheets) ---"]
                for r in trix_rows:
                    row_str = " | ".join(f"{k}: {v}" for k, v in r.items() if not k.startswith("_"))
                    lines.append(row_str)
                raw_chunks.append("\n".join(lines))
                sources.append("trix://fleet_registry")

        combined_raw_text = "\n\n".join(raw_chunks)
        if not combined_raw_text.strip():
            return GroundingBundle(
                sanitized_context_text="No relevant enterprise records found.",
                sources_consulted=[],
                session_vault=active_vault,
                telemetry=PIITelemetry(enabled=True, entitiesIntercepted=0),
                raw_entities_intercepted=0,
            )

        # Step 4: Sanitize all combined grounding text using Presidio
        sanitized_text, updated_vault, telemetry = self.tokenizer.tokenize(
            text=combined_raw_text,
            session_id=session_id,
            vault=active_vault,
        )

        return GroundingBundle(
            sanitized_context_text=sanitized_text,
            sources_consulted=sources,
            session_vault=updated_vault,
            telemetry=telemetry,
            raw_entities_intercepted=len(telemetry.entities),
        )
