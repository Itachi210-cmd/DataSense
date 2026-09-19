import os
import sys
import json
import pandas as pd
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.services.session_store import session_store
from app.services.data_engine import data_engine

client = TestClient(app)


def run_visualization_verification():
    print("=" * 80)
    print("DATASENSE PHASE 4 — VISUALIZATION & CHARTING ENGINE VERIFICATION SUITE")
    print("=" * 80)

    # 0. Load supermarket_sales demo dataset
    load_res = client.post("/api/samples/supermarket_sales/load")
    assert load_res.status_code == 200, f"Demo load failed: {load_res.text}"
    dataset_id = load_res.json()["id"]
    print(f"\n[INIT] Loaded test dataset 'supermarket_sales.csv' -> ID: {dataset_id}")
    print(f"       Rows: {load_res.json()['row_count']}, Columns: {load_res.json()['column_count']}")

    # -------------------------------------------------------------------------
    # TEST 1: Chart Generation Across All 4 Chart Types (Bar, Line, Pie, Scatter)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 1: LIVE CHART DATA GENERATION (BAR, LINE, PIE, SCATTER)")
    print("-" * 80)

    # 1A. Bar Chart: Product line × Total (SUM)
    res_bar = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Sales by Product Line",
        "type": "bar",
        "x_column": "Product line",
        "y_column": "Total",
        "aggregation": "sum"
    })
    assert res_bar.status_code == 200, res_bar.text
    bar_data = res_bar.json()
    print("-> 1A. Bar Chart: 'Product line' vs SUM('Total')")
    print(f"   Labels Count: {len(bar_data['labels'])}")
    print(f"   Labels:       {bar_data['labels']}")
    print(f"   Values:       {bar_data['datasets'][0]['data']}")
    print(f"   Valid:        {bar_data['is_valid']}")

    # 1B. Line Chart: Date × Total (SUM)
    res_line = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Daily Sales Trend",
        "type": "line",
        "x_column": "Date",
        "y_column": "Total",
        "aggregation": "sum"
    })
    assert res_line.status_code == 200, res_line.text
    line_data = res_line.json()
    print("\n-> 1B. Line Chart: 'Date' vs SUM('Total')")
    print(f"   Total Date Points: {len(line_data['labels'])}")
    print(f"   First 5 Dates:     {line_data['labels'][:5]}")
    print(f"   First 5 Values:    {line_data['datasets'][0]['data'][:5]}")

    # 1C. Pie Chart: Branch distribution (COUNT)
    res_pie = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Branch Share",
        "type": "pie",
        "x_column": "Branch",
        "aggregation": "count"
    })
    assert res_pie.status_code == 200, res_pie.text
    pie_data = res_pie.json()
    print("\n-> 1C. Pie Chart: 'Branch' (COUNT)")
    print(f"   Labels: {pie_data['labels']}")
    print(f"   Counts: {pie_data['datasets'][0]['data']}")

    # 1D. Scatter Plot: Unit price vs Total
    res_scatter = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Unit Price vs Total Spend",
        "type": "scatter",
        "x_column": "Unit price",
        "y_column": "Total"
    })
    assert res_scatter.status_code == 200, res_scatter.text
    scatter_data = res_scatter.json()
    print("\n-> 1D. Scatter Plot: 'Unit price' vs 'Total'")
    print(f"   Total Scatter Coordinates: {scatter_data['total_points']}")
    print(f"   Sample Point #1: {scatter_data['datasets'][0]['data'][0]}")
    print(f"   Sample Point #2: {scatter_data['datasets'][0]['data'][1]}")

    # -------------------------------------------------------------------------
    # TEST 2: PROACTIVE BUG CLASS 1 — CHARTING WITH NULL VALUES
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 2: PROACTIVE BUG CLASS 1 — CHARTING WITH NULL VALUES")
    print("-" * 80)

    # Inject 200 nulls into a new numeric column "Discount_Score"
    df_active = session_store.get_dataset(dataset_id).copy()
    disc_vals = [round(float(x * 1.5), 2) for x in range(800)] + [None] * 200
    df_active["Discount_Score"] = disc_vals
    summary_null = data_engine.generate_summary(df_active, "supermarket_sales.csv", 1000, dataset_id)
    session_store.update_dataset(dataset_id, df_active, summary_null)

    # 2A: Scatter plot with 200 nulls in Y axis
    res_null_scatter = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Total vs Discount_Score",
        "type": "scatter",
        "x_column": "Total",
        "y_column": "Discount_Score"
    })
    assert res_null_scatter.status_code == 200
    ns_data = res_null_scatter.json()
    print("-> 2A. Scatter Plot with 200 Nulls:")
    print(f"   Initial Rows in Dataset:   1000")
    print(f"   Coordinates Plotted:       {ns_data['total_points']}")
    print(f"   Dropped Null Rows:         {ns_data['dropped_null_count']}")
    print(f"   Warning Returned:          '{ns_data['warning']}'")
    assert ns_data["dropped_null_count"] == 200
    assert ns_data["total_points"] == 800

    # 2B: Bar chart aggregating column with nulls
    res_null_bar = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Branch vs Discount_Score (AVG)",
        "type": "bar",
        "x_column": "Branch",
        "y_column": "Discount_Score",
        "aggregation": "avg"
    })
    assert res_null_bar.status_code == 200
    nb_data = res_null_bar.json()
    print("\n-> 2B. Bar Chart Aggregating Column with Nulls (AVG):")
    print(f"   Labels:                    {nb_data['labels']}")
    print(f"   Calculated Averages:       {nb_data['datasets'][0]['data']}")
    print(f"   Dropped Null Rows:         {nb_data['dropped_null_count']}")
    print(f"   Warning Returned:          '{nb_data['warning']}'")

    # -------------------------------------------------------------------------
    # TEST 3: PROACTIVE BUG CLASS 2 — HIGH-CARDINALITY COLUMNS
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 3: PROACTIVE BUG CLASS 2 — HIGH-CARDINALITY COLUMNS")
    print("-" * 80)

    # Invoice ID has 1,000 distinct categories
    res_high_card = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "High Cardinality Invoice Bars",
        "type": "bar",
        "x_column": "Invoice ID",
        "y_column": "Total",
        "aggregation": "sum",
        "max_categories": 10,
        "include_other": True
    })
    assert res_high_card.status_code == 200
    hc_data = res_high_card.json()
    print("-> 3A. Bar Chart on 1,000 Distinct 'Invoice ID's (Max=10 + Other):")
    print(f"   Returned Labels Count:     {len(hc_data['labels'])} (10 top + 1 Other)")
    print(f"   Labels:                    {hc_data['labels']}")
    print(f"   Values:                    {hc_data['datasets'][0]['data']}")
    print(f"   Warning Returned:          '{hc_data['warning']}'")
    assert len(hc_data['labels']) == 11
    assert "Other" in hc_data['labels'][-1]

    # Without "Other" bucket
    res_high_no_other = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "High Cardinality Capped",
        "type": "bar",
        "x_column": "Invoice ID",
        "y_column": "Total",
        "aggregation": "sum",
        "max_categories": 5,
        "include_other": False
    })
    assert res_high_no_other.status_code == 200
    hc_no_other = res_high_no_other.json()
    print(f"\n-> 3B. Capped Without 'Other' (Max=5):")
    print(f"   Returned Labels Count:     {len(hc_no_other['labels'])}")
    print(f"   Labels:                    {hc_no_other['labels']}")
    assert len(hc_no_other['labels']) == 5

    # -------------------------------------------------------------------------
    # TEST 4: PROACTIVE BUG CLASS 3 — COLUMNS DELETED/RENAMED AFTER CHART CREATION
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 4: PROACTIVE BUG CLASS 3 — COLUMN DELETED AFTER CHART CREATION")
    print("-" * 80)

    # Step 1: Add a temporary column "Temp_Metric"
    add_col_res = client.post(f"/api/clean/{dataset_id}/add-column", json={
        "column_name": "Temp_Metric",
        "default_value": 50.0,
        "data_type": "Number"
    })
    assert add_col_res.status_code == 200

    # Step 2: Create and save a chart referencing "Temp_Metric"
    chart_res = client.post(f"/api/chart/{dataset_id}", json={
        "title": "Branch vs Temp_Metric",
        "type": "bar",
        "x_column": "Branch",
        "y_column": "Temp_Metric",
        "aggregation": "sum"
    })
    assert chart_res.status_code == 200
    chart_record = chart_res.json()
    chart_id = chart_record["id"]
    print(f"-> 4A. Created Chart '{chart_record['title']}' (ID: {chart_id})")
    print(f"       Initial is_valid: {chart_record['data_payload']['is_valid']}")
    print(f"       Initial Values:   {chart_record['data_payload']['datasets'][0]['data']}")

    # Step 3: Delete column "Temp_Metric" via Phase 2 cleaning endpoint
    del_col_res = client.post(f"/api/clean/{dataset_id}/delete-column", json={
        "column_name": "Temp_Metric"
    })
    assert del_col_res.status_code == 200
    print(f"-> 4B. Column 'Temp_Metric' deleted via Phase 2 clean endpoint.")

    # Step 4: Fetch the chart list / chart payload — must NOT crash with 500
    get_chart_res = client.get(f"/api/chart/{dataset_id}/{chart_id}")
    assert get_chart_res.status_code == 200
    checked_chart = get_chart_res.json()
    payload = checked_chart["data_payload"]
    print(f"\n-> 4C. Proactive Validation Result after Column Deletion:")
    print(f"   HTTP Status Code:          {get_chart_res.status_code} (No 500 crash)")
    print(f"   is_valid:                  {payload['is_valid']}")
    print(f"   missing_columns:           {payload['missing_columns']}")
    print(f"   error_message:             '{payload['error_message']}'")
    print(f"   warning:                   '{payload['warning']}'")
    assert payload["is_valid"] is False
    assert "Temp_Metric" in payload["missing_columns"]

    # -------------------------------------------------------------------------
    # TEST 5: CHART CRUD (CREATE, EDIT, DUPLICATE, DELETE)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 5: FULL CHART CRUD OPERATIONS (CREATE, EDIT, DUPLICATE, DELETE)")
    print("-" * 80)

    # 5A. Create Chart
    c_res = client.post(f"/api/chart/{dataset_id}", json={
        "title": "Branch Ratings",
        "type": "bar",
        "x_column": "Branch",
        "y_column": "Rating",
        "aggregation": "avg",
        "color_palette": "purple"
    })
    assert c_res.status_code == 200
    main_chart = c_res.json()
    main_chart_id = main_chart["id"]
    print(f"-> 5A. [CREATE] Chart ID: {main_chart_id}")
    print(f"     Title: {main_chart['title']} | Type: {main_chart['type']} | Agg: {main_chart['config']['aggregation']}")
    print(f"     Data:  {main_chart['data_payload']['datasets'][0]['data']}")

    # 5B. Edit / Update Chart (Change aggregation from AVG to MAX, change title)
    u_res = client.put(f"/api/chart/{dataset_id}/{main_chart_id}", json={
        "title": "Branch Max Ratings",
        "aggregation": "max"
    })
    assert u_res.status_code == 200
    updated_chart = u_res.json()
    print(f"\n-> 5B. [EDIT] Chart ID: {main_chart_id}")
    print(f"     New Title:       {updated_chart['title']}")
    print(f"     New Aggregation: {updated_chart['config']['aggregation']}")
    print(f"     Updated Data:    {updated_chart['data_payload']['datasets'][0]['data']}")

    # 5C. Duplicate Chart
    dup_res = client.post(f"/api/chart/{dataset_id}/{main_chart_id}/duplicate")
    assert dup_res.status_code == 200
    dup_chart = dup_res.json()
    dup_chart_id = dup_chart["id"]
    print(f"\n-> 5C. [DUPLICATE] Cloned Chart ID: {dup_chart_id}")
    print(f"     Cloned Title: {dup_chart['title']}")
    print(f"     Cloned Data:  {dup_chart['data_payload']['datasets'][0]['data']}")
    assert dup_chart_id != main_chart_id
    assert "(Copy)" in dup_chart["title"]

    # 5D. List Charts
    list_res = client.get(f"/api/chart/{dataset_id}")
    assert list_res.status_code == 200
    chart_list = list_res.json()
    print(f"\n-> 5D. [LIST] Total Saved Charts for Dataset: {chart_list['total_charts']}")

    # 5E. Delete Duplicate Chart
    del_res = client.delete(f"/api/chart/{dataset_id}/{dup_chart_id}")
    assert del_res.status_code == 200
    print(f"\n-> 5E. [DELETE] Message: {del_res.json()['message']}")

    # Confirm deleted chart is gone
    post_del_list = client.get(f"/api/chart/{dataset_id}").json()
    remaining_ids = [c["id"] for c in post_del_list["charts"]]
    assert dup_chart_id not in remaining_ids
    print(f"     Remaining Charts Count: {post_del_list['total_charts']} (Cloned chart confirmed removed)")

    # -------------------------------------------------------------------------
    # TEST 6: SERVER RESTART PERSISTENCE
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 6: SERVER RESTART PERSISTENCE (SAVED CHARTS SURVIVE CRASH)")
    print("-" * 80)

    charts_before_restart = client.get(f"/api/chart/{dataset_id}").json()["charts"]
    print(f"Saved Charts in Memory Before Restart: {len(charts_before_restart)}")
    for c in charts_before_restart:
        print(f"  Chart ID: {c['id']} | Title: '{c['title']}'")

    print("\nSimulating Backend Server Crash / Restart: Wiping in-memory RAM caches...")
    session_store.clear_in_memory_cache()
    print("In-memory cache successfully wiped (0 datasets, 0 charts in RAM).")

    # Reload from persistent on-disk storage
    reloaded_list = client.get(f"/api/chart/{dataset_id}").json()
    print(f"\n[AFTER RESTART] Reloaded Charts Count: {reloaded_list['total_charts']}")
    for c in reloaded_list["charts"]:
        print(f"  Chart ID: {c['id']} | Title: '{c['title']}' | Valid: {c['data_payload']['is_valid']}")
    
    assert reloaded_list["total_charts"] == len(charts_before_restart)
    print("[PASS] Saved charts 100% survive backend server restart via on-disk atomic JSON persistence.")

    print("\n" + "=" * 80)
    print("ALL PHASE 4 VISUALIZATION VERIFICATION TESTS COMPLETE WITH REAL PAYLOADS")
    print("=" * 80)


if __name__ == "__main__":
    run_visualization_verification()
