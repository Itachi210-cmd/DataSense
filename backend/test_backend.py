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
    assert len(samples) >= 1
    print(f"[OK] Found {len(samples)} sample dataset(s):")
    for s in samples:
        print(f"  - {s['name']} ({s['row_count']} rows, {s['column_count']} cols)")
    assert any(s["id"] == "anime_dataset" for s in samples)

def test_load_sample():
    res = client.post("/api/samples/anime_dataset/load")
    assert res.status_code == 200
    summary = res.json()
    dataset_id = summary["id"]
    assert summary["row_count"] == 24905
    assert summary["column_count"] == 24
    print(f"[OK] Loaded real anime dataset: ID={dataset_id}, rows={summary['row_count']}, cols={summary['column_count']}, memory={summary['memory_usage_formatted']}")

    # Test preview
    prev_res = client.get(f"/api/dataset/{dataset_id}/preview?page=1&page_size=5")
    assert prev_res.status_code == 200
    prev_data = prev_res.json()
    assert len(prev_data["rows"]) == 5
    assert prev_data["total_rows"] == 24905
    assert "_row_index" in prev_data["rows"][0]
    print(f"[OK] Preview returned {len(prev_data['rows'])} rows, total_rows={prev_data['total_rows']}, total_pages={prev_data['total_pages']}")
    print(f"  Sample anime row 1: Name='{prev_data['rows'][0]['Name']}', Type='{prev_data['rows'][0]['Type']}', Score='{prev_data['rows'][0]['Score']}'")

    # Test columns
    col_res = client.get(f"/api/dataset/{dataset_id}/columns")
    assert col_res.status_code == 200
    cols = col_res.json()
    assert len(cols) == 24
    col_types_summary = [f"{c['name']}: {c['data_type']}" for c in cols[:6]]
    print(f"[OK] Columns returned {len(cols)} columns with types: {col_types_summary}...")

    # Test export
    export_res = client.get(f"/api/dataset/{dataset_id}/export")
    assert export_res.status_code == 200
    assert len(export_res.content) > 1000000
    print(f"[OK] Export CSV returned {len(export_res.content)} bytes (~{round(len(export_res.content)/1024/1024, 2)} MB)")

def test_upload_csv():
    # Read real anime-dataset-2023.csv from project folder
    import os
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "anime-dataset-2023.csv")
    with open(csv_path, "rb") as f:
        file_bytes = f.read()

    res = client.post(
        "/api/upload",
        files={"file": ("anime-dataset-2023.csv", io.BytesIO(file_bytes), "text/csv")}
    )
    assert res.status_code == 200
    summary = res.json()
    assert summary["row_count"] == 24905
    assert summary["column_count"] == 24
    assert summary["missing_cells_count"] == 111823
    assert summary["duplicate_rows_count"] == 0
    print(f"[OK] Real Anime CSV Upload passed: {summary['row_count']} rows, {summary['column_count']} cols, {summary['missing_cells_count']} nulls, {summary['duplicate_rows_count']} duplicates")

if __name__ == "__main__":
    test_health()
    test_samples()
    test_load_sample()
    test_upload_csv()
    print("\n>>> ALL BACKEND TESTS PASSED SUCCESSFULLY ON REAL ANIME DATASET! <<<")
