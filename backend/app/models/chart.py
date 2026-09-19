from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class ChartConfig(BaseModel):
    title: str
    type: str  # "bar" | "line" | "pie" | "scatter"
    x_column: str
    y_column: Optional[str] = None
    aggregation: Optional[str] = "sum"  # "sum" | "avg" | "count" | "min" | "max" | "none"
    max_categories: Optional[int] = 15  # Cap for high cardinality in bar/pie
    include_other: Optional[bool] = True  # Group remaining into "Other"
    color_palette: Optional[str] = "indigo"  # "indigo" | "emerald" | "amber" | "rose" | "purple" | "cyan"
    show_legend: Optional[bool] = True
    show_grid: Optional[bool] = True


class ChartDataPayload(BaseModel):
    labels: List[str]
    datasets: List[Dict[str, Any]]
    total_points: int
    dropped_null_count: int
    warning: Optional[str] = None
    is_valid: bool = True
    missing_columns: List[str] = []
    error_message: Optional[str] = None


class ChartRecord(BaseModel):
    id: str
    dataset_id: str
    title: str
    type: str
    config: ChartConfig
    data_payload: Optional[ChartDataPayload] = None
    created_at: str
    updated_at: str


class CreateChartRequest(BaseModel):
    title: str
    type: str
    x_column: str
    y_column: Optional[str] = None
    aggregation: Optional[str] = "sum"
    max_categories: Optional[int] = 15
    include_other: Optional[bool] = True
    color_palette: Optional[str] = "indigo"
    show_legend: Optional[bool] = True
    show_grid: Optional[bool] = True


class UpdateChartRequest(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    aggregation: Optional[str] = None
    max_categories: Optional[int] = None
    include_other: Optional[bool] = None
    color_palette: Optional[str] = None
    show_legend: Optional[bool] = None
    show_grid: Optional[bool] = None


class ChartListResponse(BaseModel):
    dataset_id: str
    total_charts: int
    charts: List[ChartRecord]
