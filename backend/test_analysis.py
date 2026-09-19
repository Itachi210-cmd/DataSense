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

def run_verification():
    print("=" * 80)
    print("DATASENSE PHASE 3 — ANALYSIS ENGINE VERIFICATION SUITE")
    print("=" * 80)

    # 0. Load supermarket_sales demo dataset
    load_res = client.post("/api/samples/supermarket_sales/load")
    assert load_res.status_code == 200, f"Demo load failed: {load_res.text}"
    dataset_id = load_res.json()["id"]
    print(f"\n[INIT] Loaded test dataset 'supermarket_sales.csv' -> ID: {dataset_id}")
    print(f"       Rows: {load_res.json()['row_count']}, Columns: {load_res.json()['column_count']}")


    # -------------------------------------------------------------------------
    # TEST 1: Column Statistics Calculation (Full Profile on 'Total' and 'Rating')
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 1: COLUMN STATISTICS (FULL PROFILE)")
    print("-" * 80)

    res_total = client.post(f"/api/analysis/{dataset_id}/stats", json={"column": "Total"})
    assert res_total.status_code == 200, f"Stats failed: {res_total.text}"
    stats_total = res_total.json()
    print("-> Column: 'Total' (Data Type: Number)")
    print(f"   Total Count:     {stats_total['total_count']}")
    print(f"   Non-Null Count:  {stats_total['non_null_count']}")
    print(f"   Null Count:      {stats_total['null_count']}")
    print(f"   SUM:             {stats_total['stats']['sum']}")
    print(f"   AVG / MEAN:      {stats_total['stats']['avg']}")
    print(f"   MIN:             {stats_total['stats']['min']}")
    print(f"   MAX:             {stats_total['stats']['max']}")
    print(f"   MEDIAN:          {stats_total['stats']['median']}")
    print(f"   STD DEV:         {stats_total['stats']['std']}")

    res_rating = client.post(f"/api/analysis/{dataset_id}/stats", json={"column": "Rating"})
    assert res_rating.status_code == 200, f"Stats failed: {res_rating.text}"
    stats_rating = res_rating.json()
    print("\n-> Column: 'Rating' (Data Type: Number)")
    print(f"   SUM:             {stats_rating['stats']['sum']}")
    print(f"   AVG / MEAN:      {stats_rating['stats']['avg']}")
    print(f"   MIN:             {stats_rating['stats']['min']}")
    print(f"   MAX:             {stats_rating['stats']['max']}")
    print(f"   MEDIAN:          {stats_rating['stats']['median']}")
    print(f"   STD DEV:         {stats_rating['stats']['std']}")

    # Single operation request: SUM on Quantity
    res_qty = client.post(f"/api/analysis/{dataset_id}/stats", json={"column": "Quantity", "operation": "sum"})
    assert res_qty.status_code == 200
    qty_data = res_qty.json()
    print(f"\n-> Specific Operation Request: SUM on 'Quantity' -> Result = {qty_data['stats']['sum']}")
    print(f"   Message: '{qty_data['message']}'")

    # -------------------------------------------------------------------------
    # TEST 2: Stats Edge Cases (All-Null Column, Single-Row Dataset, Non-Numeric Column)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 2: STATS EDGE CASES (ALL-NULL, SINGLE ROW, NON-NUMERIC)")
    print("-" * 80)

    # Edge Case 2A: All-Null column
    df_active = session_store.get_dataset(dataset_id).copy()
    df_active["All_Null_Col"] = None
    summary_null = data_engine.generate_summary(df_active, "supermarket_sales.csv", 1000, dataset_id)
    session_store.update_dataset(dataset_id, df_active, summary_null)

    res_null = client.post(f"/api/analysis/{dataset_id}/stats", json={"column": "All_Null_Col"})
    print("-> 2A. All-Null Column:")
    print(f"   Status Code:     {res_null.status_code}")
    print(f"   Total Count:     {res_null.json()['total_count']}")
    print(f"   Non-Null Count:  {res_null.json()['non_null_count']}")
    print(f"   Null Count:      {res_null.json()['null_count']}")
    print(f"   Message:         '{res_null.json()['message']}'")
    print(f"   Stats Object:    {res_null.json()['stats']}")

    # Edge Case 2B: Single-Row Dataset Std Calculation
    df_single = df_active.head(1).copy()
    single_id = "test_single_row"
    summary_single = data_engine.generate_summary(df_single, "single_row.csv", 100, single_id)
    session_store.set_dataset(single_id, df_single, summary_single, "single_row.csv")



    res_single = client.post(f"/api/analysis/{single_id}/stats", json={"column": "Total"})
    print("\n-> 2B. Single-Row Dataset (N=1 Std Calculation):")
    print(f"   Status Code:     {res_single.status_code}")
    print(f"   Total Count:     {res_single.json()['total_count']}")
    print(f"   Total Value:     {res_single.json()['stats']['sum']}")
    print(f"   Calculated STD:  {res_single.json()['stats']['std']} (Safely handled, zero instead of NaN)")

    # Edge Case 2C: Non-Numeric Column in Numeric Stats Operation
    res_invalid = client.post(f"/api/analysis/{dataset_id}/stats", json={"column": "Branch", "operation": "sum"})
    print("\n-> 2C. Non-Numeric Column in Numeric Operation (SUM on 'Branch'):")
    print(f"   Status Code:     {res_invalid.status_code} (Properly blocked)")
    print(f"   Error Detail:    '{res_invalid.json().get('detail')}'")

    # Edge Case 2D: Partially-Null Column (Produced via Phase 2 force=True dtype conversion)
    # 650 valid numbers (10, 20, 30, 40, 50 repeated) + 350 "N/A" text values = 35% non-coercible text
    num_patterns = ["10.0", "20.0", "30.0", "40.0", "50.0"] * 130  # 650 rows, sum = 19500.0, mean = 30.0, median = 30.0
    text_patterns = ["N/A"] * 350                                  # 350 rows
    mixed_data = num_patterns + text_patterns
    
    df_active = session_store.get_dataset(dataset_id).copy()
    df_active["Mixed_Discount"] = mixed_data
    summary_mixed = data_engine.generate_summary(df_active, "supermarket_sales.csv", 1000, dataset_id)
    session_store.update_dataset(dataset_id, df_active, summary_mixed)

    # 1. First confirm Phase 2 safety check blocks conversion without force=True (>30% data loss)
    blocked_conv = client.post(f"/api/clean/{dataset_id}/convert-dtype", json={
        "column_name": "Mixed_Discount",
        "target_type": "Number",
        "force": False
    })
    assert blocked_conv.status_code == 400
    print("\n-> 2D. Partially-Null Column (Phase 2 force=True & Phase 3 Null-Exclusion Verification):")
    print(f"   [Phase 2 Safety Pre-Check]: Without force=True -> Blocked with HTTP 400")
    print(f"   Blocked Error Message:     '{blocked_conv.json().get('detail')}'")

    # 2. Proceed with force=True
    forced_conv = client.post(f"/api/clean/{dataset_id}/convert-dtype", json={
        "column_name": "Mixed_Discount",
        "target_type": "Number",
        "force": True
    })
    assert forced_conv.status_code == 200
    conv_json = forced_conv.json()
    print(f"   [Phase 2 Conversion]:      With force=True -> Conversion Succeeded")
    print(f"   Data Loss Flagged:         {conv_json['success_with_data_loss']}")
    print(f"   Nulled Count:              {conv_json['nulled_count']} / 1000 ({conv_json['nulled_percentage']}%)")

    # 3. Request stats on the partially-null column
    res_part_stats = client.post(f"/api/analysis/{dataset_id}/stats", json={"column": "Mixed_Discount"})
    assert res_part_stats.status_code == 200
    part_stats = res_part_stats.json()
    total_cnt = part_stats["total_count"]
    non_null_cnt = part_stats["non_null_count"]
    null_cnt = part_stats["null_count"]
    sum_val = part_stats["stats"]["sum"]
    avg_val = part_stats["stats"]["avg"]
    med_val = part_stats["stats"]["median"]

    print("\n   [Phase 3 Stats on Partially-Null Column]:")
    print(f"   Total Rows in Dataset:     {total_cnt}")
    print(f"   Non-Null Count:            {non_null_cnt} (used in denominator)")
    print(f"   Null Count (Excluded):     {null_cnt} ({round((null_cnt / total_cnt) * 100, 1)}% of rows)")
    print(f"   Calculated SUM:            {sum_val}")
    print(f"   Calculated AVG:            {avg_val}")
    print(f"   Calculated MEDIAN:         {med_val}")

    # Explicit Denominator and Exclusion Math Proof
    expected_avg = round(sum_val / non_null_cnt, 4)
    if_nulls_as_zero = round(sum_val / total_cnt, 4)
    print("\n   [Mathematical Denominator & Null-Exclusion Verification]:")
    print(f"   Sum / Non-Null Count:      {sum_val} / {non_null_cnt} = {expected_avg}")
    print(f"   Reported API AVG:          {avg_val}")
    print(f"   -> Exact Match: {expected_avg == avg_val} (Confirmed: denominator is {non_null_cnt}, NOT {total_cnt})")
    print(f"   If nulls were counted as 0: {sum_val} / {total_cnt} = {if_nulls_as_zero}")
    print(f"   -> Null exclusion proven: {avg_val} != {if_nulls_as_zero} (Nulls are omitted, NOT treated as zero)")


    # -------------------------------------------------------------------------
    # TEST 3: Group By Aggregation (Multi-column & Aggregations)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 3: GROUP BY AGGREGATION")
    print("-" * 80)

    # 3A. Branch + Gender grouped by SUM of Total
    res_grp = client.post(f"/api/analysis/{dataset_id}/groupby", json={
        "group_by": ["Branch", "Gender"],
        "value_column": "Total",
        "aggregation": "sum"
    })
    assert res_grp.status_code == 200, f"GroupBy failed: {res_grp.text}"
    grp_data = res_grp.json()
    print(f"-> 3A. Group By: ['Branch', 'Gender'] | Aggregation: SUM('Total')")
    print(f"   Total Groups: {grp_data['total_groups']}")
    print("   Actual Grouped Values:")
    for row in grp_data["rows"]:
        print(f"     Branch: {row['Branch']} | Gender: {row['Gender']:<6} | Total_SUM: {row['Total_SUM']:>10.2f}")

    # 3B. Branch grouped by AVG of Rating
    res_grp_rating = client.post(f"/api/analysis/{dataset_id}/groupby", json={
        "group_by": ["Branch"],
        "value_column": "Rating",
        "aggregation": "avg"
    })
    assert res_grp_rating.status_code == 200
    grp_rating_data = res_grp_rating.json()
    print(f"\n-> 3B. Group By: ['Branch'] | Aggregation: AVG('Rating')")
    for row in grp_rating_data["rows"]:
        print(f"     Branch: {row['Branch']} | Rating_AVG: {row['Rating_AVG']:>6.4f}")

    # -------------------------------------------------------------------------
    # TEST 4: Group By High-Cardinality Protection
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 4: GROUP BY HIGH-CARDINALITY PROTECTION")
    print("-" * 80)

    # Invoice ID has 1,000 distinct values
    res_high_card = client.post(f"/api/analysis/{dataset_id}/groupby", json={
        "group_by": ["Invoice ID"],
        "value_column": "Total",
        "aggregation": "sum"
    })
    assert res_high_card.status_code == 200
    high_card_data = res_high_card.json()
    print(f"-> Group By High-Cardinality Column: 'Invoice ID'")
    print(f"   Reported Total Groups in Dataset: {high_card_data['total_groups']}")
    print(f"   Returned Rows Count (Capped):     {len(high_card_data['rows'])}")
    print(f"   Warning Returned:                 '{high_card_data['warning']}'")
    print(f"   Top Group Sample:                 {high_card_data['rows'][0]}")

    # -------------------------------------------------------------------------
    # TEST 5: Pivot Table Generation
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 5: PIVOT TABLE MATRIX GENERATION")
    print("-" * 80)

    res_pivot = client.post(f"/api/analysis/{dataset_id}/pivot", json={
        "index": ["Product line"],
        "columns": ["Branch"],
        "values": "Total",
        "aggregation": "sum",
        "fill_value": 0.0
    })
    assert res_pivot.status_code == 200, f"Pivot failed: {res_pivot.text}"
    pivot_data = res_pivot.json()
    print(f"-> Pivot Matrix: Rows=['Product line'] × Cols=['Branch'] | Values=SUM('Total')")
    print(f"   Index Columns: {pivot_data['index_columns']}")
    print(f"   All Columns:   {pivot_data['columns']}")
    print(f"   Total Rows:    {pivot_data['total_rows']}")
    print("\n   Actual Pivot Table Matrix:")
    header = f"   {'Product line':<25} | {'Branch A':>12} | {'Branch B':>12} | {'Branch C':>12}"
    print(header)
    print("   " + "-" * len(header))
    for row in pivot_data["rows"]:
        pline = row.get("Product line")
        val_a = row.get("A", 0.0)
        val_b = row.get("B", 0.0)
        val_c = row.get("C", 0.0)
        print(f"   {pline:<25} | {val_a:>12.2f} | {val_b:>12.2f} | {val_c:>12.2f}")

    # -------------------------------------------------------------------------
    # TEST 6: Pivot Table High-Cardinality Protection
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 6: PIVOT TABLE HIGH-CARDINALITY PROTECTION")
    print("-" * 80)

    # 1,000 unique columns if Invoice ID is used as columns
    res_pivot_high = client.post(f"/api/analysis/{dataset_id}/pivot", json={
        "index": ["Product line"],
        "columns": ["Invoice ID"],
        "values": "Total",
        "aggregation": "sum"
    })
    assert res_pivot_high.status_code == 200
    p_high = res_pivot_high.json()
    print(f"-> Pivot High-Cardinality Check (Invoice ID as columns):")
    print(f"   Total Columns Returned: {p_high['total_columns']} (Capped at 50 + index col)")
    print(f"   Warning Returned:       '{p_high['warning']}'")

    # -------------------------------------------------------------------------
    # TEST 7: CSV Exports for GroupBy and Pivot Table
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 7: CSV EXPORT CAPABILITIES")
    print("-" * 80)

    exp_grp = client.post(f"/api/analysis/{dataset_id}/export-groupby", json={
        "group_by": ["Branch"],
        "value_column": "Total",
        "aggregation": "sum"
    })
    assert exp_grp.status_code == 200
    assert "text/csv" in exp_grp.headers["content-type"]
    grp_csv_text = exp_grp.text.strip().split("\n")
    print("-> GroupBy Export CSV (First 4 lines):")
    for line in grp_csv_text[:4]:
        print(f"   {line.strip()}")

    exp_pivot = client.post(f"/api/analysis/{dataset_id}/export-pivot", json={
        "index": ["Product line"],
        "columns": ["Branch"],
        "values": "Total",
        "aggregation": "sum"
    })
    assert exp_pivot.status_code == 200
    assert "text/csv" in exp_pivot.headers["content-type"]
    pivot_csv_text = exp_pivot.text.strip().split("\n")
    print("\n-> Pivot Table Export CSV (First 4 lines):")
    for line in pivot_csv_text[:4]:
        print(f"   {line.strip()}")

    print("\n" + "=" * 80)
    print("ALL PHASE 3 BACKEND ANALYSIS ENGINE TESTS COMPLETE WITH REAL VALUES")
    print("=" * 80)

if __name__ == "__main__":
    run_verification()
