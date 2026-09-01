# Copyright 2026 Google LLC. All Rights Reserved.
"""
Google Sheets (Trix) Connector for Sovereign Agent Grounding.

Retrieves and queries tabular spreadsheet data (fleet vehicle registries,
rego tracking, maintenance logs, toll infractions) from Trix / Google Sheets.
"""

import os
import csv
import glob
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TrixRow(BaseModel):
    """Represents a single row in a Trix / Google Sheets spreadsheet."""
    row_index: int
    data: Dict[str, Any]


class TrixSheet(BaseModel):
    """Represents a spreadsheet table retrieved from Trix."""
    sheet_id: str
    title: str
    headers: List[str]
    rows: List[TrixRow] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def to_text_summary(self) -> str:
        """Converts spreadsheet rows into structured textual grounding context."""
        lines = [f"Spreadsheet: {self.title} (ID: {self.sheet_id})"]
        lines.append("Columns: " + ", ".join(self.headers))
        for row in self.rows:
            row_items = [f"{k}: {v}" for k, v in row.data.items()]
            lines.append(f"Row {row.row_index}: " + " | ".join(row_items))
        return "\n".join(lines)


class TrixConnector:
    """Connector for querying and fetching spreadsheet data from Trix / Google Sheets."""

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "trix_sheets"
        )
        self.sheets: Dict[str, TrixSheet] = {}
        self._load_local_sheets()

    def _load_local_sheets(self):
        """Loads mock or local CSV spreadsheets from data directory."""
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir, exist_ok=True)
            return

        for filepath in glob.glob(os.path.join(self.data_dir, "*.csv")):
            sheet_id = os.path.basename(filepath).replace(".csv", "")
            title = sheet_id.replace("_", " ").title()
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    headers = reader.fieldnames or []
                    rows = []
                    for idx, row_dict in enumerate(reader, start=1):
                        rows.append(TrixRow(row_index=idx, data=row_dict))
                self.sheets[sheet_id] = TrixSheet(
                    sheet_id=sheet_id,
                    title=title,
                    headers=list(headers),
                    rows=rows,
                    metadata={"source": "trix_google_sheets", "path": filepath},
                )
            except Exception:
                pass

    def add_sheet(self, sheet_id: str, title: str, headers: List[str], rows_data: List[Dict[str, Any]], **kwargs) -> TrixSheet:
        """Adds or updates an in-memory Trix spreadsheet."""
        rows = [TrixRow(row_index=i + 1, data=r) for i, r in enumerate(rows_data)]
        sheet = TrixSheet(sheet_id=sheet_id, title=title, headers=headers, rows=rows, metadata=kwargs)
        self.sheets[sheet_id] = sheet
        return sheet

    def search_sheet_rows(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Searches all rows across all sheets for matching keyword/entity terms.
        Returns matching raw records.
        """
        query_terms = [t.lower() for t in query.split() if len(t) > 1]
        matches = []

        for sheet in self.sheets.values():
            for row in sheet.rows:
                row_str = " ".join(str(v) for v in row.data.values()).lower()
                if not query_terms or any(term in row_str for term in query_terms):
                    match_item = dict(row.data)
                    match_item["_sheet_title"] = sheet.title
                    match_item["_row_index"] = row.row_index
                    matches.append(match_item)
                    if len(matches) >= limit:
                        return matches

        return matches

    def get_sheet(self, sheet_id: str) -> Optional[TrixSheet]:
        """Fetches a specific spreadsheet by its Trix Sheet ID."""
        return self.sheets.get(sheet_id)
