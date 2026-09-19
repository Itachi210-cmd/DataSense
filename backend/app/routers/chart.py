import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
import pandas as pd

from ..models.chart import (
    ChartConfig,
    ChartDataPayload,
    ChartRecord,
    CreateChartRequest,
    UpdateChartRequest,
    ChartListResponse,
)
from ..services.data_engine import data_engine
from ..services.session_store import session_store

router = APIRouter(prefix="/api/chart", tags=["Visualization & Charts"])


def _get_active_dataset(dataset_id: str) -> pd.DataFrame:
    df = session_store.get_dataset(dataset_id)
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found or session has expired.",
        )
    return df


@router.post("/{dataset_id}/preview", response_model=ChartDataPayload)
async def preview_chart_data(dataset_id: str, config: ChartConfig):
    """Generate live chart data payload for previewing before saving."""
    df = _get_active_dataset(dataset_id)
    try:
        return data_engine.generate_chart_data(df, config)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate chart preview: {str(e)}",
        )


@router.post("/{dataset_id}", response_model=ChartRecord)
async def create_chart(dataset_id: str, req: CreateChartRequest):
    """Create and persist a new chart for the dataset."""
    df = _get_active_dataset(dataset_id)
    chart_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    config = ChartConfig(
        title=req.title,
        type=req.type,
        x_column=req.x_column,
        y_column=req.y_column,
        aggregation=req.aggregation,
        max_categories=req.max_categories or 15,
        include_other=req.include_other if req.include_other is not None else True,
        color_palette=req.color_palette or "indigo",
        show_legend=req.show_legend if req.show_legend is not None else True,
        show_grid=req.show_grid if req.show_grid is not None else True,
    )

    data_payload = data_engine.generate_chart_data(df, config)

    record = ChartRecord(
        id=chart_id,
        dataset_id=dataset_id,
        title=req.title,
        type=req.type,
        config=config,
        data_payload=data_payload,
        created_at=now_iso,
        updated_at=now_iso,
    )

    session_store.save_chart(dataset_id, record)
    return record


@router.get("/{dataset_id}", response_model=ChartListResponse)
async def list_charts(dataset_id: str):
    """List all saved charts for the dataset, refreshing their payloads against current active data."""
    df = _get_active_dataset(dataset_id)
    saved_charts = session_store.get_charts(dataset_id)

    # Refresh data payloads against current DataFrame to detect deleted/renamed columns proactively
    refreshed_charts = []
    for chart in saved_charts:
        payload = data_engine.generate_chart_data(df, chart.config)
        chart_copy = chart.model_copy(update={"data_payload": payload})
        refreshed_charts.append(chart_copy)

    return ChartListResponse(
        dataset_id=dataset_id,
        total_charts=len(refreshed_charts),
        charts=refreshed_charts,
    )


@router.get("/{dataset_id}/{chart_id}", response_model=ChartRecord)
async def get_chart(dataset_id: str, chart_id: str):
    """Get a single chart by ID with fresh data payload."""
    df = _get_active_dataset(dataset_id)
    chart = session_store.get_chart(dataset_id, chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail=f"Chart '{chart_id}' not found.")

    payload = data_engine.generate_chart_data(df, chart.config)
    return chart.model_copy(update={"data_payload": payload})


@router.put("/{dataset_id}/{chart_id}", response_model=ChartRecord)
async def update_chart(dataset_id: str, chart_id: str, req: UpdateChartRequest):
    """Update chart configuration."""
    df = _get_active_dataset(dataset_id)
    chart = session_store.get_chart(dataset_id, chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail=f"Chart '{chart_id}' not found.")

    curr_config = chart.config.model_dump()
    req_dict = req.model_dump(exclude_unset=True)
    for k, v in req_dict.items():
        if v is not None:
            curr_config[k] = v

    new_config = ChartConfig(**curr_config)
    new_title = req.title if req.title is not None else chart.title
    new_type = req.type if req.type is not None else chart.type
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    new_payload = data_engine.generate_chart_data(df, new_config)

    updated_record = ChartRecord(
        id=chart_id,
        dataset_id=dataset_id,
        title=new_title,
        type=new_type,
        config=new_config,
        data_payload=new_payload,
        created_at=chart.created_at,
        updated_at=now_iso,
    )

    session_store.save_chart(dataset_id, updated_record)
    return updated_record


@router.post("/{dataset_id}/{chart_id}/duplicate", response_model=ChartRecord)
async def duplicate_chart(dataset_id: str, chart_id: str):
    """Duplicate an existing chart record."""
    df = _get_active_dataset(dataset_id)
    chart = session_store.get_chart(dataset_id, chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail=f"Chart '{chart_id}' not found.")

    new_id = str(uuid.uuid4())
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_title = f"{chart.title} (Copy)"

    new_config = chart.config.model_copy(update={"title": new_title})
    new_payload = data_engine.generate_chart_data(df, new_config)

    cloned_record = ChartRecord(
        id=new_id,
        dataset_id=dataset_id,
        title=new_title,
        type=chart.type,
        config=new_config,
        data_payload=new_payload,
        created_at=now_iso,
        updated_at=now_iso,
    )

    session_store.save_chart(dataset_id, cloned_record)
    return cloned_record


@router.delete("/{dataset_id}/{chart_id}")
async def delete_chart(dataset_id: str, chart_id: str):
    """Delete a chart record from persistent storage."""
    deleted = session_store.delete_chart(dataset_id, chart_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Chart '{chart_id}' not found.")
    return {"success": True, "message": f"Chart '{chart_id}' deleted successfully."}
