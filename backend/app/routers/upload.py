import os
import uuid
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from ..models.dataset import DatasetSummary, SampleDatasetInfo, PaginatedRows
from ..services.data_engine import data_engine
from ..services.session_store import session_store

router = APIRouter(prefix="/api", tags=["Upload & Samples"])

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

SAMPLE_DATASETS: List[SampleDatasetInfo] = [
    SampleDatasetInfo(
        id="supermarket_sales",
        name="Supermarket Sales Dataset",
        description="1,000 historical sales transactions across branches, product lines, payment methods, and customer ratings.",
        file_type="csv",
        row_count=1000,
        column_count=17,
        tags=["Retail", "Clean Data", "1,000 Rows", "Finance"],
    ),
    SampleDatasetInfo(
        id="messy_customer_data",
        name="Messy Customer Churn Dataset",
        description="212 employee/customer records containing missing values, duplicates, and mixed formatting — ideal for cleaning demo.",
        file_type="csv",
        row_count=212,
        column_count=9,
        tags=["Messy Data", "Duplicates", "Nulls", "Cleaning Demo"],
    ),
]


@router.post("/upload", response_model=DatasetSummary)
async def upload_file(file: UploadFile = File(...)):
    """Upload CSV or Excel dataset, parse with Pandas, and initialize working session."""
    filename = file.filename or "uploaded_dataset.csv"
    lower_name = filename.lower()

    if not lower_name.endswith((".csv", ".xlsx", ".xls", ".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a CSV, XLSX, or XLS file.",
        )

    try:
        content = await file.read()
        file_size = len(content)

        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        # Max file size: 50MB
        if file_size > 50 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size exceeds 50MB limit.",
            )

        df = data_engine.parse_file(content, filename)
        dataset_id = str(uuid.uuid4())
        summary = data_engine.generate_summary(df, filename, file_size, dataset_id)

        session_store.set_dataset(dataset_id, df, summary, filename)
        return summary

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process file: {str(e)}",
        )


@router.get("/samples", response_model=List[SampleDatasetInfo])
async def get_sample_datasets():
    """List bundled demo datasets available for 1-click loading."""
    return SAMPLE_DATASETS


@router.post("/samples/{sample_id}/load", response_model=DatasetSummary)
async def load_sample_dataset(sample_id: str):
    """Load a built-in demo dataset into active session store."""
    sample_file_map = {
        "supermarket_sales": "supermarket_sales.csv",
        "messy_customer_data": "messy_customer_data.csv",
    }

    if sample_id not in sample_file_map:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample dataset '{sample_id}' not found.",
        )

    filename = sample_file_map[sample_id]
    filepath = os.path.join(DATA_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sample data file {filename} is missing on the server.",
        )

    try:
        with open(filepath, "rb") as f:
            content = f.read()

        file_size = len(content)
        df = data_engine.parse_file(content, filename)
        dataset_id = str(uuid.uuid4())
        display_name = "Supermarket Sales Analysis.csv" if sample_id == "supermarket_sales" else "Messy Customer Churn.csv"
        summary = data_engine.generate_summary(df, display_name, file_size, dataset_id)

        session_store.set_dataset(dataset_id, df, summary, display_name)
        return summary

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading sample dataset: {str(e)}",
        )
