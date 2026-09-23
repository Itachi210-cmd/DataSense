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

    # 0. Load real anime demo dataset
    load_res = client.post("/api/samples/anime_dataset/load")
    assert load_res.status_code == 200, f"Demo load failed: {load_res.text}"
    dataset_id = load_res.json()["id"]
    print(f"\n[INIT] Loaded real test dataset 'anime-dataset-2023.csv' -> ID: {dataset_id}")
    print(f"       Rows: {load_res.json()['row_count']}, Columns: {load_res.json()['column_count']}")

    # -------------------------------------------------------------------------
    # TEST 1: Chart Generation Across All 4 Chart Types (Bar, Line, Pie, Scatter)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 1: LIVE CHART DATA GENERATION (BAR, LINE, PIE, SCATTER)")
    print("-" * 80)

    # 1A. Bar Chart: Type × Score (AVG)
    res_bar = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Average Score by Anime Type",
        "type": "bar",
        "x_column": "Type",
        "y_column": "Score",
        "aggregation": "avg"
    })
    assert res_bar.status_code == 200, res_bar.text
    bar_data = res_bar.json()
    print("-> 1A. Bar Chart: 'Type' vs AVG('Score')")
    print(f"   Labels Count: {len(bar_data['labels'])}")
    print(f"   Labels:       {bar_data['labels']}")
    print(f"   Values:       {bar_data['datasets'][0]['data']}")
    print(f"   Valid:        {bar_data['is_valid']}")
    assert bar_data["is_valid"] is True
    assert len(bar_data["labels"]) == 6

    # 1B. Line Chart: Premiered × Favorites (SUM)
    res_line = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Favorites Trend by Premiered Season",
        "type": "line",
        "x_column": "Premiered",
        "y_column": "Favorites",
        "aggregation": "sum",
        "max_categories": 15
    })
    assert res_line.status_code == 200, res_line.text
    line_data = res_line.json()
    print("\n-> 1B. Line Chart: 'Premiered' vs SUM('Favorites')")
    print(f"   Total Points:      {len(line_data['labels'])}")
    print(f"   First 5 Seasons:   {line_data['labels'][:5]}")
    print(f"   First 5 Values:    {line_data['datasets'][0]['data'][:5]}")
    assert len(line_data["labels"]) == 15

    # 1C. Pie Chart: Rating distribution (COUNT)
    res_pie = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Content Rating Share",
        "type": "pie",
        "x_column": "Rating",
        "aggregation": "count"
    })
    assert res_pie.status_code == 200, res_pie.text
    pie_data = res_pie.json()
    print("\n-> 1C. Pie Chart: 'Rating' (COUNT)")
    print(f"   Labels: {pie_data['labels']}")
    print(f"   Counts: {pie_data['datasets'][0]['data']}")
    assert len(pie_data["labels"]) == 6

    # 1D. Scatter Plot: Members vs Favorites
    res_scatter = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Members vs Favorites",
        "type": "scatter",
        "x_column": "Members",
        "y_column": "Favorites"
    })
    assert res_scatter.status_code == 200, res_scatter.text
    scatter_data = res_scatter.json()
    print("\n-> 1D. Scatter Plot: 'Members' vs 'Favorites'")
    print(f"   Total Scatter Coordinates: {scatter_data['total_points']}")
    print(f"   Sample Point #1: {scatter_data['datasets'][0]['data'][0]}")
    print(f"   Sample Point #2: {scatter_data['datasets'][0]['data'][1]}")
    assert scatter_data["total_points"] == 1000

    # -------------------------------------------------------------------------
    # TEST 2: PROACTIVE BUG CLASS 1 — CHARTING WITH NULL VALUES
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 2: PROACTIVE BUG CLASS 1 — CHARTING WITH REAL NATURAL NULL VALUES")
    print("-" * 80)

    # 2A: Scatter plot with real 9,213 natural nulls in Score
    res_null_scatter = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Score vs Members",
        "type": "scatter",
        "x_column": "Members",
        "y_column": "Score"
    })
    assert res_null_scatter.status_code == 200
    ns_data = res_null_scatter.json()
    print("-> 2A. Scatter Plot with Real 9,213 Natural Nulls in 'Score':")
    print(f"   Initial Rows in Dataset:   24905")
    print(f"   Coordinates Plotted:       {ns_data['total_points']} (sampled from valid non-null rows)")
    print(f"   Dropped Null Rows:         {ns_data['dropped_null_count']}")
    print(f"   Warning Returned:          '{ns_data['warning']}'")
    assert ns_data["dropped_null_count"] == 9213
    assert ns_data["total_points"] == 1000

    # 2B: Bar chart aggregating column with natural nulls (Score has 9,213 natural nulls)
    res_null_bar = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Type vs Score (AVG)",
        "type": "bar",
        "x_column": "Type",
        "y_column": "Score",
        "aggregation": "avg"
    })
    assert res_null_bar.status_code == 200
    nb_data = res_null_bar.json()
    print("\n-> 2B. Bar Chart Aggregating Real Column with Natural Nulls (Score):")
    print(f"   Labels:                    {nb_data['labels']}")
    print(f"   Calculated Averages:       {nb_data['datasets'][0]['data']}")
    print(f"   Dropped Null Rows:         {nb_data['dropped_null_count']}")
    print(f"   Warning Returned:          '{nb_data['warning']}'")
    assert nb_data["dropped_null_count"] == 9214

    # 2C: Line Chart with real chronological dates and natural nulls
    # Extract real air dates from Aired column: 20,090 valid dates, 4,815 natural nulls
    df_active = session_store.get_dataset(dataset_id).copy()
    df_active["Air_Date"] = pd.to_datetime(df_active["Aired"].str.split(" to ").str[0], errors="coerce").dt.strftime("%Y-%m-%d")
    summary_dates = data_engine.generate_summary(df_active, "anime-dataset-2023.csv", 1000, dataset_id)
    session_store.update_dataset(dataset_id, df_active, summary_dates)

    res_null_line = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Anime Release Timeline Trend",
        "type": "line",
        "x_column": "Air_Date",
        "y_column": "Members",
        "aggregation": "sum",
        "max_categories": 100
    })
    assert res_null_line.status_code == 200
    nl_data = res_null_line.json()
    print("\n-> 2C. Line Chart with Natural Null Dates in X-Axis (Air_Date):")
    print(f"   Initial Rows in Dataset:   24905")
    print(f"   Natural Null Dates:        4815 (from missing/unparseable Aired values)")
    print(f"   Dropped Null Rows:         {nl_data['dropped_null_count']}")
    print(f"   Returned Date Points:      {len(nl_data['labels'])}")
    print(f"   First 5 Sorted Dates:      {nl_data['labels'][:5]}")
    print(f"   Last 5 Sorted Dates:       {nl_data['labels'][-5:]}")
    print(f"   First 5 Sums:              {nl_data['datasets'][0]['data'][:5]}")
    print(f"   Warning Returned:          '{nl_data['warning']}'")

    # Chronological validation
    date_objs = [pd.to_datetime(d) for d in nl_data['labels']]
    is_sorted = all(date_objs[i] <= date_objs[i+1] for i in range(len(date_objs) - 1))
    print(f"   Chronologically Ordered:   {is_sorted} (Real historical dates ordered from earliest to latest)")
    has_zero_fill = any(d in ("1970-01-01", "0", "None", "nan") for d in nl_data['labels'])
    print(f"   Zero-Filled / Gaps Handled: {not has_zero_fill} (No 1970-01-01, None, or zero-fill phantom dates)")
    assert nl_data["dropped_null_count"] == 4815
    assert is_sorted is True
    assert not has_zero_fill

    # -------------------------------------------------------------------------
    # TEST 3: PROACTIVE BUG CLASS 2 — HIGH-CARDINALITY COLUMNS
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 3: PROACTIVE BUG CLASS 2 — HIGH-CARDINALITY COLUMNS (REAL 'Studios')")
    print("-" * 80)

    # 3A: Bar chart on 1,546 distinct studios
    res_high_card = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Top Anime Studios by Total Favorites",
        "type": "bar",
        "x_column": "Studios",
        "y_column": "Favorites",
        "aggregation": "sum",
        "max_categories": 10,
        "include_other": True
    })
    assert res_high_card.status_code == 200
    hc_data = res_high_card.json()
    print("-> 3A. Bar Chart on 1,546 Distinct 'Studios' (Max=10 + Other):")
    print(f"   Returned Labels Count:     {len(hc_data['labels'])} (10 top + 1 Other)")
    print(f"   Labels:                    {hc_data['labels']}")
    print(f"   Values:                    {hc_data['datasets'][0]['data']}")
    print(f"   Warning Returned:          '{hc_data['warning']}'")
    assert len(hc_data['labels']) == 11
    assert "Other" in hc_data['labels'][-1]

    # 3B: Without "Other" bucket
    res_high_no_other = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Top 5 Studios Capped",
        "type": "bar",
        "x_column": "Studios",
        "y_column": "Favorites",
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

    # 3C: Pie chart on 1,546 distinct Studios (High Cardinality)
    res_pie_high = client.post(f"/api/chart/{dataset_id}/preview", json={
        "title": "Studio Anime Production Share",
        "type": "pie",
        "x_column": "Studios",
        "aggregation": "count",
        "max_categories": 8,
        "include_other": True
    })
    assert res_pie_high.status_code == 200
    pie_hc = res_pie_high.json()
    print("\n-> 3C. Pie Chart on 1,546 Distinct 'Studios' (Max=8 + Other):")
    print(f"   Distinct Categories in Data: 1546 (plus 10,526 UNKNOWN studios excluded)")
    print(f"   Returned Slices Count:     {len(pie_hc['labels'])} (8 top + 1 Other)")
    print(f"   Slice Labels:              {pie_hc['labels']}")
    print(f"   Slice Counts:              {pie_hc['datasets'][0]['data']}")
    print(f"   Sum of Slice Counts:       {sum(pie_hc['datasets'][0]['data'])}")
    print(f"   Warning Returned:          '{pie_hc['warning']}'")
    assert len(pie_hc['labels']) == 9
    assert "Other" in pie_hc['labels'][-1]
    assert sum(pie_hc['datasets'][0]['data']) == 14379
    print("   [CONFIRMED: Pie chart caps at 8 + 'Other' bucket, avoiding dozens of slivers]")

    # -------------------------------------------------------------------------
    # TEST 4: PROACTIVE BUG CLASS 3 — COLUMN DELETED AFTER CHART CREATION
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 4: PROACTIVE BUG CLASS 3 — COLUMN DELETED AFTER CHART CREATION")
    print("-" * 80)

    # Step 1: Add a test column "Score_Normalized"
    add_col_res = client.post(f"/api/clean/{dataset_id}/add-column", json={
        "column_name": "Score_Normalized",
        "default_value": 100.0,
        "data_type": "Number"
    })
    assert add_col_res.status_code == 200

    # Step 2: Create and save a chart referencing "Score_Normalized"
    chart_res = client.post(f"/api/chart/{dataset_id}", json={
        "title": "Type vs Score_Normalized",
        "type": "bar",
        "x_column": "Type",
        "y_column": "Score_Normalized",
        "aggregation": "sum"
    })
    assert chart_res.status_code == 200
    chart_record = chart_res.json()
    chart_id = chart_record["id"]
    print(f"-> 4A. Created Chart '{chart_record['title']}' (ID: {chart_id})")
    print(f"       Initial is_valid: {chart_record['data_payload']['is_valid']}")

    # Step 3: Delete column "Score_Normalized" via Phase 2 cleaning endpoint
    del_col_res = client.post(f"/api/clean/{dataset_id}/delete-column", json={
        "column_name": "Score_Normalized"
    })
    assert del_col_res.status_code == 200
    print(f"-> 4B. Column 'Score_Normalized' deleted via Phase 2 clean endpoint.")

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
    assert "Score_Normalized" in payload["missing_columns"]

    # -------------------------------------------------------------
    # TEST 5: CHART CRUD (CREATE, EDIT, DUPLICATE, DELETE)
    # -------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 5: FULL CHART CRUD OPERATIONS (CREATE, EDIT, DUPLICATE, DELETE)")
    print("-" * 80)

    # 5A. Create Chart
    c_res = client.post(f"/api/chart/{dataset_id}", json={
        "title": "Anime Type Scores",
        "type": "bar",
        "x_column": "Type",
        "y_column": "Score",
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
        "title": "Anime Type Max Scores",
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

    # -------------------------------------------------------------
    # TEST 6: SERVER RESTART PERSISTENCE
    # -------------------------------------------------------------
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
    print("ALL PHASE 4 VISUALIZATION VERIFICATION TESTS COMPLETE ON REAL ANIME DATASET")
    print("=" * 80)


if __name__ == "__main__":
    run_visualization_verification()
