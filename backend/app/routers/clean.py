import io
from fastapi import APIRouter, HTTPException, status
from ..models.clean import (
    FilterRequest,
    SortRequest,
    MissingValueRequest,
    DuplicateRequest,
    CellEditRequest,
    ColumnRenameRequest,
    ColumnAddRequest,
    ColumnDeleteRequest,
    RowDeleteRequest,
    DataTypeConvertRequest,
    CleanResponse,
)
from ..services.data_engine import data_engine
from ..services.session_store import session_store

router = APIRouter(prefix="/api/clean", tags=["Data Cleaning Operations"])


def _get_active_dataset_and_summary(dataset_id: str):
    df = session_store.get_dataset(dataset_id)
    summary = session_store.get_summary(dataset_id)
    if df is None or summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found or session has expired.",
        )
    return df, summary


@router.post("/{dataset_id}/filter", response_model=CleanResponse)
async def filter_dataset(dataset_id: str, req: FilterRequest):
    """Filter rows matching conditions."""
    df, summary = _get_active_dataset_and_summary(dataset_id)
    conditions = [c.model_dump() for c in req.conditions]
    
    try:
        new_df, rows_removed = data_engine.apply_filter(df, conditions, req.match_type)
        new_summary = data_engine.generate_summary(
            new_df, summary.name, summary.file_size_bytes, dataset_id
        )
        session_store.update_dataset(dataset_id, new_df, new_summary)
        return CleanResponse(
            success=True,
            message=f"Filter applied: {len(new_df)} rows remaining ({rows_removed} rows filtered out).",
            rows_affected=rows_removed,
            summary=new_summary,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Filter failed: {str(e)}")


@router.post("/{dataset_id}/sort", response_model=CleanResponse)
async def sort_dataset(dataset_id: str, req: SortRequest):
    """Sort dataset rows."""
    df, summary = _get_active_dataset_and_summary(dataset_id)
    sorts = [s.model_dump() for s in req.sorts]
    
    try:
        new_df = data_engine.apply_sort(df, sorts)
        new_summary = data_engine.generate_summary(
            new_df, summary.name, summary.file_size_bytes, dataset_id
        )
        session_store.update_dataset(dataset_id, new_df, new_summary)
        return CleanResponse(
            success=True,
            message=f"Dataset sorted by {', '.join([f'{s.column} ({s.direction})' for s in req.sorts])}.",
            rows_affected=len(new_df),
            summary=new_summary,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Sort failed: {str(e)}")


@router.post("/{dataset_id}/missing", response_model=CleanResponse)
async def handle_missing_values(dataset_id: str, req: MissingValueRequest):
    """Handle missing values (drop rows, fill mean, median, custom, mode)."""
    df, summary = _get_active_dataset_and_summary(dataset_id)

    try:
        new_df, affected, message = data_engine.handle_missing(
            df, req.column, req.action, req.custom_value
        )
        new_summary = data_engine.generate_summary(
            new_df, summary.name, summary.file_size_bytes, dataset_id
        )
        session_store.update_dataset(dataset_id, new_df, new_summary)
        return CleanResponse(
            success=True,
            message=message,
            rows_affected=affected,
            summary=new_summary,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Missing value operation failed: {str(e)}")


@router.post("/{dataset_id}/duplicates", response_model=CleanResponse)
async def handle_duplicates(dataset_id: str, req: DuplicateRequest):
    """Detect and remove duplicate rows."""
    df, summary = _get_active_dataset_and_summary(dataset_id)

    try:
        new_df, removed_count, message = data_engine.handle_duplicates(
            df, req.subset_columns, req.keep
        )
        new_summary = data_engine.generate_summary(
            new_df, summary.name, summary.file_size_bytes, dataset_id
        )
        session_store.update_dataset(dataset_id, new_df, new_summary)
        return CleanResponse(
            success=True,
            message=message,
            rows_affected=removed_count,
            summary=new_summary,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Duplicate removal failed: {str(e)}")


@router.post("/{dataset_id}/edit-cell", response_model=CleanResponse)
async def edit_cell(dataset_id: str, req: CellEditRequest):
    """Edit a single cell value."""
    df, summary = _get_active_dataset_and_summary(dataset_id)

    try:
        new_df = data_engine.edit_cell(df, req.row_index, req.column_name, req.new_value)
        new_summary = data_engine.generate_summary(
            new_df, summary.name, summary.file_size_bytes, dataset_id
        )
        session_store.update_dataset(dataset_id, new_df, new_summary)
        return CleanResponse(
            success=True,
            message=f"Updated cell at row #{req.row_index}, column '{req.column_name}'.",
            rows_affected=1,
            summary=new_summary,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cell edit failed: {str(e)}")


@router.post("/{dataset_id}/rename-column", response_model=CleanResponse)
async def rename_column(dataset_id: str, req: ColumnRenameRequest):
    """Rename a column."""
    df, summary = _get_active_dataset_and_summary(dataset_id)

    try:
        new_df = data_engine.rename_column(df, req.old_name, req.new_name)
        new_summary = data_engine.generate_summary(
            new_df, summary.name, summary.file_size_bytes, dataset_id
        )
        session_store.update_dataset(dataset_id, new_df, new_summary)
        return CleanResponse(
            success=True,
            message=f"Renamed column '{req.old_name}' to '{req.new_name}'.",
            rows_affected=0,
            summary=new_summary,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Rename failed: {str(e)}")


@router.post("/{dataset_id}/add-column", response_model=CleanResponse)
async def add_column(dataset_id: str, req: ColumnAddRequest):
    """Add a new column with default value."""
    df, summary = _get_active_dataset_and_summary(dataset_id)

    try:
        new_df = data_engine.add_column(df, req.column_name, req.default_value, req.data_type)
        new_summary = data_engine.generate_summary(
            new_df, summary.name, summary.file_size_bytes, dataset_id
        )
        session_store.update_dataset(dataset_id, new_df, new_summary)
        return CleanResponse(
            success=True,
            message=f"Added new column '{req.column_name}'.",
            rows_affected=0,
            summary=new_summary,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Add column failed: {str(e)}")


@router.post("/{dataset_id}/delete-column", response_model=CleanResponse)
async def delete_column(dataset_id: str, req: ColumnDeleteRequest):
    """Delete a column."""
    df, summary = _get_active_dataset_and_summary(dataset_id)

    try:
        new_df = data_engine.delete_column(df, req.column_name)
        new_summary = data_engine.generate_summary(
            new_df, summary.name, summary.file_size_bytes, dataset_id
        )
        session_store.update_dataset(dataset_id, new_df, new_summary)
        return CleanResponse(
            success=True,
            message=f"Deleted column '{req.column_name}'.",
            rows_affected=0,
            summary=new_summary,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Delete column failed: {str(e)}")


@router.post("/{dataset_id}/delete-row", response_model=CleanResponse)
async def delete_row(dataset_id: str, req: RowDeleteRequest):
    """Delete a single row by 1-indexed row number."""
    df, summary = _get_active_dataset_and_summary(dataset_id)

    try:
        new_df = data_engine.delete_row(df, req.row_index)
        new_summary = data_engine.generate_summary(
            new_df, summary.name, summary.file_size_bytes, dataset_id
        )
        session_store.update_dataset(dataset_id, new_df, new_summary)
        return CleanResponse(
            success=True,
            message=f"Deleted row #{req.row_index}.",
            rows_affected=1,
            summary=new_summary,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Delete row failed: {str(e)}")


@router.post("/{dataset_id}/convert-dtype", response_model=CleanResponse)
async def convert_dtype(dataset_id: str, req: DataTypeConvertRequest):
    """Convert column data type."""
    df, summary = _get_active_dataset_and_summary(dataset_id)

    try:
        new_df, message, has_data_loss, nulled_count, nulled_pct = data_engine.convert_dtype(
            df, req.column_name, req.target_type, req.force
        )
        new_summary = data_engine.generate_summary(
            new_df, summary.name, summary.file_size_bytes, dataset_id
        )
        session_store.update_dataset(dataset_id, new_df, new_summary)
        return CleanResponse(
            success=True,
            message=message,
            rows_affected=nulled_count,
            success_with_data_loss=has_data_loss,
            nulled_count=nulled_count,
            nulled_percentage=nulled_pct,
            summary=new_summary,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Data type conversion failed: {str(e)}")


@router.post("/{dataset_id}/reset", response_model=CleanResponse)
async def reset_dataset(dataset_id: str):
    """Reset the dataset to its original uploaded raw state."""
    raw_df = session_store.get_raw_dataset(dataset_id)
    summary = session_store.get_summary(dataset_id)

    if raw_df is None or summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original raw dataset not found.",
        )

    try:
        new_summary = data_engine.generate_summary(
            raw_df, summary.name, summary.file_size_bytes, dataset_id
        )
        session_store.reset_to_raw(dataset_id, new_summary)
        return CleanResponse(
            success=True,
            message=f"Dataset '{summary.name}' reset to its original uploaded state ({len(raw_df)} rows).",
            rows_affected=len(raw_df),
            summary=new_summary,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Reset failed: {str(e)}")
