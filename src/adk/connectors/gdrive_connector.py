# Copyright 2026 Google LLC. All Rights Reserved.
"""
Google Drive Connector for Sovereign Agent Grounding.

Retrieves and parses documents (accident reports, policy docs, customer statements)
from Google Drive sources, simulating native GE Enterprise Connector data retrieval.
"""

import os
import glob
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GDriveDocument(BaseModel):
    """Document representation retrieved from Google Drive."""
    doc_id: str
    title: str
    content: str
    mime_type: str = "text/plain"
    author: Optional[str] = None
    created_time: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GDriveConnector:
    """Connector for querying and fetching documents from Google Drive."""

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "drive_docs"
        )
        self.documents: Dict[str, GDriveDocument] = {}
        self._load_local_corpus()

    def _load_local_corpus(self):
        """Loads mock or local Drive documents from data directory."""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir, exist_ok=True)
            return

        for filepath in glob.glob(os.path.join(self.data_dir, "*.txt")):
            doc_id = os.path.basename(filepath).replace(".txt", "")
            title = doc_id.replace("_", " ").title()
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                self.documents[doc_id] = GDriveDocument(
                    doc_id=doc_id,
                    title=title,
                    content=content,
                    created_time="2026-08-20T10:00:00Z",
                    metadata={"source": "google_drive", "path": filepath},
                )
            except Exception:
                pass

    def add_document(self, doc_id: str, title: str, content: str, **kwargs) -> GDriveDocument:
        """Adds or updates an in-memory Drive document."""
        doc = GDriveDocument(doc_id=doc_id, title=title, content=content, metadata=kwargs)
        self.documents[doc_id] = doc
        return doc

    def search_documents(self, query: str, limit: int = 5) -> List[GDriveDocument]:
        """
        Searches documents by keyword or token query.
        Returns matching raw documents prior to in-region sanitization.
        """
        query_terms = [t.lower() for t in query.split() if len(t) > 1]
        if not query_terms:
            return list(self.documents.values())[:limit]

        matches = []
        for doc in self.documents.values():
            text_lower = (doc.title + " " + doc.content).lower()
            score = sum(1 for term in query_terms if term in text_lower)
            if score > 0:
                matches.append((score, doc))

        matches.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in matches[:limit]]

    def get_document(self, doc_id: str) -> Optional[GDriveDocument]:
        """Fetches a specific document by its Drive ID."""
        return self.documents.get(doc_id)
