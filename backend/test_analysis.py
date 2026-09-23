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

    # 0. Load real anime demo dataset
    load_res = client.post("/api/samples/anime_dataset/load")
    assert load_res.status_code == 200, f"Demo load failed: {load_res.text}"
    dataset_id = load_res.json()["id"]
    print(f"\n[INIT] Loaded real test dataset 'anime-dataset-2023.csv' -> ID: {dataset_id}")
    print(f"       Rows: {load_res.json()['row_count']}, Columns: {load_res.json()['column_count']}")


    # -------------------------------------------------------------------------
    # TEST 1: Column Statistics Calculation (Full Profile on Real Numeric Columns)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 1: COLUMN STATISTICS (FULL PROFILE ON REAL NUMERIC COLUMNS)")
    print("-" * 80)

    # 1A. Full profile on 'Popularity' (Complete column, 0 nulls)
    res_pop = client.post(f"/api/analysis/{dataset_id}/stats", json={"column": "Popularity"})
    assert res_pop.status_code == 200, f"Stats failed: {res_pop.text}"
    stats_pop = res_pop.json()
    print("-> Column: 'Popularity' (Data Type: Number, 0 nulls)")
    print(f"   Total Count:     {stats_pop['total_count']}")
    print(f"   Non-Null Count:  {stats_pop['non_null_count']}")
    print(f"   Null Count:      {stats_pop['null_count']}")
    print(f"   SUM:             {stats_pop['stats']['sum']}")
    print(f"   AVG / MEAN:      {stats_pop['stats']['avg']}")
    print(f"   MIN:             {stats_pop['stats']['min']}")
    print(f"   MAX:             {stats_pop['stats']['max']}")
    print(f"   MEDIAN:          {stats_pop['stats']['median']}")
    print(f"   STD DEV:         {stats_pop['stats']['std']}")
    assert stats_pop['total_count'] == 24905
    assert stats_pop['stats']['min'] == 0.0

    # 1B. Full profile on 'Score' (Real column with 9,213 natural nulls)
    res_score = client.post(f"/api/analysis/{dataset_id}/stats", json={"column": "Score"})
    assert res_score.status_code == 200, f"Stats failed: {res_score.text}"
    stats_score = res_score.json()
    print("\n-> Column: 'Score' (Data Type: Number, Natural Nulls: 9,213)")
    print(f"   Total Count:     {stats_score['total_count']}")
    print(f"   Non-Null Count:  {stats_score['non_null_count']}")
    print(f"   Null Count:      {stats_score['null_count']}")
    print(f"   SUM:             {stats_score['stats']['sum']}")
    print(f"   AVG / MEAN:      {stats_score['stats']['avg']}")
    print(f"   MIN:             {stats_score['stats']['min']}")
    print(f"   MAX:             {stats_score['stats']['max']}")
    print(f"   MEDIAN:          {stats_score['stats']['median']}")
    print(f"   STD DEV:         {stats_score['stats']['std']}")
    assert stats_score['non_null_count'] == 15692
    assert stats_score['null_count'] == 9213
    assert stats_score['stats']['avg'] == 6.3809

    # 1C. Specific operation request: SUM on 'Members'
    res_mem = client.post(f"/api/analysis/{dataset_id}/stats", json={"column": "Members", "operation": "sum"})
    assert res_mem.status_code == 200
    mem_data = res_mem.json()
    print(f"\n-> Specific Operation Request: SUM on 'Members' -> Result = {mem_data['stats']['sum']}")
    print(f"   Message: '{mem_data['message']}'")
    assert mem_data['stats']['sum'] == 924099029.0

    # -------------------------------------------------------------------------
    # TEST 2: Stats Edge Cases (All-Null, Single-Row, Non-Numeric, Partially-Null)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 2: STATS EDGE CASES (NATURAL OCCURRENCES & LABELED SYNTHETICS)")
    print("-" * 80)

    # Edge Case 2A: All-Null column (Genuinely absent in anime-dataset-2023, labeled as synthetic)
    df_active = session_store.get_dataset(dataset_id).copy()
    df_active["_Synthetic_All_Null"] = None
    summary_null = data_engine.generate_summary(df_active, "anime-dataset-2023.csv", 1000, dataset_id)
    session_store.update_dataset(dataset_id, df_active, summary_null)

    res_null = client.post(f"/api/analysis/{dataset_id}/stats", json={"column": "_Synthetic_All_Null"})
    print("-> 2A. [SYNTHETIC EDGE CASE] All-Null Column (Genuinely absent in real dataset):")
    print(f"   Status Code:     {res_null.status_code}")
    print(f"   Total Count:     {res_null.json()['total_count']}")
    print(f"   Non-Null Count:  {res_null.json()['non_null_count']}")
    print(f"   Null Count:      {res_null.json()['null_count']}")
    print(f"   Message:         '{res_null.json()['message']}'")
    print(f"   Stats Object:    {res_null.json()['stats']}")
    assert res_null.json()['null_count'] == 24905
    assert res_null.json()['stats']['sum'] is None

    # Edge Case 2B: Single-Row Dataset Std Calculation (Subset of real row #1, labeled as synthetic)
    df_single = df_active.head(1).copy()
    single_id = "real_anime_single_row"
    summary_single = data_engine.generate_summary(df_single, "single_row.csv", 100, single_id)
    session_store.set_dataset(single_id, df_single, summary_single, "single_row.csv")

    res_single = client.post(f"/api/analysis/{single_id}/stats", json={"column": "Score"})
    print("\n-> 2B. [SYNTHETIC EDGE CASE] Single-Row Subset (N=1 Std Calculation on Row #1 'Cowboy Bebop'):")
    print(f"   Status Code:     {res_single.status_code}")
    print(f"   Total Count:     {res_single.json()['total_count']}")
    print(f"   Score Value:     {res_single.json()['stats']['sum']}")
    print(f"   Calculated STD:  {res_single.json()['stats']['std']} (Safely handled, zero instead of NaN)")
    assert res_single.json()['stats']['std'] == 0.0

    # Edge Case 2C: Non-Numeric Column in Numeric Stats Operation (Real column 'Type')
    res_invalid = client.post(f"/api/analysis/{dataset_id}/stats", json={"column": "Type", "operation": "sum"})
    print("\n-> 2C. Non-Numeric Column in Numeric Operation (SUM on 'Type'):")
    print(f"   Status Code:     {res_invalid.status_code} (Properly blocked)")
    print(f"   Error Detail:    '{res_invalid.json().get('detail')}'")
    assert res_invalid.status_code == 400

    # Edge Case 2D: Real Partially-Null Column Dtype Conversion & Math Denominator Verification
    # 'Score' column naturally has 15,692 numbers and 9,213 UNKNOWN values (36.99% data loss)
    # 1. First test conversion from Text to Number on a text column with >30% non-numeric values
    # In raw dataset, 'Rank' has 18.52% UNKNOWN, 'Score' has 36.99% UNKNOWN
    # We test pre-conversion safety check blocking on raw 'Score' text representation:
    df_active["_Score_Text_Copy"] = df_active["Score"].astype(str)
    # Put back UNKNOWN for the NaNs to test real conversion
    df_active["_Score_Text_Copy"] = df_active["_Score_Text_Copy"].replace("nan", "UNKNOWN")
    summary_mixed = data_engine.generate_summary(df_active, "anime-dataset-2023.csv", 1000, dataset_id)
    session_store.update_dataset(dataset_id, df_active, summary_mixed)

    blocked_conv = client.post(f"/api/clean/{dataset_id}/convert-dtype", json={
        "column_name": "_Score_Text_Copy",
        "target_type": "Number",
        "force": False
    })
    print("\n-> 2D. Partially-Null Column (Real Data Conversion & Null-Exclusion Verification):")
    print(f"   [Phase 2 Safety Pre-Check]: Without force=True -> Blocked with HTTP {blocked_conv.status_code}")
    print(f"   Blocked Error Message:     '{blocked_conv.json().get('detail')}'")
    assert blocked_conv.status_code == 400

    # 2. Proceed with force=True
    forced_conv = client.post(f"/api/clean/{dataset_id}/convert-dtype", json={
        "column_name": "_Score_Text_Copy",
        "target_type": "Number",
        "force": True
    })
    assert forced_conv.status_code == 200
    conv_json = forced_conv.json()
    print(f"   [Phase 2 Conversion]:      With force=True -> Succeeded")
    print(f"   Message:                   '{conv_json['message']}'")
    print(f"   Data Loss Flagged:         {conv_json['success_with_data_loss']}")
    print(f"   Nulled Count:              {conv_json['nulled_count']} / 24905 ({conv_json['nulled_percentage']}%)")
    assert conv_json['success_with_data_loss'] is True
    assert conv_json['nulled_count'] == 9213

    # 3. Calculate stats on converted column
    res_pnull = client.post(f"/api/analysis/{dataset_id}/stats", json={"column": "_Score_Text_Copy"})
    assert res_pnull.status_code == 200
    pnull_stats = res_pnull.json()
    
    total_rows = pnull_stats["total_count"]
    non_null_rows = pnull_stats["non_null_count"]
    null_rows = pnull_stats["null_count"]
    calc_sum = pnull_stats["stats"]["sum"]
    calc_avg = pnull_stats["stats"]["avg"]
    calc_median = pnull_stats["stats"]["median"]

    print(f"\n   [Phase 3 Stats on Partially-Null Real Column]:")
    print(f"   Total Rows in Dataset:     {total_rows}")
    print(f"   Non-Null Count:            {non_null_rows} (used in denominator)")
    print(f"   Null Count (Excluded):     {null_rows} (36.99% of rows)")
    print(f"   Calculated SUM:            {calc_sum}")
    print(f"   Calculated AVG:            {calc_avg}")
    print(f"   Calculated MEDIAN:         {calc_median}")

    # Mathematical Proof
    expected_mean = round(calc_sum / non_null_rows, 4)
    print(f"\n   [Mathematical Denominator & Null-Exclusion Verification]:")
    print(f"   Sum / Non-Null Count:      {calc_sum} / {non_null_rows} = {expected_mean}")
    print(f"   Reported API AVG:          {calc_avg}")
    print(f"   -> Exact Match: {expected_mean == calc_avg} (Confirmed: denominator is {non_null_rows}, NOT {total_rows})")

    zero_filled_mean = round(calc_sum / total_rows, 4)
    print(f"   If nulls were counted as 0: {calc_sum} / {total_rows} = {zero_filled_mean}")
    print(f"   -> Null exclusion proven: {calc_avg} != {zero_filled_mean} (Nulls are omitted, NOT treated as zero)")
    assert expected_mean == calc_avg
    assert calc_avg != zero_filled_mean

    # -------------------------------------------------------------------------
    # TEST 3: Group By Aggregation (Real Multi-Column & Single-Column)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 3: GROUP BY AGGREGATION (REAL ANIME CATEGORIES)")
    print("-" * 80)

    # 3A. Group By: ['Type'] | Aggregation: AVG('Score')
    res_gb_single = client.post(f"/api/analysis/{dataset_id}/groupby", json={
        "group_by": ["Type"],
        "value_column": "Score",
        "aggregation": "avg"
    })
    assert res_gb_single.status_code == 200, res_gb_single.text
    gb_single_data = res_gb_single.json()
    print("-> 3A. Group By: ['Type'] | Aggregation: AVG('Score'):")
    print(f"   Total Groups: {gb_single_data['total_groups']}")
    for r in gb_single_data['rows']:
        print(f"     Type: {str(r.get('Type')):<8} | Score_AVG: {r.get('Score_AVG')}")
    assert gb_single_data['total_groups'] >= 6

    # 3B. Multi-column Group By: ['Type', 'Rating'] | Aggregation: SUM('Members')
    res_gb_multi = client.post(f"/api/analysis/{dataset_id}/groupby", json={
        "group_by": ["Type", "Rating"],
        "value_column": "Members",
        "aggregation": "sum"
    })
    assert res_gb_multi.status_code == 200, res_gb_multi.text
    gb_multi_data = res_gb_multi.json()
    print(f"\n-> 3B. Group By: ['Type', 'Rating'] | Aggregation: SUM('Members'):")
    print(f"   Total Groups: {gb_multi_data['total_groups']}")
    print("   Sample Groups:")
    for r in gb_multi_data['rows'][:5]:
        print(f"     Type: {str(r.get('Type')):<8} | Rating: {str(r.get('Rating')):<30} | Members_SUM: {r.get('Members_SUM')}")

    # -------------------------------------------------------------------------
    # TEST 4: Group By High-Cardinality Protection (Real Column 'Studios')
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 4: GROUP BY HIGH-CARDINALITY PROTECTION (REAL COLUMN 'Studios')")
    print("-" * 80)

    res_gb_high = client.post(f"/api/analysis/{dataset_id}/groupby", json={
        "group_by": ["Studios"],
        "value_column": "Favorites",
        "aggregation": "sum"
    })
    assert res_gb_high.status_code == 200, res_gb_high.text
    gb_high_data = res_gb_high.json()
    print("-> Group By High-Cardinality Column: 'Studios' (1,546 distinct studios in anime dataset)")
    print(f"   Reported Total Groups in Dataset: {gb_high_data['total_groups']}")
    print(f"   Returned Rows Count (Capped):     {len(gb_high_data['rows'])}")
    print(f"   Warning Returned:                 '{gb_high_data['warning']}'")
    print(f"   Top Studio Sample:                 {gb_high_data['rows'][0]}")
    assert gb_high_data['total_groups'] == 1547
    assert len(gb_high_data['rows']) == 500
    assert "High cardinality detected" in gb_high_data['warning']

    # -------------------------------------------------------------------------
    # TEST 5: Pivot Table Matrix Generation
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 5: PIVOT TABLE MATRIX GENERATION (REAL ANIME DIMENSIONS)")
    print("-" * 80)

    res_pivot = client.post(f"/api/analysis/{dataset_id}/pivot", json={
        "index": ["Type"],
        "columns": ["Rating"],
        "values": "Score",
        "aggregation": "avg",
        "fill_value": 0.0
    })
    assert res_pivot.status_code == 200, res_pivot.text
    pivot_data = res_pivot.json()
    print("-> Pivot Matrix: Rows=['Type'] × Cols=['Rating'] | Values=AVG('Score')")
    print(f"   Index Columns: {pivot_data['index_columns']}")
    print(f"   All Columns:   {pivot_data['columns']}")
    print(f"   Total Rows:    {len(pivot_data['rows'])}")
    print("\n   Actual Pivot Table Matrix (First 3 Rows):")
    for r in pivot_data['rows'][:3]:
        print(f"     Type: {str(r.get('Type')):<8} | PG-13: {r.get('PG-13 - Teens 13 or older', 0.0)} | G: {r.get('G - All Ages', 0.0)} | R: {r.get('R - 17+ (violence & profanity)', 0.0)}")
    assert len(pivot_data['rows']) >= 6

    # -------------------------------------------------------------------------
    # TEST 6: Pivot Table High-Cardinality Protection (Real 'Studios' as Cols)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 6: PIVOT TABLE HIGH-CARDINALITY PROTECTION")
    print("-" * 80)

    res_pivot_high = client.post(f"/api/analysis/{dataset_id}/pivot", json={
        "index": ["Type"],
        "columns": ["Studios"],
        "values": "Members",
        "aggregation": "sum"
    })
    assert res_pivot_high.status_code == 200, res_pivot_high.text
    ph_data = res_pivot_high.json()
    print("-> Pivot High-Cardinality Check (Studios as columns — 1,546 studios):")
    print(f"   Total Columns Returned: {len(ph_data['columns'])} (Capped at 50 + index col)")
    print(f"   Warning Returned:       '{ph_data['warning']}'")
    assert len(ph_data['columns']) == 51
    assert "High cardinality detected" in ph_data['warning']

    # -------------------------------------------------------------------------
    # TEST 7: CSV Export Capabilities (Real Anime Analysis Data)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("TEST 7: CSV EXPORT CAPABILITIES (REAL ANIME ANALYSIS DATA)")
    print("-" * 80)

    res_exp_gb = client.post(f"/api/analysis/{dataset_id}/export-groupby", json={
        "group_by": ["Type"],
        "value_column": "Score",
        "aggregation": "avg"
    })
    assert res_exp_gb.status_code == 200, res_exp_gb.text
    gb_csv_lines = res_exp_gb.content.decode("utf-8").strip().split("\n")
    print("-> GroupBy Export CSV (First 4 lines):")
    for line in gb_csv_lines[:4]:
        print(f"   {line.strip()}")

    res_exp_pv = client.post(f"/api/analysis/{dataset_id}/export-pivot", json={
        "index": ["Type"],
        "columns": ["Rating"],
        "values": "Score",
        "aggregation": "avg"
    })
    assert res_exp_pv.status_code == 200, res_exp_pv.text
    pv_csv_lines = res_exp_pv.content.decode("utf-8").strip().split("\n")
    print("\n-> Pivot Table Export CSV (First 3 lines):")
    for line in pv_csv_lines[:3]:
        print(f"   {line.strip()}")

    print("\n" + "=" * 80)
    print("ALL PHASE 3 ANALYSIS TESTS COMPLETE ON REAL ANIME DATASET")
    print("=" * 80)

if __name__ == "__main__":
    run_verification()
