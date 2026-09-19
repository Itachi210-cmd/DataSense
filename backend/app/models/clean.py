from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from .dataset import DatasetSummary


class FilterCondition(BaseModel):
    column: str
    operator: str  # "equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with", "gt", "lt", "gte", "lte", "between", "is_null", "is_not_null"
    value: Optional[Any] = None
    value2: Optional[Any] = None  # Used for "between"


class FilterRequest(BaseModel):
    conditions: List[FilterCondition]
    match_type: str = "all"  # "all" (AND) or "any" (OR)


class SortItem(BaseModel):
    column: str
    direction: str = "asc"  # "asc" or "desc"


class SortRequest(BaseModel):
    sorts: List[SortItem]


class MissingValueRequest(BaseModel):
    column: str  # specific column name or "__all__"
    action: str  # "drop_rows" | "fill_mean" | "fill_median" | "fill_custom" | "fill_mode"
    custom_value: Optional[Any] = None


class DuplicateRequest(BaseModel):
    subset_columns: Optional[List[str]] = None
    keep: str = "first"  # "first" | "last"


class CellEditRequest(BaseModel):
    row_index: int  # 1-indexed (spreadsheet row number)
    column_name: str
    new_value: Any


class ColumnRenameRequest(BaseModel):
    old_name: str
    new_name: str


class ColumnAddRequest(BaseModel):
    column_name: str
    default_value: Optional[Any] = ""
    data_type: str = "Text"


class ColumnDeleteRequest(BaseModel):
    column_name: str


class RowDeleteRequest(BaseModel):
    row_index: int  # 1-indexed


class DataTypeConvertRequest(BaseModel):
    column_name: str
    target_type: str  # "Text" | "Number" | "Date" | "Boolean"
    force: bool = False  # If True, bypass pre-conversion safety check


class CleanResponse(BaseModel):
    success: bool
    message: str
    rows_affected: int = 0
    success_with_data_loss: bool = False
    nulled_count: int = 0
    nulled_percentage: float = 0.0
    summary: DatasetSummary
