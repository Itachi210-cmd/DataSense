import io
import csv
import datetime
import math
import uuid
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
from ..models.dataset import ColumnMeta, DatasetSummary, PaginatedRows


def format_bytes(size: int) -> str:
    """Format bytes into human-readable string."""
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    elif size < 1024 * 1024 * 1024:
        return f"{size / (1024 * 1024):.1f} MB"
    else:
        return f"{size / (1024 * 1024 * 1024):.2f} GB"


def get_column_letter(idx: int) -> str:
    """Convert 0-indexed column integer to Excel-style column letter (A, B, ... Z, AA, AB...)."""
    result = ""
    idx += 1
    while idx > 0:
        idx, remainder = divmod(idx - 1, 26)
        result = chr(65 + remainder) + result
    return result


class DataEngine:
    """Core analytical and data processing engine built on Pandas."""

    def parse_file(self, file_bytes: bytes, filename: str) -> pd.DataFrame:
        """Parse raw file bytes (CSV, XLSX, XLS) into a Pandas DataFrame."""
        lower_name = filename.lower()
        if lower_name.endswith((".xlsx", ".xls")):
            try:
                df = pd.read_excel(io.BytesIO(file_bytes))
            except Exception as e:
                raise ValueError(f"Failed to parse Excel file: {str(e)}")
        else:
            # CSV parsing with delimiter & encoding fallback
            encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252", "iso-8859-1"]
            df = None
            last_error = None

            for enc in encodings:
                try:
                    # Detect delimiter from sample
                    sample_text = file_bytes[:16384].decode(enc, errors="ignore")
                    try:
                        sniffer = csv.Sniffer()
                        dialect = sniffer.sniff(sample_text)
                        delimiter = dialect.delimiter
                    except Exception:
                        delimiter = ","

                    df = pd.read_csv(
                        io.BytesIO(file_bytes),
                        encoding=enc,
                        sep=delimiter,
                        engine="python",
                        on_bad_lines="skip",
                    )
                    break
                except Exception as e:
                    last_error = e
                    continue

            if df is None:
                raise ValueError(
                    f"Failed to parse CSV file: {str(last_error) if last_error else 'Unknown format error'}"
                )

        if df.empty:
            raise ValueError("The uploaded dataset contains no data rows.")

        # Clean column names
        df.columns = [str(c).strip() if str(c).strip() != "" else f"Column_{i+1}" for i, c in enumerate(df.columns)]
        
        # Deduplicate column names if needed
        cols = []
        counts = {}
        for col in df.columns:
            if col in counts:
                counts[col] += 1
                cols.append(f"{col}_{counts[col]}")
            else:
                counts[col] = 0
                cols.append(col)
        df.columns = cols

        return df

    def infer_column_type(self, series: pd.Series) -> str:
        """Infer simplified data type: 'Number' | 'Date' | 'Boolean' | 'Text'."""
        non_null = series.dropna()
        if len(non_null) == 0:
            return "Text"

        # Check Boolean
        if pd.api.types.is_bool_dtype(series):
            return "Boolean"

        # Check if values are boolean-like strings
        if non_null.dtype == object or non_null.dtype == "string":
            str_vals = set(non_null.astype(str).str.strip().str.lower().unique())
            if str_vals.issubset({"true", "false", "yes", "no", "1", "0", "t", "f"}) and len(str_vals) <= 2:
                return "Boolean"

        # Check Numeric
        if pd.api.types.is_numeric_dtype(series):
            return "Number"

        # Check Datetime
        if pd.api.types.is_datetime64_any_dtype(series):
            return "Date"

        # Try parsing sample strings as numeric
        if non_null.dtype == object:
            sample = non_null.head(50).astype(str)
            # Check if all sample strings can be converted to float
            try:
                cleaned_sample = sample.str.replace("$", "", regex=False).str.replace(",", "", regex=False).str.strip()
                pd.to_numeric(cleaned_sample, errors="raise")
                return "Number"
            except Exception:
                pass

            # Try parsing sample strings as date
            try:
                # Require strings to look like dates (at least 6 chars and contains separator or year)
                if all(len(s) >= 6 for s in sample):
                    pd.to_datetime(sample, errors="raise", format="mixed")
                    return "Date"
            except Exception:
                pass

        return "Text"

    def generate_summary(
        self, df: pd.DataFrame, filename: str, file_size: int, dataset_id: str
    ) -> DatasetSummary:
        """Compute comprehensive summary metrics and column metadata."""
        row_count, col_count = df.shape
        missing_cells = int(df.isna().sum().sum())
        total_cells = row_count * col_count if (row_count * col_count) > 0 else 1
        missing_pct = round((missing_cells / total_cells) * 100, 2)

        try:
            duplicate_count = int(df.duplicated().sum())
        except Exception:
            duplicate_count = 0

        mem_bytes = int(df.memory_usage(deep=True).sum())
        mem_formatted = format_bytes(mem_bytes)
        file_size_formatted = format_bytes(file_size)

        file_type = "csv"
        if filename.lower().endswith(".xlsx"):
            file_type = "xlsx"
        elif filename.lower().endswith(".xls"):
            file_type = "xls"

        columns_meta: List[ColumnMeta] = []
        for idx, col_name in enumerate(df.columns):
            series = df[col_name]
            inferred_type = self.infer_column_type(series)
            null_count = int(series.isna().sum())
            non_null_count = row_count - null_count
            null_pct = round((null_count / row_count) * 100, 2) if row_count > 0 else 0.0

            try:
                unique_count = int(series.nunique(dropna=True))
            except Exception:
                unique_count = 0

            # Sample values (up to 5 non-null values)
            sample_vals = []
            non_null_series = series.dropna()
            for v in non_null_series.head(5):
                if pd.isna(v):
                    continue
                if isinstance(v, (np.integer, int)):
                    sample_vals.append(int(v))
                elif isinstance(v, (np.floating, float)):
                    sample_vals.append(None if math.isnan(v) or math.isinf(v) else round(float(v), 4))
                elif isinstance(v, (pd.Timestamp, datetime.date, datetime.datetime)):
                    sample_vals.append(str(v))
                else:
                    sample_vals.append(str(v)[:100])

            min_val = None
            max_val = None
            mean_val = None
            median_val = None

            if inferred_type == "Number":
                # Convert numeric series safely
                try:
                    num_series = pd.to_numeric(
                        series.astype(str).str.replace("$", "", regex=False).str.replace(",", "", regex=False).str.strip(),
                        errors="coerce"
                    ).dropna()
                    if not num_series.empty:
                        min_val = round(float(num_series.min()), 2)
                        max_val = round(float(num_series.max()), 2)
                        mean_val = round(float(num_series.mean()), 2)
                        median_val = round(float(num_series.median()), 2)
                except Exception:
                    pass

            columns_meta.append(
                ColumnMeta(
                    name=col_name,
                    index=idx,
                    letter=get_column_letter(idx),
                    data_type=inferred_type,
                    original_dtype=str(series.dtype),
                    non_null_count=non_null_count,
                    null_count=null_count,
                    null_percentage=null_pct,
                    unique_count=unique_count,
                    sample_values=sample_vals,
                    min_value=min_val,
                    max_value=max_val,
                    mean_value=mean_val,
                    median_value=median_val,
                )
            )

        return DatasetSummary(
            id=dataset_id,
            name=filename,
            file_type=file_type,
            file_size_bytes=file_size,
            file_size_formatted=file_size_formatted,
            row_count=row_count,
            column_count=col_count,
            missing_cells_count=missing_cells,
            missing_cells_percentage=missing_pct,
            duplicate_rows_count=duplicate_count,
            memory_usage_bytes=mem_bytes,
            memory_usage_formatted=mem_formatted,
            columns=columns_meta,
            created_at=datetime.datetime.utcnow().isoformat() + "Z",
        )

    def get_paginated_preview(
        self,
        df: pd.DataFrame,
        summary: DatasetSummary,
        page: int = 1,
        page_size: int = 25,
        search_query: str = "",
        sort_column: Optional[str] = None,
        sort_direction: str = "asc",
    ) -> PaginatedRows:
        """Get sanitized paginated row data formatted for frontend spreadsheet rendering."""
        working_df = df

        # Apply search if specified
        if search_query and search_query.strip():
            query = search_query.strip().lower()
            mask = False
            for col in working_df.columns:
                mask = mask | working_df[col].astype(str).str.lower().str.contains(query, na=False)
            working_df = working_df[mask]

        # Apply sorting if specified
        if sort_column and sort_column in working_df.columns:
            ascending = sort_direction.lower() != "desc"
            try:
                working_df = working_df.sort_values(by=sort_column, ascending=ascending)
            except Exception:
                pass

        total_rows = len(working_df)
        total_pages = max(1, math.ceil(total_rows / page_size)) if page_size > 0 else 1
        page = max(1, min(page, total_pages))
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        sliced = working_df.iloc[start_idx:end_idx]

        # Build column types mapping
        col_types = {c.name: c.data_type for c in summary.columns}

        # Convert rows to clean JSON dictionaries with row indices
        rows: List[Dict[str, Any]] = []
        for orig_idx, (_, row) in enumerate(sliced.iterrows(), start=start_idx + 1):
            row_dict: Dict[str, Any] = {"_row_index": orig_idx}
            for col in df.columns:
                val = row[col]
                if pd.isna(val) or val is None:
                    row_dict[col] = None
                elif isinstance(val, (np.floating, float)):
                    if math.isnan(val) or math.isinf(val):
                        row_dict[col] = None
                    else:
                        row_dict[col] = round(float(val), 4) if not val.is_integer() else int(val)
                elif isinstance(val, (np.integer, int)):
                    row_dict[col] = int(val)
                elif isinstance(val, (pd.Timestamp, datetime.date, datetime.datetime)):
                    row_dict[col] = str(val)
                else:
                    row_dict[col] = str(val)
            rows.append(row_dict)

        return PaginatedRows(
            dataset_id=summary.id,
            page=page,
            page_size=page_size,
            total_rows=total_rows,
            total_pages=total_pages,
            columns=list(df.columns),
            column_types=col_types,
            rows=rows,
        )

    def export_csv(self, df: pd.DataFrame) -> bytes:
        """Export DataFrame as CSV bytes."""
        buffer = io.StringIO()
        df.to_csv(buffer, index=False)
        return buffer.getvalue().encode("utf-8")


# Singleton instance
data_engine = DataEngine()
