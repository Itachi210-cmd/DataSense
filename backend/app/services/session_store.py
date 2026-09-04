import threading
from typing import Dict, Optional, Tuple
import pandas as pd
from ..models.dataset import DatasetSummary


class SessionStore:
    """Thread-safe in-memory session store for working DataFrames and dataset metadata."""

    def __init__(self):
        self._lock = threading.Lock()
        self._datasets: Dict[str, pd.DataFrame] = {}
        self._summaries: Dict[str, DatasetSummary] = {}
        self._raw_filenames: Dict[str, str] = {}

    def set_dataset(
        self, dataset_id: str, df: pd.DataFrame, summary: DatasetSummary, filename: str
    ) -> None:
        with self._lock:
            self._datasets[dataset_id] = df.copy()
            self._summaries[dataset_id] = summary
            self._raw_filenames[dataset_id] = filename

    def get_dataset(self, dataset_id: str) -> Optional[pd.DataFrame]:
        with self._lock:
            df = self._datasets.get(dataset_id)
            return df.copy() if df is not None else None

    def get_summary(self, dataset_id: str) -> Optional[DatasetSummary]:
        with self._lock:
            return self._summaries.get(dataset_id)

    def get_filename(self, dataset_id: str) -> Optional[str]:
        with self._lock:
            return self._raw_filenames.get(dataset_id)

    def update_dataset(
        self, dataset_id: str, df: pd.DataFrame, summary: DatasetSummary
    ) -> None:
        with self._lock:
            self._datasets[dataset_id] = df.copy()
            self._summaries[dataset_id] = summary

    def delete_dataset(self, dataset_id: str) -> bool:
        with self._lock:
            existed = dataset_id in self._datasets
            self._datasets.pop(dataset_id, None)
            self._summaries.pop(dataset_id, None)
            self._raw_filenames.pop(dataset_id, None)
            return existed

    def list_dataset_ids(self):
        with self._lock:
            return list(self._datasets.keys())


# Singleton instance
session_store = SessionStore()
