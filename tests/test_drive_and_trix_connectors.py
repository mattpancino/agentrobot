# Copyright 2026 Google LLC. All Rights Reserved.
"""
Integration tests for Google Drive & Trix (Google Sheets) Connectors and Sovereign Grounding Interceptor.
"""

import pytest
from src.adk.pii_tokenizer import SovereignPIITokenizer
from src.adk.connectors.gdrive_connector import GDriveConnector
from src.adk.connectors.trix_connector import TrixConnector
from src.adk.connectors.grounding_interceptor import SovereignGroundingInterceptor


@pytest.fixture
def tokenizer():
    return SovereignPIITokenizer(use_remote_service=False, session_id="test-grounding-session")


@pytest.fixture
def gdrive_connector():
    return GDriveConnector()


@pytest.fixture
def trix_connector():
    return TrixConnector()


@pytest.fixture
def grounding_interceptor(tokenizer, gdrive_connector, trix_connector):
    return SovereignGroundingInterceptor(
        tokenizer=tokenizer,
        gdrive_connector=gdrive_connector,
        trix_connector=trix_connector,
    )


def test_gdrive_connector_search(gdrive_connector):
    docs = gdrive_connector.search_documents("ABC-123", limit=2)
    assert len(docs) > 0
    assert any("ABC-123" in d.content for d in docs)


def test_trix_connector_search(trix_connector):
    rows = trix_connector.search_sheet_rows("1AB-2CD", limit=5)
    assert len(rows) > 0
    assert any(r.get("LicensePlate") == "1AB-2CD" for r in rows)


def test_sovereign_grounding_interception_drive(grounding_interceptor, tokenizer):
    # Query for an accident report involving plate ABC-123
    bundle = grounding_interceptor.retrieve_and_sanitize(
        query="accident report ABC-123",
        session_id="test-grounding-session",
        search_drive=True,
        search_trix=False,
    )

    assert len(bundle.sources_consulted) > 0
    # Verify raw sensitive strings are NOT present in the sanitized context text
    assert "ABC-123" not in bundle.sanitized_context_text
    assert "Sarah Jenkins" not in bundle.sanitized_context_text
    assert "0412 345 678" not in bundle.sanitized_context_text

    # Verify surrogate tokens exist
    assert "PII_AU_LICENSE_PLATE" in bundle.sanitized_context_text
    assert "PII_PERSON" in bundle.sanitized_context_text
    assert "PII_PHONE_NUMBER" in bundle.sanitized_context_text

    # Verify that de-tokenization recovers the full document cleanly
    detokenized = tokenizer.detokenize(bundle.sanitized_context_text, bundle.session_vault)
    assert "ABC-123" in detokenized
    assert "Sarah Jenkins" in detokenized


def test_sovereign_grounding_interception_trix_sheets(grounding_interceptor, tokenizer):
    # Query for fleet registry spreadsheet records
    bundle = grounding_interceptor.retrieve_and_sanitize(
        query="fleet registry FLT-002",
        session_id="test-grounding-session",
        search_drive=False,
        search_trix=True,
    )

    assert len(bundle.sources_consulted) > 0
    # Verify plate 1AB-2CD and driver David Miller are sanitized
    assert "1AB-2CD" not in bundle.sanitized_context_text
    assert "David Miller" not in bundle.sanitized_context_text

    assert "PII_AU_LICENSE_PLATE" in bundle.sanitized_context_text
    assert "PII_PERSON" in bundle.sanitized_context_text

    # Verify de-tokenization restores the spreadsheet row values
    detokenized = tokenizer.detokenize(bundle.sanitized_context_text, bundle.session_vault)
    assert "1AB-2CD" in detokenized
    assert "David Miller" in detokenized


def test_multi_source_consistent_tokenization(grounding_interceptor, tokenizer):
    # First turn: user mentions plate ABC-123
    user_prompt = "Summarize records for rego ABC-123"
    tokenized_prompt, vault, _ = tokenizer.tokenize(user_prompt, session_id="test-session-1")

    # Second turn: agent queries both Google Drive and Trix Sheets using the same vault
    bundle = grounding_interceptor.retrieve_and_sanitize(
        query="ABC-123",
        session_id="test-session-1",
        vault=vault,
        search_drive=True,
        search_trix=True,
    )

    # In both prompt and grounding documents, ABC-123 must share the same token
    plate_tokens = [k for k, v in bundle.session_vault.items() if v.get("raw") == "ABC-123"]
    assert len(plate_tokens) == 1
    shared_token = f"[[{plate_tokens[0]}]]"

    assert shared_token in tokenized_prompt
    assert shared_token in bundle.sanitized_context_text
