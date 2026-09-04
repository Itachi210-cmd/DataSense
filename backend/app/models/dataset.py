from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class ColumnMeta(BaseModel):
    name: str
    index: int
    letter: str  # A, B, C...
    data_type: str  # "Text" | "Number" | "Date" | "Boolean"
    original_dtype: str
    non_null_count: int
    null_count: int
    null_percentage: float
    unique_count: int
    sample_values: List[Any] = []
    min_value: Optional[Any] = None
    max_value: Optional[Any] = None
    mean_value: Optional[float] = None
    median_value: Optional[float] = None


class DatasetSummary(BaseModel):
    id: str
    name: str
    file_type: str  # "csv", "xlsx", "xls"
    file_size_bytes: int
    file_size_formatted: str
    row_count: int
    column_count: int
    missing_cells_count: int
    missing_cells_percentage: float
    duplicate_rows_count: int
    memory_usage_bytes: int
    memory_usage_formatted: str
    columns: List[ColumnMeta]
    created_at: str


class PaginatedRows(BaseModel):
    dataset_id: str
    page: int
    page_size: int
    total_rows: int
    total_pages: int
    columns: List[str]
    column_types: Dict[str, str]
    rows: List[Dict[str, Any]]


class SampleDatasetInfo(BaseModel):
    id: str
    name: str
    description: str
    file_type: str
    row_count: int
    column_count: int
    tags: List[str] = []


class ErrorResponse(BaseModel):
    detail: str
