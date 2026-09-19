import io
import csv
import datetime
import math
import uuid
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
from ..models.dataset import ColumnMeta, DatasetSummary, PaginatedRows
from ..models.chart import ChartConfig, ChartDataPayload


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
        # Check native dtypes first (retains proper type even if column contains NaNs)
        if pd.api.types.is_bool_dtype(series):
            return "Boolean"

        if pd.api.types.is_numeric_dtype(series):
            return "Number"

        if pd.api.types.is_datetime64_any_dtype(series):
            return "Date"

        non_null = series.dropna()
        if len(non_null) == 0:
            return "Text"

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

    def apply_filter(self, df: pd.DataFrame, conditions: List[Dict[str, Any]], match_type: str = "all") -> Tuple[pd.DataFrame, int]:
        """Filter rows based on column conditions."""
        if not conditions:
            return df.copy(), 0

        masks = []
        for cond in conditions:
            col = cond.get("column")
            op = cond.get("operator", "equals").lower()
            val = cond.get("value")
            val2 = cond.get("value2")

            if col not in df.columns:
                continue

            series = df[col]
            is_num = pd.api.types.is_numeric_dtype(series)

            if op == "is_null":
                mask = series.isna()
            elif op == "is_not_null":
                mask = series.notna()
            elif op == "equals":
                if is_num:
                    try:
                        mask = series == float(val)
                    except Exception:
                        mask = series.astype(str).str.strip().str.lower() == str(val).strip().lower()
                else:
                    mask = series.astype(str).str.strip().str.lower() == str(val).strip().lower()
            elif op == "not_equals":
                if is_num:
                    try:
                        mask = series != float(val)
                    except Exception:
                        mask = series.astype(str).str.strip().str.lower() != str(val).strip().lower()
                else:
                    mask = series.astype(str).str.strip().str.lower() != str(val).strip().lower()
            elif op in ("contains", "contain"):
                mask = series.astype(str).str.contains(str(val), case=False, na=False)
            elif op in ("not_contains", "not_contain"):
                mask = ~series.astype(str).str.contains(str(val), case=False, na=False)
            elif op in ("starts_with", "startswith"):
                mask = series.astype(str).str.startswith(str(val), na=False)
            elif op in ("ends_with", "endswith"):
                mask = series.astype(str).str.endswith(str(val), na=False)
            elif op in ("gt", "greater_than", ">"):
                try:
                    num_series = pd.to_numeric(series, errors="coerce")
                    mask = num_series > float(val)
                except Exception:
                    mask = series > str(val)
            elif op in ("gte", "greater_than_or_equal", ">="):
                try:
                    num_series = pd.to_numeric(series, errors="coerce")
                    mask = num_series >= float(val)
                except Exception:
                    mask = series >= str(val)
            elif op in ("lt", "less_than", "<"):
                try:
                    num_series = pd.to_numeric(series, errors="coerce")
                    mask = num_series < float(val)
                except Exception:
                    mask = series < str(val)
            elif op in ("lte", "less_than_or_equal", "<="):
                try:
                    num_series = pd.to_numeric(series, errors="coerce")
                    mask = num_series <= float(val)
                except Exception:
                    mask = series <= str(val)
            elif op == "between":
                try:
                    num_series = pd.to_numeric(series, errors="coerce")
                    mask = (num_series >= float(val)) & (num_series <= float(val2))
                except Exception:
                    mask = (series >= str(val)) & (series <= str(val2))
            else:
                mask = pd.Series([True] * len(df), index=df.index)

            masks.append(mask)

        if not masks:
            return df.copy(), 0

        final_mask = masks[0]
        for m in masks[1:]:
            if match_type == "any":
                final_mask = final_mask | m
            else:
                final_mask = final_mask & m

        initial_len = len(df)
        filtered_df = df[final_mask].copy().reset_index(drop=True)
        rows_removed = initial_len - len(filtered_df)
        return filtered_df, rows_removed

    def apply_sort(self, df: pd.DataFrame, sorts: List[Dict[str, str]]) -> pd.DataFrame:
        """Sort DataFrame by multiple columns."""
        if not sorts:
            return df.copy()

        cols = []
        ascending = []
        for s in sorts:
            col = s.get("column")
            if col in df.columns:
                cols.append(col)
                ascending.append(s.get("direction", "asc").lower() != "desc")

        if not cols:
            return df.copy()

        return df.sort_values(by=cols, ascending=ascending).reset_index(drop=True)

    def handle_missing(
        self, df: pd.DataFrame, column: str, action: str, custom_value: Optional[Any] = None
    ) -> Tuple[pd.DataFrame, int, str]:
        """Handle missing values (drop, mean, median, custom, mode)."""
        res_df = df.copy()
        initial_rows = len(res_df)

        if action == "drop_rows":
            if column == "__all__":
                res_df = res_df.dropna().reset_index(drop=True)
            else:
                if column not in res_df.columns:
                    raise ValueError(f"Column '{column}' not found.")
                res_df = res_df.dropna(subset=[column]).reset_index(drop=True)
            dropped = initial_rows - len(res_df)
            msg = f"Removed {dropped} rows with missing values."
            return res_df, dropped, msg

        if column == "__all__":
            cols_to_process = list(res_df.columns)
        else:
            if column not in res_df.columns:
                raise ValueError(f"Column '{column}' not found.")
            cols_to_process = [column]

        total_filled = 0
        for col in cols_to_process:
            series = res_df[col]
            null_count = int(series.isna().sum())
            if null_count == 0:
                continue

            if action == "fill_mean":
                num_series = pd.to_numeric(series, errors="coerce")
                mean_val = num_series.mean()
                if pd.isna(mean_val):
                    continue
                res_df[col] = series.fillna(round(mean_val, 2))
                total_filled += null_count
            elif action == "fill_median":
                num_series = pd.to_numeric(series, errors="coerce")
                med_val = num_series.median()
                if pd.isna(med_val):
                    continue
                res_df[col] = series.fillna(round(med_val, 2))
                total_filled += null_count
            elif action == "fill_mode":
                mode_vals = series.mode()
                if mode_vals.empty:
                    continue
                res_df[col] = series.fillna(mode_vals.iloc[0])
                total_filled += null_count
            elif action == "fill_custom":
                fill_val = custom_value if custom_value is not None else ""
                # Attempt to preserve numeric dtype if column is numeric
                if pd.api.types.is_numeric_dtype(series):
                    try:
                        fill_val = float(fill_val) if "." in str(fill_val) else int(fill_val)
                    except Exception:
                        pass
                res_df[col] = series.fillna(fill_val)
                total_filled += null_count

        msg = f"Filled {total_filled} missing values using {action.replace('fill_', '')}."
        return res_df, total_filled, msg

    def handle_duplicates(
        self, df: pd.DataFrame, subset: Optional[List[str]] = None, keep: str = "first"
    ) -> Tuple[pd.DataFrame, int, str]:
        """Detect and remove duplicate rows."""
        initial_len = len(df)
        valid_subset = [c for c in subset if c in df.columns] if subset else None
        keep_val = keep if keep in ("first", "last") else False

        res_df = df.drop_duplicates(subset=valid_subset, keep=keep_val).reset_index(drop=True)
        removed_count = initial_len - len(res_df)
        msg = f"Removed {removed_count} duplicate rows."
        return res_df, removed_count, msg

    def edit_cell(self, df: pd.DataFrame, row_index: int, column_name: str, new_value: Any) -> pd.DataFrame:
        """Edit a single cell value by 1-indexed row number and column name."""
        if column_name not in df.columns:
            raise ValueError(f"Column '{column_name}' not found.")
        
        idx = row_index - 1
        if idx < 0 or idx >= len(df):
            raise ValueError(f"Row index {row_index} is out of bounds (1 to {len(df)}).")

        res_df = df.copy()
        # Cast value to column type if applicable
        current_dtype = res_df[column_name].dtype
        val = new_value
        if pd.api.types.is_numeric_dtype(current_dtype):
            try:
                if str(new_value).strip() == "":
                    val = np.nan
                elif "." in str(new_value):
                    val = float(new_value)
                else:
                    val = int(new_value)
            except Exception:
                pass
        
        res_df.at[idx, column_name] = val
        return res_df

    def rename_column(self, df: pd.DataFrame, old_name: str, new_name: str) -> pd.DataFrame:
        """Rename column."""
        if old_name not in df.columns:
            raise ValueError(f"Column '{old_name}' not found.")
        clean_new = new_name.strip()
        if not clean_new:
            raise ValueError("New column name cannot be empty.")
        if clean_new in df.columns and clean_new != old_name:
            raise ValueError(f"A column named '{clean_new}' already exists.")
        
        return df.rename(columns={old_name: clean_new})

    def add_column(self, df: pd.DataFrame, column_name: str, default_value: Optional[Any] = "", data_type: str = "Text") -> pd.DataFrame:
        """Add new column with default value."""
        clean_name = column_name.strip()
        if not clean_name:
            raise ValueError("Column name cannot be empty.")
        if clean_name in df.columns:
            raise ValueError(f"Column '{clean_name}' already exists.")

        res_df = df.copy()
        val = default_value
        if data_type == "Number":
            try:
                val = float(default_value) if "." in str(default_value) else int(default_value)
            except Exception:
                val = 0
        elif data_type == "Boolean":
            val = str(default_value).lower() in ("true", "1", "yes")

        res_df[clean_name] = val
        return res_df

    def delete_column(self, df: pd.DataFrame, column_name: str) -> pd.DataFrame:
        """Delete column."""
        if column_name not in df.columns:
            raise ValueError(f"Column '{column_name}' not found.")
        if len(df.columns) <= 1:
            raise ValueError("Cannot delete the only column in the dataset.")

        return df.drop(columns=[column_name])

    def delete_row(self, df: pd.DataFrame, row_index: int) -> pd.DataFrame:
        """Delete row by 1-indexed row number."""
        idx = row_index - 1
        if idx < 0 or idx >= len(df):
            raise ValueError(f"Row index {row_index} is out of bounds.")

        return df.drop(index=idx).reset_index(drop=True)

    def convert_dtype(
        self, df: pd.DataFrame, column_name: str, target_type: str, force: bool = False
    ) -> Tuple[pd.DataFrame, str, bool, int, float]:
        """Convert column data type with pre-conversion validation and data loss detection."""
        if column_name not in df.columns:
            raise ValueError(f"Column '{column_name}' not found.")

        res_df = df.copy()
        series = res_df[column_name]
        prior_non_null = int(series.notna().sum())

        try:
            if target_type == "Number":
                cleaned = series.astype(str).str.replace("$", "", regex=False).str.replace(",", "", regex=False).str.strip()
                cleaned = cleaned.where(series.notna(), np.nan)
                converted_series = pd.to_numeric(cleaned, errors="coerce")
            elif target_type == "Date":
                converted_series = pd.to_datetime(series, errors="coerce")
            elif target_type == "Boolean":
                bool_map = {"true": True, "1": True, "yes": True, "y": True, "t": True,
                            "false": False, "0": False, "no": False, "n": False, "f": False}
                converted_series = series.astype(str).str.strip().str.lower().map(bool_map)
            elif target_type == "Text":
                converted_series = series.astype(str).where(series.notna(), np.nan)
            else:
                raise ValueError(f"Unsupported target data type '{target_type}'.")
        except Exception as e:
            raise ValueError(f"Failed to convert column '{column_name}' to {target_type}: {str(e)}")

        after_non_null = int(converted_series.notna().sum())
        nulled_count = max(0, prior_non_null - after_non_null)
        nulled_pct = round((nulled_count / prior_non_null) * 100, 2) if prior_non_null > 0 else 0.0

        # Pre-conversion validation: Block high data-loss conversions unless force=True
        if nulled_count > 0 and not force and nulled_pct > 30.0:
            failed_mask = series.notna() & converted_series.isna()
            sample_failed = series[failed_mask].head(3).tolist()
            raise ValueError(
                f"Conversion blocked: converting column '{column_name}' to {target_type} would nullify "
                f"{nulled_count} of {prior_non_null} values ({nulled_pct}% data loss). "
                f"Non-coercible samples: {sample_failed}. Pass force=True to proceed anyway."
            )

        res_df[column_name] = converted_series
        has_data_loss = nulled_count > 0

        if has_data_loss:
            msg = f"Converted column '{column_name}' to {target_type} with data loss: {nulled_count} values ({nulled_pct}%) could not be parsed and were coerced to null."
        else:
            msg = f"Successfully converted column '{column_name}' to {target_type} (0 values lost)."

        return res_df, msg, has_data_loss, nulled_count, nulled_pct

    def calculate_stats(self, df: pd.DataFrame, column: str, operation: Optional[str] = None) -> Dict[str, Any]:
        """Calculate statistical metrics for a column with edge case protection."""
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found.")

        series = df[column]
        dtype = self.infer_column_type(series)
        total_count = len(series)
        null_count = int(series.isna().sum())
        non_null_count = total_count - null_count

        stats: Dict[str, Optional[float]] = {
            "sum": None,
            "avg": None,
            "count": float(non_null_count),
            "min": None,
            "max": None,
            "median": None,
            "std": None,
        }

        # Check for non-numeric column with numeric operation
        if dtype != "Number":
            if operation and operation.lower() in ("sum", "avg", "mean", "median", "std"):
                raise ValueError(
                    f"Column '{column}' has data type '{dtype}'. Numeric operations ({operation.upper()}) cannot be calculated on non-numeric columns."
                )
            # For non-numeric, count is valid, other stats remain None
            return {
                "column": column,
                "data_type": dtype,
                "total_count": total_count,
                "non_null_count": non_null_count,
                "null_count": null_count,
                "stats": stats,
                "message": f"Calculated count stats for {dtype} column '{column}'."
            }

        # Safe numeric parsing (handles currency strings or coercions)
        num_series = pd.to_numeric(
            series.astype(str).str.replace("$", "", regex=False).str.replace(",", "", regex=False).str.strip(),
            errors="coerce"
        ).dropna()

        # Edge case: All-null column
        if num_series.empty:
            return {
                "column": column,
                "data_type": dtype,
                "total_count": total_count,
                "non_null_count": 0,
                "null_count": total_count,
                "stats": stats,
                "message": f"Column '{column}' is entirely null (0 non-null values)."
            }

        sum_val = float(num_series.sum())
        mean_val = float(num_series.mean())
        count_val = float(len(num_series))
        min_val = float(num_series.min())
        max_val = float(num_series.max())
        median_val = float(num_series.median())
        # Edge case: single-row dataset std
        std_val = float(num_series.std()) if len(num_series) > 1 else 0.0

        stats["sum"] = round(sum_val, 4)
        stats["avg"] = round(mean_val, 4)
        stats["count"] = count_val
        stats["min"] = round(min_val, 4)
        stats["max"] = round(max_val, 4)
        stats["median"] = round(median_val, 4)
        stats["std"] = round(std_val, 4) if not math.isnan(std_val) else 0.0

        if operation:
            op = operation.lower()
            if op == "mean":
                op = "avg"
            if op in stats:
                msg = f"{operation.upper()} for '{column}' = {stats[op]}"
            else:
                msg = f"Calculated stats for '{column}'."
        else:
            msg = f"Calculated full statistical profile for '{column}'."

        return {
            "column": column,
            "data_type": dtype,
            "total_count": total_count,
            "non_null_count": non_null_count,
            "null_count": null_count,
            "stats": stats,
            "message": msg,
        }

    def calculate_groupby(
        self, df: pd.DataFrame, group_by_cols: List[str], value_col: str, aggregation: str = "sum"
    ) -> Dict[str, Any]:
        """Perform Group By aggregation with high-cardinality protection."""
        if not group_by_cols:
            raise ValueError("At least one grouping column must be specified.")
        for col in group_by_cols:
            if col not in df.columns:
                raise ValueError(f"Grouping column '{col}' not found.")
        if value_col not in df.columns:
            raise ValueError(f"Value column '{value_col}' not found.")

        agg_lower = aggregation.lower()
        agg_map = {
            "sum": "sum",
            "avg": "mean",
            "mean": "mean",
            "count": "count",
            "min": "min",
            "max": "max",
            "median": "median",
        }
        if agg_lower not in agg_map:
            raise ValueError(f"Unsupported aggregation '{aggregation}'. Supported: {list(agg_map.keys())}")

        pandas_agg = agg_map[agg_lower]
        val_dtype = self.infer_column_type(df[value_col])

        # Validate value column is numeric if not count
        if pandas_agg != "count" and val_dtype != "Number":
            raise ValueError(
                f"Cannot compute {aggregation.upper()} on non-numeric column '{value_col}' ({val_dtype}). Choose 'COUNT' or a Number column."
            )

        working_df = df.copy()
        if pandas_agg != "count":
            working_df[value_col] = pd.to_numeric(
                working_df[value_col].astype(str).str.replace("$", "", regex=False).str.replace(",", "", regex=False).str.strip(),
                errors="coerce"
            )

        # High cardinality protection
        total_unique_groups = len(working_df.drop_duplicates(subset=group_by_cols))
        warning = None
        MAX_GROUPS = 500
        if total_unique_groups > MAX_GROUPS:
            warning = f"High cardinality detected: dataset contains {total_unique_groups} distinct groups. Displaying the top {MAX_GROUPS} groups."

        grouped = working_df.groupby(group_by_cols, as_index=False, dropna=False)[value_col].agg(pandas_agg)
        agg_col_name = f"{value_col}_{aggregation.upper()}"
        grouped = grouped.rename(columns={value_col: agg_col_name})

        # Sort by aggregated value descending
        try:
            grouped = grouped.sort_values(by=agg_col_name, ascending=False)
        except Exception:
            pass

        if len(grouped) > MAX_GROUPS:
            grouped = grouped.head(MAX_GROUPS)

        # Sanitize for JSON
        rows = []
        for _, row in grouped.iterrows():
            item = {}
            for col in grouped.columns:
                val = row[col]
                if pd.isna(val):
                    item[col] = None
                elif isinstance(val, (np.floating, float)):
                    item[col] = round(float(val), 4) if not val.is_integer() else int(val)
                elif isinstance(val, (np.integer, int)):
                    item[col] = int(val)
                else:
                    item[col] = str(val)
            rows.append(item)

        return {
            "group_by": group_by_cols,
            "value_column": value_col,
            "aggregation": aggregation.upper(),
            "total_groups": total_unique_groups,
            "columns": list(grouped.columns),
            "rows": rows,
            "warning": warning,
        }

    def calculate_pivot(
        self,
        df: pd.DataFrame,
        index_cols: List[str],
        col_cols: List[str],
        value_col: str,
        aggregation: str = "sum",
        fill_value: float = 0.0,
    ) -> Dict[str, Any]:
        """Generate multi-dimensional pivot table with high-cardinality protection."""
        if not index_cols:
            raise ValueError("At least one index (row) column must be specified.")
        if not col_cols:
            raise ValueError("At least one column selector must be specified.")
        if not value_col:
            raise ValueError("Target value column must be specified.")

        for col in index_cols + col_cols:
            if col not in df.columns:
                raise ValueError(f"Column '{col}' not found in dataset.")
        if value_col not in df.columns:
            raise ValueError(f"Value column '{value_col}' not found.")

        agg_lower = aggregation.lower()
        agg_map = {
            "sum": "sum",
            "avg": "mean",
            "mean": "mean",
            "count": "count",
            "min": "min",
            "max": "max",
            "median": "median",
        }
        if agg_lower not in agg_map:
            raise ValueError(f"Unsupported aggregation '{aggregation}'.")

        pandas_agg = agg_map[agg_lower]
        val_dtype = self.infer_column_type(df[value_col])
        if pandas_agg != "count" and val_dtype != "Number":
            raise ValueError(
                f"Cannot compute {aggregation.upper()} on non-numeric column '{value_col}'. Choose 'COUNT' or a Number column."
            )

        working_df = df.copy()
        if pandas_agg != "count":
            working_df[value_col] = pd.to_numeric(
                working_df[value_col].astype(str).str.replace("$", "", regex=False).str.replace(",", "", regex=False).str.strip(),
                errors="coerce"
            )

        # High cardinality protection: check distinct column categories
        col_unique = len(working_df.drop_duplicates(subset=col_cols))
        idx_unique = len(working_df.drop_duplicates(subset=index_cols))
        MAX_PIVOT_COLS = 50
        MAX_PIVOT_ROWS = 250
        warning = None

        if col_unique > MAX_PIVOT_COLS or idx_unique > MAX_PIVOT_ROWS:
            warning = f"High cardinality detected ({idx_unique} rows × {col_unique} columns). Pivot table constrained to top dimensions for responsiveness."

        pivot_df = pd.pivot_table(
            working_df,
            index=index_cols,
            columns=col_cols,
            values=value_col,
            aggfunc=pandas_agg,
            fill_value=fill_value,
        )

        if len(pivot_df.columns) > MAX_PIVOT_COLS:
            pivot_df = pivot_df.iloc[:, :MAX_PIVOT_COLS]
        if len(pivot_df) > MAX_PIVOT_ROWS:
            pivot_df = pivot_df.iloc[:MAX_PIVOT_ROWS, :]

        # Flatten column names
        flat_columns = list(index_cols)
        pivot_data_cols = []
        for col_val in pivot_df.columns:
            if isinstance(col_val, tuple):
                clean_col = "_".join(str(c) for c in col_val if str(c).strip())
            else:
                clean_col = str(col_val)
            flat_columns.append(clean_col)
            pivot_data_cols.append(clean_col)

        # Convert to records
        records = []
        reset_pivot = pivot_df.reset_index()
        for _, row in reset_pivot.iterrows():
            item = {}
            for col_idx, col_name in enumerate(flat_columns):
                # row index columns vs pivot columns
                raw_val = row.iloc[col_idx] if col_idx < len(row) else None
                if pd.isna(raw_val) or raw_val is None:
                    item[col_name] = fill_value
                elif isinstance(raw_val, (np.floating, float)):
                    item[col_name] = round(float(raw_val), 4) if not raw_val.is_integer() else int(raw_val)
                elif isinstance(raw_val, (np.integer, int)):
                    item[col_name] = int(raw_val)
                else:
                    item[col_name] = str(raw_val)
            records.append(item)

        return {
            "index_columns": index_cols,
            "columns": flat_columns,
            "total_rows": len(records),
            "total_columns": len(flat_columns),
            "rows": records,
            "warning": warning,
        }

    def generate_chart_data(self, df: pd.DataFrame, config: ChartConfig) -> ChartDataPayload:
        """Generate structured chart data payloads with proactive protections for nulls, cardinality, and missing columns."""
        # 1. Proactive check: column deleted or renamed after chart creation
        missing = []
        if config.x_column not in df.columns:
            missing.append(config.x_column)
        if config.type == "scatter":
            if not config.y_column or config.y_column not in df.columns:
                missing.append(config.y_column or "(Y-axis column not specified)")
        elif config.y_column and (config.aggregation or "sum").lower() != "count" and config.y_column not in df.columns:
            missing.append(config.y_column)

        if missing:
            return ChartDataPayload(
                labels=[],
                datasets=[],
                total_points=0,
                dropped_null_count=0,
                is_valid=False,
                missing_columns=missing,
                error_message=f"Referenced column(s) {missing} no longer exist in the dataset (they may have been deleted or renamed).",
                warning=f"Missing column(s): {', '.join(missing)}. Please edit the chart configuration.",
            )

        # 2. Scatter Plot Generation
        if config.type == "scatter":
            x_col = config.x_column
            y_col = config.y_column
            initial_count = len(df)

            temp_df = pd.DataFrame()
            temp_df["x"] = pd.to_numeric(
                df[x_col].astype(str).str.replace("$", "", regex=False).str.replace(",", "", regex=False).str.strip(),
                errors="coerce"
            )
            temp_df["y"] = pd.to_numeric(
                df[y_col].astype(str).str.replace("$", "", regex=False).str.replace(",", "", regex=False).str.strip(),
                errors="coerce"
            )

            clean_df = temp_df.dropna().reset_index(drop=True)
            dropped_nulls = initial_count - len(clean_df)

            warning_msg = None
            MAX_SCATTER_POINTS = 1000
            if len(clean_df) > MAX_SCATTER_POINTS:
                clean_df = clean_df.sample(n=MAX_SCATTER_POINTS, random_state=42).reset_index(drop=True)
                warning_msg = f"Dataset contains {initial_count} points. Visualizing sampled top {MAX_SCATTER_POINTS} points for responsiveness."

            if dropped_nulls > 0:
                null_note = f"{dropped_nulls} records containing null or non-numeric values were excluded."
                warning_msg = f"{warning_msg} {null_note}" if warning_msg else null_note

            points = [{"x": round(float(r["x"]), 4), "y": round(float(r["y"]), 4)} for _, r in clean_df.iterrows()]

            return ChartDataPayload(
                labels=[],
                datasets=[{
                    "label": f"{y_col} vs {x_col}",
                    "data": points,
                    "pointRadius": 4,
                }],
                total_points=len(points),
                dropped_null_count=dropped_nulls,
                warning=warning_msg,
                is_valid=True,
                missing_columns=[],
                error_message=None,
            )

        # 3. Bar, Line, Pie Charts
        x_col = config.x_column
        y_col = config.y_column
        agg = (config.aggregation or "sum").lower()

        agg_map = {
            "sum": "sum",
            "avg": "mean",
            "mean": "mean",
            "count": "count",
            "min": "min",
            "max": "max",
            "median": "median",
        }
        pandas_agg = agg_map.get(agg, "sum")

        initial_count = len(df)
        working_df = pd.DataFrame()
        working_df["x"] = df[x_col]

        if pandas_agg == "count" or not y_col:
            # Count occurrences of x_col
            clean_df = working_df.dropna(subset=["x"]).copy()
            dropped_nulls = initial_count - len(clean_df)
            grouped = clean_df["x"].value_counts().reset_index()
            grouped.columns = ["x", "val"]
        else:
            working_df["y"] = pd.to_numeric(
                df[y_col].astype(str).str.replace("$", "", regex=False).str.replace(",", "", regex=False).str.strip(),
                errors="coerce"
            )
            clean_df = working_df.dropna(subset=["x", "y"]).copy()
            dropped_nulls = initial_count - len(clean_df)
            grouped = clean_df.groupby("x", as_index=False)["y"].agg(pandas_agg)
            grouped.columns = ["x", "val"]

        # Sort values
        if config.type in ("bar", "pie"):
            grouped = grouped.sort_values(by="val", ascending=False).reset_index(drop=True)
        else:
            try:
                grouped = grouped.sort_values(by="x", ascending=True).reset_index(drop=True)
            except Exception:
                pass

        # High cardinality handling & "Other" bucket
        total_unique = len(grouped)
        max_cat = config.max_categories or 15
        warning_msg = None

        if total_unique > max_cat:
            top_part = grouped.iloc[:max_cat].copy()
            if config.include_other:
                remaining = grouped.iloc[max_cat:]
                other_val = remaining["val"].sum() if pandas_agg in ("sum", "count") else remaining["val"].mean()
                other_row = pd.DataFrame([{"x": f"Other ({len(remaining)} categories)", "val": other_val}])
                grouped = pd.concat([top_part, other_row], ignore_index=True)
                warning_msg = f"High cardinality detected: dataset contains {total_unique} distinct categories. Displaying top {max_cat} + 'Other' bucket."
            else:
                grouped = top_part
                warning_msg = f"High cardinality detected: dataset contains {total_unique} distinct categories. Displaying top {max_cat} categories."

        if dropped_nulls > 0:
            null_note = f"{dropped_nulls} records with null/missing values were excluded."
            warning_msg = f"{warning_msg} {null_note}" if warning_msg else null_note

        labels = [str(x) for x in grouped["x"]]
        raw_values = [round(float(v), 4) if isinstance(v, (float, np.floating)) else int(v) for v in grouped["val"]]
        label_name = f"{y_col or x_col} ({agg.upper()})" if pandas_agg != "count" else f"Count of {x_col}"

        return ChartDataPayload(
            labels=labels,
            datasets=[{
                "label": label_name,
                "data": raw_values,
            }],
            total_points=len(labels),
            dropped_null_count=dropped_nulls,
            warning=warning_msg,
            is_valid=True,
            missing_columns=[],
            error_message=None,
        )


# Singleton instance

data_engine = DataEngine()


