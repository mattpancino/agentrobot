#!/usr/bin/env python3
# Copyright 2026 Google LLC. All Rights Reserved.
"""
Interactive Terminal Chat for Enterprise Sovereign Fleet & Claims Agent.

Allows developers and CEs to type queries interactively and view:
1. The cleartext user query in Australia
2. The in-region Presidio tokenization & token vault
3. The in-region Google Drive & Trix (Sheets) grounding bundle
4. The outbound zero-PII wire payload
5. The local tool execution / argument de-tokenization
6. The final de-tokenized response for the authorized user
"""

import asyncio
import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.adk.subagents import EnterpriseSovereignOrchestrator
from src.adk.session_service import InMemorySessionService


async def interactive_loop():
    print("=" * 75)
    print("🚗 SOVEREIGN ENTERPRISE FLEET & CLAIMS AGENT (INTERACTIVE CLI)")
    print("   Region:  australia-southeast1 (Sydney, Australia)")
    print("   Engine:  SovereignResilientAgent + Presidio NER + Drive/Trix Grounding")
    print("   Type 'exit' or 'quit' to stop.")
    print("=" * 75)
    print("\n💡 Example queries to try:")
    print("   1. Driver Sarah Connor in vehicle NSW-DL1234 (phone 0412 345 678) needs roadside assist.")
    print("   2. Find accident reports and police statements for vehicle NSW-DL1234.")
    print("   3. Lookup real-time telemetry for vehicle NSW-DL1234.")
    print("   4. Process accident claim #482 for driver Marcus Vance.")
    print("-" * 75)

    session_service = InMemorySessionService()
    orchestrator = EnterpriseSovereignOrchestrator(session_service=session_service)
    session_id = "interactive-session-001"

    while True:
        try:
            user_input = input("\n👤 Australian User > ").strip()
            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit", "q"):
                print("\n👋 Exiting Sovereign Agent CLI. Goodbye!")
                break

            target_agent = "claims" if "claim" in user_input.lower() or "accident" in user_input.lower() else "fleet"

            print(f"\n[1/4] 🛡️ In-Region Pre-processor Intercepting in Sydney...")
            result = await orchestrator.execute_orchestrated_turn(
                session_id=session_id,
                prompt=user_input,
                target_subagent=target_agent,
            )

            meta = result.get("executionMetadata", {})
            tokenized_prompt = meta.get("tokenizedPrompt", user_input)
            active_tier = meta.get("activeTier", "TIER_1_GLOBAL")

            print(f"[2/4] 🌐 Outbound Zero-PII Wire Payload (Sent to Model):")
            print(f"      \"{tokenized_prompt}\"")

            session_state = await session_service.get_session(session_id)
            vault = session_state.get("pii_vault", {})
            if vault:
                print(f"[3/4] 🔑 Active In-Memory Token Vault (Sydney RAM):")
                for tok, data in vault.items():
                    print(f"      • {tok}  <───►  \"{data.get('raw')}\" ({data.get('type')})")

            print(f"\n[4/4] 🎯 Final De-tokenized Response (Rendered to User via {active_tier}):")
            print("-" * 75)
            print(result.get("content", "").strip())
            print("-" * 75)

        except KeyboardInterrupt:
            print("\n\n👋 Interrupted. Exiting.")
            break
        except Exception as exc:
            print(f"\n❌ Error during execution: {exc}", file=sys.stderr)
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(interactive_loop())
