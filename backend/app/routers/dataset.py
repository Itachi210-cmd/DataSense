from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
import io
from ..models.dataset import DatasetSummary, PaginatedRows, ColumnMeta
from ..services.data_engine import data_engine
from ..services.session_store import session_store

router = APIRouter(prefix="/api/dataset", tags=["Dataset Operations"])


@router.get("/{dataset_id}", response_model=DatasetSummary)
async def get_dataset_summary(dataset_id: str):
    """Get metadata and summary statistics for a loaded dataset."""
    summary = session_store.get_summary(dataset_id)
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found or session has expired.",
        )
    return summary


@router.get("/{dataset_id}/preview", response_model=PaginatedRows)
async def get_dataset_preview(
    dataset_id: str,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(25, ge=1, le=100, description="Number of rows per page"),
    search: str = Query("", description="Search term across all columns"),
    sort_column: Optional[str] = Query(None, description="Column name to sort by"),
    sort_direction: str = Query("asc", pattern="^(asc|desc)$", description="Sort direction"),
):
    """Retrieve paginated rows formatted for the spreadsheet grid."""
    df = session_store.get_dataset(dataset_id)
    summary = session_store.get_summary(dataset_id)

    if df is None or summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset session not found. Please re-upload or reload the dataset.",
        )

    return data_engine.get_paginated_preview(
        df=df,
        summary=summary,
        page=page,
        page_size=page_size,
        search_query=search,
        sort_column=sort_column,
        sort_direction=sort_direction,
    )


@router.get("/{dataset_id}/columns", response_model=List[ColumnMeta])
async def get_dataset_columns(dataset_id: str):
    """Get list of columns and their data types, null counts, and summary statistics."""
    summary = session_store.get_summary(dataset_id)
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset session not found.",
        )
    return summary.columns


@router.get("/{dataset_id}/export")
async def export_dataset(dataset_id: str):
    """Download the current state of the dataset as a CSV file."""
    df = session_store.get_dataset(dataset_id)
    summary = session_store.get_summary(dataset_id)

    if df is None or summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset session not found.",
        )

    csv_bytes = data_engine.export_csv(df)
    filename = f"datasense_{summary.name.replace('.csv', '').replace('.xlsx', '').replace('.xls', '')}_export.csv"

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """Delete dataset from active session store."""
    deleted = session_store.delete_dataset(dataset_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset session not found.",
        )
    return {"status": "success", "message": f"Dataset {dataset_id} deleted."}
