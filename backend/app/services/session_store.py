import os
import json
import threading
import tempfile
from typing import Dict, Optional, Tuple, List
import pandas as pd
from ..models.dataset import DatasetSummary, ColumnMeta
from ..models.chart import ChartRecord, ChartConfig

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "datasets")
os.makedirs(STORAGE_DIR, exist_ok=True)


class SessionStore:
    """Thread-safe in-memory session store with atomic on-disk Parquet snapshot persistence."""

    def __init__(self):
        self._lock = threading.Lock()
        self._datasets: Dict[str, pd.DataFrame] = {}
        self._raw_datasets: Dict[str, pd.DataFrame] = {}
        self._summaries: Dict[str, DatasetSummary] = {}
        self._raw_filenames: Dict[str, str] = {}
        self._charts: Dict[str, Dict[str, ChartRecord]] = {}

    def _get_dataset_dir(self, dataset_id: str) -> str:
        d = os.path.join(STORAGE_DIR, dataset_id)
        os.makedirs(d, exist_ok=True)
        return d

    def _atomic_write_parquet(self, df: pd.DataFrame, target_path: str) -> None:
        """Atomically write DataFrame to Parquet using tempfile + os.replace."""
        target_dir = os.path.dirname(target_path)
        os.makedirs(target_dir, exist_ok=True)
        
        # Create temp file in same directory for atomic replace across filesystem
        with tempfile.NamedTemporaryFile(dir=target_dir, delete=False, suffix=".tmp") as tmp_file:
            tmp_path = tmp_file.name

        try:
            # Ensure all columns have string names for parquet compatibility
            parquet_df = df.copy()
            parquet_df.columns = [str(c) for c in parquet_df.columns]
            parquet_df.to_parquet(tmp_path, index=False, engine="pyarrow")
            # Atomic swap
            os.replace(tmp_path, target_path)
        except Exception:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
            raise

    def _atomic_write_json(self, data: dict, target_path: str) -> None:
        """Atomically write JSON data using tempfile + os.replace."""
        target_dir = os.path.dirname(target_path)
        os.makedirs(target_dir, exist_ok=True)
        
        with tempfile.NamedTemporaryFile(dir=target_dir, delete=False, suffix=".tmp", mode="w", encoding="utf-8") as tmp_file:
            tmp_path = tmp_file.name
            json.dump(data, tmp_file, indent=2)

        try:
            os.replace(tmp_path, target_path)
        except Exception:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
            raise

    def _load_from_disk_if_present(self, dataset_id: str) -> bool:
        """Attempt to restore dataset from disk snapshot if not present in memory."""
        dataset_dir = os.path.join(STORAGE_DIR, dataset_id)
        active_parquet = os.path.join(dataset_dir, "active.parquet")
        summary_json = os.path.join(dataset_dir, "summary.json")
        raw_parquet = os.path.join(dataset_dir, "raw.parquet")

        if os.path.exists(active_parquet) and os.path.exists(summary_json):
            try:
                df = pd.read_parquet(active_parquet, engine="pyarrow")
                with open(summary_json, "r", encoding="utf-8") as f:
                    summary_dict = json.load(f)
                summary = DatasetSummary(**summary_dict)

                self._datasets[dataset_id] = df
                self._summaries[dataset_id] = summary
                self._raw_filenames[dataset_id] = summary.name

                if os.path.exists(raw_parquet):
                    self._raw_datasets[dataset_id] = pd.read_parquet(raw_parquet, engine="pyarrow")

                return True
            except Exception as e:
                print(f"Warning: Failed to restore dataset {dataset_id} from disk: {e}")
                return False
        return False

    def set_dataset(
        self, dataset_id: str, df: pd.DataFrame, summary: DatasetSummary, filename: str
    ) -> None:
        with self._lock:
            self._datasets[dataset_id] = df.copy()
            self._raw_datasets[dataset_id] = df.copy()
            self._summaries[dataset_id] = summary
            self._raw_filenames[dataset_id] = filename

            # Persist to disk atomically
            dataset_dir = self._get_dataset_dir(dataset_id)
            self._atomic_write_parquet(df, os.path.join(dataset_dir, "raw.parquet"))
            self._atomic_write_parquet(df, os.path.join(dataset_dir, "active.parquet"))
            self._atomic_write_json(summary.model_dump(), os.path.join(dataset_dir, "summary.json"))

    def get_dataset(self, dataset_id: str) -> Optional[pd.DataFrame]:
        with self._lock:
            if dataset_id not in self._datasets:
                self._load_from_disk_if_present(dataset_id)
            df = self._datasets.get(dataset_id)
            return df.copy() if df is not None else None

    def get_raw_dataset(self, dataset_id: str) -> Optional[pd.DataFrame]:
        with self._lock:
            if dataset_id not in self._raw_datasets:
                self._load_from_disk_if_present(dataset_id)
            df = self._raw_datasets.get(dataset_id)
            return df.copy() if df is not None else None

    def get_summary(self, dataset_id: str) -> Optional[DatasetSummary]:
        with self._lock:
            if dataset_id not in self._summaries:
                self._load_from_disk_if_present(dataset_id)
            return self._summaries.get(dataset_id)

    def get_filename(self, dataset_id: str) -> Optional[str]:
        with self._lock:
            if dataset_id not in self._raw_filenames:
                self._load_from_disk_if_present(dataset_id)
            return self._raw_filenames.get(dataset_id)

    def update_dataset(
        self, dataset_id: str, df: pd.DataFrame, summary: DatasetSummary
    ) -> None:
        with self._lock:
            self._datasets[dataset_id] = df.copy()
            self._summaries[dataset_id] = summary

            # Atomically update persistent active snapshot on disk
            dataset_dir = self._get_dataset_dir(dataset_id)
            self._atomic_write_parquet(df, os.path.join(dataset_dir, "active.parquet"))
            self._atomic_write_json(summary.model_dump(), os.path.join(dataset_dir, "summary.json"))

    def reset_to_raw(self, dataset_id: str, summary: DatasetSummary) -> Optional[pd.DataFrame]:
        with self._lock:
            if dataset_id not in self._raw_datasets:
                self._load_from_disk_if_present(dataset_id)
            raw_df = self._raw_datasets.get(dataset_id)
            if raw_df is None:
                return None

            self._datasets[dataset_id] = raw_df.copy()
            self._summaries[dataset_id] = summary

            # Atomically revert active on-disk snapshot
            dataset_dir = self._get_dataset_dir(dataset_id)
            self._atomic_write_parquet(raw_df, os.path.join(dataset_dir, "active.parquet"))
            self._atomic_write_json(summary.model_dump(), os.path.join(dataset_dir, "summary.json"))
            return raw_df.copy()

    def delete_dataset(self, dataset_id: str) -> bool:
        with self._lock:
            existed = dataset_id in self._datasets
            self._datasets.pop(dataset_id, None)
            self._raw_datasets.pop(dataset_id, None)
            self._summaries.pop(dataset_id, None)
            self._raw_filenames.pop(dataset_id, None)

            # Clean disk
            dataset_dir = os.path.join(STORAGE_DIR, dataset_id)
            if os.path.exists(dataset_dir):
                import shutil
                shutil.rmtree(dataset_dir, ignore_errors=True)
            return existed

    def _load_charts_from_disk_if_present(self, dataset_id: str) -> None:
        """Load saved charts from disk snapshot if not present in memory."""
        charts_path = os.path.join(self._get_dataset_dir(dataset_id), "charts.json")
        if os.path.exists(charts_path):
            try:
                with open(charts_path, "r", encoding="utf-8") as f:
                    charts_data = json.load(f)
                charts_map = {}
                for c_dict in charts_data:
                    record = ChartRecord(**c_dict)
                    charts_map[record.id] = record
                self._charts[dataset_id] = charts_map
            except Exception as e:
                print(f"Warning: Failed to restore charts for {dataset_id} from disk: {e}")

    def save_chart(self, dataset_id: str, chart: ChartRecord) -> ChartRecord:
        """Save chart record in memory and atomically persist to disk."""
        with self._lock:
            if dataset_id not in self._charts:
                self._load_charts_from_disk_if_present(dataset_id)
            if dataset_id not in self._charts:
                self._charts[dataset_id] = {}

            self._charts[dataset_id][chart.id] = chart

            # Atomically persist charts list
            charts_list = [c.model_dump() for c in self._charts[dataset_id].values()]
            charts_path = os.path.join(self._get_dataset_dir(dataset_id), "charts.json")
            self._atomic_write_json(charts_list, charts_path)
            return chart

    def get_charts(self, dataset_id: str) -> List[ChartRecord]:
        """Get all saved charts for a dataset."""
        with self._lock:
            if dataset_id not in self._charts:
                self._load_charts_from_disk_if_present(dataset_id)
            charts_map = self._charts.get(dataset_id, {})
            return list(charts_map.values())

    def get_chart(self, dataset_id: str, chart_id: str) -> Optional[ChartRecord]:
        """Get a specific chart by ID."""
        with self._lock:
            if dataset_id not in self._charts:
                self._load_charts_from_disk_if_present(dataset_id)
            charts_map = self._charts.get(dataset_id, {})
            return charts_map.get(chart_id)

    def delete_chart(self, dataset_id: str, chart_id: str) -> bool:
        """Delete a chart record and update disk snapshot."""
        with self._lock:
            if dataset_id not in self._charts:
                self._load_charts_from_disk_if_present(dataset_id)
            charts_map = self._charts.get(dataset_id, {})
            if chart_id not in charts_map:
                return False

            del charts_map[chart_id]
            charts_list = [c.model_dump() for c in charts_map.values()]
            charts_path = os.path.join(self._get_dataset_dir(dataset_id), "charts.json")
            self._atomic_write_json(charts_list, charts_path)
            return True

    def clear_in_memory_cache(self) -> None:
        """Helper to clear in-memory RAM cache to test server restart recovery from disk."""
        with self._lock:
            self._datasets.clear()
            self._raw_datasets.clear()
            self._summaries.clear()
            self._raw_filenames.clear()
            self._charts.clear()


# Singleton instance
session_store = SessionStore()
