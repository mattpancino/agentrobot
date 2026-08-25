# Sovereign Enterprise Data, Security & Agent Architecture Specification
## Project Sovereign-Stream: Universal 3-Tier Sovereign AI, Vertex AI Native Alignment & Airgapped DR Enclave

* **Document Version:** 4.2.0
* **Status:** Approved Enterprise Reference Architecture & Implementation Scorecard
* **Target Jurisdiction:** Australia (APRA CPS 234, Privacy Act 1988, Essential Eight, National Consumer Credit Protection Act)
* **Target Environment:** Google Cloud Vertex AI (`australia-southeast1`), Cloud KMS (Cloud HSM), Cloud Armor, Model Armor, Confidential GCE (AMD SEV-SNP)

---

## 1. Complete Enterprise Agent & Security Matrix: Implementation Scorecard

The table below provides a granular status for every architectural layer:
* **✅ IMPLEMENTED:** Fully working and integrated in the live demo and codebase.
* **⏳ TBA (To Be Added):** Target enterprise production hardening capabilities.

| # | Architectural Layer | Tier 1 (Global Frontier)<br>🔵 *Global Compute* | Tier 2 (Regional Sovereign)<br>🟡 *Native GCP Vertex AI (`australia-southeast1`)* | Tier 3 (Sovereign Enclave)<br>🟢 *Airgapped Pattern (By Design)* |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Brain & Reasoning Engine** | ✅ **Google Gemini 1.5 Pro / Flash** (Global Vertex AI / GenAI API). | ✅ **Regional Vertex AI Gemini 1.5 Pro / Flash** (`australia-southeast1`). | ✅ **Gemma 2 2B/9B** self-hosted on Compute Engine Enclave VM (`sovereign-gemma-2b-vm`). |
| **2** | **Short-Term Working Memory** | ✅ **Vertex AI Managed Session Contract** (AU-SYD schema with sub-ms Redis driver). | ✅ **Vertex AI Managed Session Contract** (AU-SYD schema with sub-ms Redis driver). | ✅ **Standby In-Enclave Memory Replica** (Local Valkey / RAM on enclave VM). |
| **3** | **Knowledge & Grounding (RAG)** | ✅ **Static In-Prompt Rulebook** (`skill_registry.py`).<br>⏳ **TBA:** Vertex AI Search Datastore. | ✅ **Static In-Prompt Rulebook** (`skill_registry.py`).<br>⏳ **TBA:** Vertex AI Search Datastore (`gs://...`). | ✅ **Baked In-Enclave Skills** (`/var/sovereign/skills/apra_underwriting/SKILL.md`). |
| **4** | **Action Engine (Tool Calling)** | ✅ **Vertex AI Function Calling Schemas** with deterministic local execution. | ✅ **Vertex AI Function Calling Schemas** with deterministic local execution. | ✅ **In-Enclave Python Execution Engine** (Dedicated HTTP listener on Port 8003). |
| **5** | **Privacy Shield (PII Engine)** | ✅ **Presidio + spaCy Salted Tokenizer** (Tokenized prompt sent to T1; Cleartext in AU-SYD).<br>⏳ **TBA:** Cloud DLP API. | ✅ **Presidio + spaCy Salted Tokenizer** (In-boundary token/detokenize).<br>⏳ **TBA:** Cloud DLP API. | ✅ **Offline Presidio / Regex Tokenizer** executed locally inside the enclave container. |
| **6** | **Structured Data Storage** | ✅ **Local CSV Dataset** (`customer_loans.csv`).<br>⏳ **TBA:** Regional GCS Bucket with CMEK. | ✅ **Local CSV Dataset** (`customer_loans.csv`).<br>⏳ **TBA:** Vertex AI Feature Store (Online Store). | ✅ **Enclave Local Disk Storage** (`/var/sovereign/data/customer_loans.csv` on VM). |
| **7** | **Model Armor & AI Safety** | ⏳ **TBA:** Google Cloud Model Armor (Prompt injection & jailbreak defense). | ⏳ **TBA:** Google Cloud Model Armor (AU-SYD filter profile). | ✅ **In-Enclave Regex Safety & Token Sanity Check** (`schema_adapter.py`).<br>⏳ **TBA:** Hardware Model Armor. |
| **8** | **Encryption in Transit** | ✅ **HTTPS / TLS 1.3** via Python `httpx` async client. | ✅ **HTTPS / TLS 1.3** to `australia-southeast1-aiplatform.googleapis.com`. | ✅ **Cloud IAP (Identity-Aware Proxy)** TCP Forwarding Tunnel over TLS 1.3 (Ports 8001/8003). |
| **9** | **Encryption at Rest** | ✅ **Default Google-Managed Encryption**.<br>⏳ **TBA:** Cloud KMS / Cloud HSM CMEK (AU-SYD). | ✅ **Default Google-Managed Encryption**.<br>⏳ **TBA:** Cloud KMS / Cloud HSM CMEK (AU-SYD). | ✅ **GCE Persistent Disk Encryption**.<br>⏳ **TBA:** Linux dm-crypt / LUKS NVMe + CMEK. |
| **10** | **Data in Use (Memory Security)** | ✅ **Standard Serverless RAM Isolation**. | ✅ **Standard Serverless RAM Isolation** in Sydney. | ✅ **Shielded VM** (Secure Boot, vTPM, Integrity Monitoring).<br>⏳ **TBA:** Confidential VM (AMD SEV-SNP). |
| **11** | **Network Perimeter & Egress** | ✅ **Standard Cloud IAM Egress**.<br>⏳ **TBA:** VPC Service Controls (VPC-SC). | ✅ **Standard Cloud IAM Egress**.<br>⏳ **TBA:** VPC Service Controls (VPC-SC). | ✅ **Isolated VPC with `--no-address` (No Public IP)** + IAP Firewall rule `35.235.240.0/20`. |
| **12** | **Identity & Access (IAM)** | ✅ **OAuth 2.0 Bearer Tokens** via `google.auth.default()`. | ✅ **OAuth 2.0 Bearer Tokens** via `google.auth.default()`. | ✅ **Cloud IAP IAM Permissions** (`roles/iap.tunnelResourceAccessor`).<br>⏳ **TBA:** BeyondCorp Context-Aware. |
| **13** | **Multi-Agent Orchestration** | ✅ **In-Process `SovereignResilientAgent.delegate()`** via `sessionId`.<br>⏳ **TBA:** Vertex A2A Gateway. | ✅ **In-Process `SovereignResilientAgent.delegate()`** via `sessionId`.<br>⏳ **TBA:** Vertex A2A Gateway. | ✅ **Local Inter-Process Python IPC / Delegator** on enclave host. |
| **14** | **Resilience & Self-Healing** | ✅ **Sovereign Cascade Router** with sub-100ms sticky tier demotion. | ✅ **Recovery Sentinel** with asynchronous out-of-band synthetic recovery probes. | ✅ **Two-Way Turn Log Replication & Reconnect Reconciliation** (`session_service.py`). |
| **15** | **Lineage & Audit Governance** | ✅ **Structured `ExecutionMetadata`** returned per turn.<br>⏳ **TBA:** Vertex AI Metadata Store (MLMD). | ✅ **Structured `ExecutionMetadata`** returned per turn.<br>⏳ **TBA:** Vertex AI Metadata Store (MLMD). | ✅ **Local Append-Only Event Stream** persisted to disk on turn completion. |
| **16** | **Supply Chain & Container Trust** | ✅ **Google Foundational Model Endpoints**. | ✅ **Google Foundational Model Endpoints** (AU-SYD). | ✅ **Debian 12 Shielded GCE Image** + automated startup bootstrap.<br>⏳ **TBA:** Binary Authorization. |
