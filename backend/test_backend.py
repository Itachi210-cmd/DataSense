import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    print("[OK] Health check passed:", data)

def test_samples():
    res = client.get("/api/samples")
    assert res.status_code == 200
    samples = res.json()
    assert len(samples) == 2
    print(f"[OK] Found {len(samples)} sample datasets:")
    for s in samples:
        print(f"  - {s['name']} ({s['row_count']} rows, {s['column_count']} cols)")

def test_load_sample():
    res = client.post("/api/samples/supermarket_sales/load")
    assert res.status_code == 200
    summary = res.json()
    dataset_id = summary["id"]
    assert summary["row_count"] == 1000
    assert summary["column_count"] == 17
    print(f"[OK] Loaded supermarket sales dataset: ID={dataset_id}, rows={summary['row_count']}, cols={summary['column_count']}, memory={summary['memory_usage_formatted']}")

    # Test preview
    prev_res = client.get(f"/api/dataset/{dataset_id}/preview?page=1&page_size=5")
    assert prev_res.status_code == 200
    prev_data = prev_res.json()
    assert len(prev_data["rows"]) == 5
    assert prev_data["total_rows"] == 1000
    assert "_row_index" in prev_data["rows"][0]
    print(f"[OK] Preview returned {len(prev_data['rows'])} rows, total_rows={prev_data['total_rows']}, total_pages={prev_data['total_pages']}")
    print(f"  Sample row 1: {prev_data['rows'][0]}")

    # Test columns
    col_res = client.get(f"/api/dataset/{dataset_id}/columns")
    assert col_res.status_code == 200
    cols = col_res.json()
    assert len(cols) == 17
    col_types_summary = [f"{c['name']}: {c['data_type']}" for c in cols[:4]]
    print(f"[OK] Columns returned {len(cols)} columns with types: {col_types_summary}...")

    # Test export
    export_res = client.get(f"/api/dataset/{dataset_id}/export")
    assert export_res.status_code == 200
    assert len(export_res.content) > 1000
    print(f"[OK] Export CSV returned {len(export_res.content)} bytes")

def test_upload_csv():
    csv_data = "Name,Age,Salary,Joined\nAlice,30,70000,2022-01-15\nBob,,85000,2021-06-20\nCharlie,35,,2020-03-10\nAlice,30,70000,2022-01-15\n"
    file_bytes = io.BytesIO(csv_data.encode("utf-8"))
    
    res = client.post(
        "/api/upload",
        files={"file": ("test_upload.csv", file_bytes, "text/csv")}
    )
    assert res.status_code == 200
    summary = res.json()
    assert summary["row_count"] == 4
    assert summary["column_count"] == 4
    assert summary["missing_cells_count"] == 2
    assert summary["duplicate_rows_count"] == 1
    print(f"[OK] CSV Upload test passed: {summary['row_count']} rows, {summary['missing_cells_count']} nulls, {summary['duplicate_rows_count']} duplicates")

if __name__ == "__main__":
    test_health()
    test_samples()
    test_load_sample()
    test_upload_csv()
    print("\n>>> ALL BACKEND TESTS PASSED SUCCESSFULLY! <<<")
