from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class StatsRequest(BaseModel):
    column: str
    operation: Optional[str] = None  # "sum", "avg", "mean", "count", "min", "max", "median", "std", or None for all


class StatsResponse(BaseModel):
    column: str
    data_type: str
    total_count: int
    non_null_count: int
    null_count: int
    stats: Dict[str, Optional[float]]
    message: str


class GroupByRequest(BaseModel):
    group_by: List[str]
    value_column: str
    aggregation: str = "sum"  # "sum" | "avg" | "mean" | "count" | "min" | "max" | "median"


class GroupByResponse(BaseModel):
    group_by: List[str]
    value_column: str
    aggregation: str
    total_groups: int
    columns: List[str]
    rows: List[Dict[str, Any]]
    warning: Optional[str] = None


class PivotRequest(BaseModel):
    index: List[str]  # Row categories
    columns: List[str]  # Column categories
    values: str  # Numeric target column
    aggregation: str = "sum"  # "sum" | "avg" | "mean" | "count" | "min" | "max" | "median"
    fill_value: Optional[float] = 0.0


class PivotResponse(BaseModel):
    index_columns: List[str]
    columns: List[str]
    total_rows: int
    total_columns: int
    rows: List[Dict[str, Any]]
    warning: Optional[str] = None
