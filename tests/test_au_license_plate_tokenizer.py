# Copyright 2026 Google LLC. All Rights Reserved.
"""
Unit tests for Australian Vehicle Registration & License Plate PII Tokenizer.
"""

import pytest
from src.adk.pii_tokenizer import SovereignPIITokenizer


@pytest.fixture
def tokenizer():
    return SovereignPIITokenizer(use_remote_service=False, session_id="test-au-plate-session")


def test_nsw_standard_plate_tokenization(tokenizer):
    prompt = "Check infringement history for NSW rego ABC-123"
    tokenized, vault, telemetry = tokenizer.tokenize(prompt)

    assert "ABC-123" not in tokenized
    assert "PII_AU_LICENSE_PLATE" in tokenized
    assert telemetry.entitiesIntercepted >= 1

    # Verify de-tokenization recovers original text
    detokenized = tokenizer.detokenize(tokenized, vault)
    assert detokenized == prompt


def test_vic_combo_plate_tokenization(tokenizer):
    prompt = "Vehicle with plate 1AB-2CD was seen near Southern Cross station"
    tokenized, vault, telemetry = tokenizer.tokenize(prompt)

    assert "1AB-2CD" not in tokenized
    assert "PII_AU_LICENSE_PLATE" in tokenized

    detokenized = tokenizer.detokenize(tokenized, vault)
    assert detokenized == prompt


def test_qld_numeric_alpha_plate_tokenization(tokenizer):
    prompt = "Please lookup toll charges on Queensland plate 123-AB4"
    tokenized, vault, telemetry = tokenizer.tokenize(prompt)

    assert "123-AB4" not in tokenized
    assert "PII_AU_LICENSE_PLATE" in tokenized

    detokenized = tokenizer.detokenize(tokenized, vault)
    assert detokenized == prompt


def test_wa_truck_plate_tokenization(tokenizer):
    prompt = "Fleet truck rego 1ABC-234 reported engine fault"
    tokenized, vault, telemetry = tokenizer.tokenize(prompt)

    assert "1ABC-234" not in tokenized
    assert "PII_AU_LICENSE_PLATE" in tokenized

    detokenized = tokenizer.detokenize(tokenized, vault)
    assert detokenized == prompt


def test_mixed_pii_and_plate_tokenization(tokenizer):
    prompt = "Contact driver Sarah Jenkins on 0412 345 678 regarding car rego WX-88-YZ"
    tokenized, vault, telemetry = tokenizer.tokenize(prompt)

    assert "Sarah Jenkins" not in tokenized
    assert "0412 345 678" not in tokenized
    assert "WX-88-YZ" not in tokenized

    assert "PII_PERSON" in tokenized
    assert "PII_PHONE_NUMBER" in tokenized
    assert "PII_AU_LICENSE_PLATE" in tokenized

    # Verify perfect round-trip
    detokenized = tokenizer.detokenize(tokenized, vault)
    assert detokenized == prompt


def test_deterministic_multi_occurrence_tokenization(tokenizer):
    prompt = "Vehicle ABC-123 had an accident. The driver of ABC-123 was unharmed."
    tokenized, vault, telemetry = tokenizer.tokenize(prompt)

    # Both occurrences of ABC-123 must map to the same token
    tokens = [k for k in vault.keys() if "AU_LICENSE_PLATE" in k]
    assert len(tokens) == 1
    target_token = f"[[{tokens[0]}]]"
    assert tokenized.count(target_token) == 2

    detokenized = tokenizer.detokenize(tokenized, vault)
    assert detokenized == prompt


def test_negative_control_product_code(tokenizer):
    prompt = "Order replacement component model ABC-12345 from warehouse"
    tokenized, vault, telemetry = tokenizer.tokenize(prompt)

    # ABC-12345 has 5 numbers after dash, not a valid 6-char AU plate
    assert "ABC-12345" in tokenized
    assert "PII_AU_LICENSE_PLATE" not in tokenized
