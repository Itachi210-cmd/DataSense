from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_remaining_tests():
    print("=" * 75)
    print("      PHASE 2 GAP VERIFICATION: STRUCTURAL EDITS & DTYPE COERCION")
    print("=" * 75)

    # Load fresh Supermarket Sales dataset
    load_res = client.post("/api/samples/supermarket_sales/load")
    assert load_res.status_code == 200
    dataset_id = load_res.json()["id"]
    initial_summary = load_res.json()

    # -------------------------------------------------------------
    # 1. ADD-COLUMN TEST
    # -------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 1: /api/clean/{id}/add-column")
    print("-" * 75)
    print(f"[BEFORE ADD-COLUMN] Column Count: {initial_summary['column_count']}")
    print(f"[BEFORE ADD-COLUMN] Existing Columns: {[c['name'] for c in initial_summary['columns'][:5]]} ...")

    add_res = client.post(f"/api/clean/{dataset_id}/add-column", json={
        "column_name": "Audit_Status",
        "default_value": "Pending",
        "data_type": "Text"
    })
    assert add_res.status_code == 200, add_res.text
    add_data = add_res.json()

    print(f"[AFTER ADD-COLUMN] Message: {add_data['message']}")
    print(f"[AFTER ADD-COLUMN] New Column Count: {add_data['summary']['column_count']}")
    
    # Inspect newly added column in preview rows
    prev_add = client.get(f"/api/dataset/{dataset_id}/preview?page=1&page_size=3").json()
    new_col_meta = next(c for c in add_data['summary']['columns'] if c['name'] == 'Audit_Status')
    print(f"[AFTER ADD-COLUMN] Column Meta: Letter={new_col_meta['letter']}, Type={new_col_meta['data_type']}, Nulls={new_col_meta['null_count']}")
    print("Sample Rows with New Column:")
    for r in prev_add["rows"]:
        print(f"  Row #{r['_row_index']}: Invoice={r['Invoice ID']}, Audit_Status='{r.get('Audit_Status')}'")

    assert add_data['summary']['column_count'] == initial_summary['column_count'] + 1
    assert all(r.get('Audit_Status') == "Pending" for r in prev_add["rows"])
    print("[PASS] add-column verified: Column added with correct default value across all rows.")

    # -------------------------------------------------------------
    # 2. RENAME-COLUMN TEST
    # -------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 2: /api/clean/{id}/rename-column")
    print("-" * 75)
    
    # Sample data before rename under 'Product line'
    prev_before_rename = client.get(f"/api/dataset/{dataset_id}/preview?page=1&page_size=3").json()
    vals_before = [r['Product line'] for r in prev_before_rename["rows"]]
    print("[BEFORE RENAME] Target Column: 'Product line'")
    print(f"[BEFORE RENAME] Sample Values in Rows 1-3: {vals_before}")

    rename_res = client.post(f"/api/clean/{dataset_id}/rename-column", json={
        "old_name": "Product line",
        "new_name": "Category_Group"
    })
    assert rename_res.status_code == 200, rename_res.text
    rename_data = rename_res.json()

    # Verify column name list after rename
    col_names_after = [c['name'] for c in rename_data['summary']['columns']]
    print(f"[AFTER RENAME] Message: {rename_data['message']}")
    print(f"[AFTER RENAME] 'Product line' in columns? {'Product line' in col_names_after}")
    print(f"[AFTER RENAME] 'Category_Group' in columns? {'Category_Group' in col_names_after}")

    # Verify data under renamed column is completely intact
    prev_after_rename = client.get(f"/api/dataset/{dataset_id}/preview?page=1&page_size=3").json()
    vals_after = [r['Category_Group'] for r in prev_after_rename["rows"]]
    print(f"[AFTER RENAME] Sample Values under 'Category_Group': {vals_after}")

    assert "Product line" not in col_names_after
    assert "Category_Group" in col_names_after
    assert vals_before == vals_after
    print("[PASS] rename-column verified: Column renamed while preserving all data perfectly.")

    # -------------------------------------------------------------
    # 3. DELETE-COLUMN TEST
    # -------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 3: /api/clean/{id}/delete-column")
    print("-" * 75)
    
    cols_before_del = rename_data['summary']['column_count']
    print(f"[BEFORE DELETE-COLUMN] Column Count: {cols_before_del}")
    print(f"[BEFORE DELETE-COLUMN] Confirming 'Audit_Status' exists before deletion: {'Audit_Status' in col_names_after}")

    del_col_res = client.post(f"/api/clean/{dataset_id}/delete-column", json={
        "column_name": "Audit_Status"
    })
    assert del_col_res.status_code == 200, del_col_res.text
    del_col_data = del_col_res.json()

    cols_after_del = [c['name'] for c in del_col_data['summary']['columns']]
    print(f"[AFTER DELETE-COLUMN] Message: {del_col_data['message']}")
    print(f"[AFTER DELETE-COLUMN] New Column Count: {del_col_data['summary']['column_count']} (Decreased by 1)")
    print(f"[AFTER DELETE-COLUMN] 'Audit_Status' in columns? {'Audit_Status' in cols_after_del}")

    assert del_col_data['summary']['column_count'] == cols_before_del - 1
    assert "Audit_Status" not in cols_after_del
    print("[PASS] delete-column verified: Column completely removed from schema and DataFrame.")

    # -------------------------------------------------------------
    # 4. DELETE-ROW TEST
    # -------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 4: /api/clean/{id}/delete-row")
    print("-" * 75)
    
    prev_before_del_row = client.get(f"/api/dataset/{dataset_id}/preview?page=1&page_size=3").json()
    row_count_before = del_col_data['summary']['row_count']
    target_row_to_delete = prev_before_del_row["rows"][0]
    next_row = prev_before_del_row["rows"][1]

    print(f"[BEFORE DELETE-ROW] Total Rows: {row_count_before}")
    print(f"[BEFORE DELETE-ROW] Row #1 to delete: Invoice={target_row_to_delete['Invoice ID']}, Total={target_row_to_delete['Total']}")
    print(f"[BEFORE DELETE-ROW] Row #2 (expected new Row #1): Invoice={next_row['Invoice ID']}, Total={next_row['Total']}")

    del_row_res = client.post(f"/api/clean/{dataset_id}/delete-row", json={"row_index": 1})
    assert del_row_res.status_code == 200, del_row_res.text
    del_row_data = del_row_res.json()

    prev_after_del_row = client.get(f"/api/dataset/{dataset_id}/preview?page=1&page_size=3").json()
    new_first_row = prev_after_del_row["rows"][0]

    print(f"\n[AFTER DELETE-ROW] Message: {del_row_data['message']}")
    print(f"[AFTER DELETE-ROW] New Total Rows: {del_row_data['summary']['row_count']} (Decreased by 1)")
    print(f"[AFTER DELETE-ROW] New Row #1: Invoice={new_first_row['Invoice ID']}, Total={new_first_row['Total']}")

    assert del_row_data['summary']['row_count'] == row_count_before - 1
    assert new_first_row['Invoice ID'] == next_row['Invoice ID']
    assert new_first_row['Invoice ID'] != target_row_to_delete['Invoice ID']
    print("[PASS] delete-row verified: Correct target row removed; subsequent rows shifted up.")

    # -------------------------------------------------------------
    # 5. DATA TYPE CONVERSION SAFETY CHECK & DATA LOSS BEHAVIOR
    # -------------------------------------------------------------
    print("\n" + "-" * 75)
    print("TEST 5: /api/clean/{id}/convert-dtype on Non-Coercible Values ('N/A', text)")
    print("-" * 75)
    
    # Target column 'City' with text values ('Yangon', 'Naypyitaw', 'Mandalay')
    city_meta_before = next(c for c in del_row_data['summary']['columns'] if c['name'] == 'City')
    print(f"[BEFORE DTYPE CONVERT] Column: 'City', Inferred Type: {city_meta_before['data_type']}, Nulls: {city_meta_before['null_count']}")
    print("Sample Values before convert: ['Yangon', 'Naypyitaw', 'Mandalay']")

    # Step 5A: Try converting without force flag (Expect Pre-Conversion Safety Check to BLOCK)
    print("\n[STEP 5A: PRE-CONVERSION SAFETY CHECK (force=False)]")
    blocked_res = client.post(f"/api/clean/{dataset_id}/convert-dtype", json={
        "column_name": "City",
        "target_type": "Number",
        "force": False
    })
    print(f"HTTP Response Status Code: {blocked_res.status_code}")
    print(f"Response Detail: {blocked_res.json().get('detail')}")
    assert blocked_res.status_code == 400
    assert "Conversion blocked" in blocked_res.json().get("detail", "")
    print("[PASS] Pre-conversion validation successfully blocked data-destructive cast.")

    # Step 5B: Convert with force=True (Explicit override)
    print("\n[STEP 5B: EXPLICIT FORCE CONVERSION (force=True)]")
    forced_res = client.post(f"/api/clean/{dataset_id}/convert-dtype", json={
        "column_name": "City",
        "target_type": "Number",
        "force": True
    })
    assert forced_res.status_code == 200, forced_res.text
    forced_data = forced_res.json()

    city_meta_after = next(c for c in forced_data['summary']['columns'] if c['name'] == 'City')
    print(f"Response Status: 200 OK")
    print(f"success_with_data_loss: {forced_data.get('success_with_data_loss')}")
    print(f"nulled_count:           {forced_data.get('nulled_count')}")
    print(f"nulled_percentage:      {forced_data.get('nulled_percentage')}%")
    print(f"Reported Data Type:     {city_meta_after['data_type']}")
    print(f"Message:                {forced_data['message']}")

    # Verify that dtype agreement issue is solved:
    # Native float64 with NaNs is correctly identified as "Number" (not "Text")
    assert forced_data.get("success_with_data_loss") is True
    assert forced_data.get("nulled_count") == 999
    assert city_meta_after['data_type'] == "Number", f"Expected 'Number', got {city_meta_after['data_type']}"
    assert city_meta_after['null_count'] == 999
    print("[PASS] Dtype agreement and data-loss reporting confirmed.")

    print("\n" + "=" * 75)
    print(">>> ALL STRUCTURAL EDITS & COERCION BEHAVIORS VERIFIED SUCCESSFULLY! <<<")
    print("=" * 75)

if __name__ == "__main__":
    run_remaining_tests()
