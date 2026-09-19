import io
import pandas as pd
from fastapi import APIRouter, HTTPException, Response, status
from ..models.analysis import (
    StatsRequest,
    StatsResponse,
    GroupByRequest,
    GroupByResponse,
    PivotRequest,
    PivotResponse,
)
from ..services.data_engine import data_engine
from ..services.session_store import session_store

router = APIRouter(prefix="/api/analysis", tags=["Data Analysis Operations"])


def _get_active_dataset(dataset_id: str) -> pd.DataFrame:
    df = session_store.get_dataset(dataset_id)
    if df is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found or session has expired.",
        )
    return df


@router.post("/{dataset_id}/stats", response_model=StatsResponse)
async def calculate_column_stats(dataset_id: str, req: StatsRequest):
    """Calculate summary statistics (SUM, AVG, COUNT, MIN, MAX, MEDIAN, STD) for a column."""
    df = _get_active_dataset(dataset_id)
    try:
        result = data_engine.calculate_stats(df, req.column, req.operation)
        return StatsResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate stats: {str(e)}",
        )


@router.post("/{dataset_id}/groupby", response_model=GroupByResponse)
async def calculate_groupby(dataset_id: str, req: GroupByRequest):
    """Perform group by aggregation with high-cardinality protection."""
    df = _get_active_dataset(dataset_id)
    try:
        result = data_engine.calculate_groupby(
            df,
            group_by_cols=req.group_by,
            value_col=req.value_column,
            aggregation=req.aggregation,
        )
        return GroupByResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate group by: {str(e)}",
        )


@router.post("/{dataset_id}/pivot", response_model=PivotResponse)
async def calculate_pivot(dataset_id: str, req: PivotRequest):
    """Generate multi-dimensional pivot table with high-cardinality protection."""
    df = _get_active_dataset(dataset_id)
    try:
        result = data_engine.calculate_pivot(
            df,
            index_cols=req.index,
            col_cols=req.columns,
            value_col=req.values,
            aggregation=req.aggregation,
            fill_value=req.fill_value if req.fill_value is not None else 0.0,
        )
        return PivotResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate pivot table: {str(e)}",
        )


@router.post("/{dataset_id}/export-groupby")
async def export_groupby_csv(dataset_id: str, req: GroupByRequest):
    """Export group by aggregation results as CSV."""
    df = _get_active_dataset(dataset_id)
    try:
        result = data_engine.calculate_groupby(
            df,
            group_by_cols=req.group_by,
            value_col=req.value_column,
            aggregation=req.aggregation,
        )
        res_df = pd.DataFrame(result["rows"])
        buffer = io.StringIO()
        res_df.to_csv(buffer, index=False)
        csv_bytes = buffer.getvalue().encode("utf-8")

        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=groupby_{dataset_id}.csv"},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{dataset_id}/export-pivot")
async def export_pivot_csv(dataset_id: str, req: PivotRequest):
    """Export pivot table results as CSV."""
    df = _get_active_dataset(dataset_id)
    try:
        result = data_engine.calculate_pivot(
            df,
            index_cols=req.index,
            col_cols=req.columns,
            value_col=req.values,
            aggregation=req.aggregation,
            fill_value=req.fill_value if req.fill_value is not None else 0.0,
        )
        res_df = pd.DataFrame(result["rows"])
        buffer = io.StringIO()
        res_df.to_csv(buffer, index=False)
        csv_bytes = buffer.getvalue().encode("utf-8")

        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=pivot_{dataset_id}.csv"},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
