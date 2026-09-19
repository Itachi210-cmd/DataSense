const http = require("http");

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} from ${url}: ${text}`);
  }
  return response.json();
}

async function runIntegrationTest() {
  console.log("=== RUNNING FULL END-TO-END INTEGRATION TEST ===");

  // 1. Check FastAPI Backend Health
  console.log("\n1. Testing FastAPI Backend (/health)...");
  const health = await fetchJson("http://localhost:8000/health");
  console.log("   [OK] FastAPI Status:", health);

  // 2. Check Next.js Datasets API (Prisma SQLite)
  console.log("\n2. Testing Next.js Prisma API (/api/datasets)...");
  const initialDatasets = await fetchJson("http://localhost:3000/api/datasets");
  console.log(`   [OK] Initial Persisted Datasets in SQLite: ${initialDatasets.length} records`);

  // 3. Load Demo Dataset via FastAPI
  console.log("\n3. Loading Demo Dataset (supermarket_sales)...");
  const sampleLoad = await fetchJson("http://localhost:8000/api/samples/supermarket_sales/load", {
    method: "POST"
  });
  console.log(`   [OK] Dataset Loaded in FastAPI: ID=${sampleLoad.id}, Name=${sampleLoad.name}, Rows=${sampleLoad.row_count}, Cols=${sampleLoad.column_count}`);

  // 4. Persist Dataset Metadata to Prisma SQLite via Next.js API
  console.log("\n4. Persisting Dataset Record to SQLite via Next.js API (/api/datasets)...");
  const savedRecord = await fetchJson("http://localhost:3000/api/datasets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: sampleLoad.id,
      name: sampleLoad.name,
      fileType: sampleLoad.file_type,
      rowCount: sampleLoad.row_count,
      columnCount: sampleLoad.column_count,
    })
  });
  console.log("   [OK] Prisma SQLite Saved Record:", savedRecord);

  // 5. Query Persisted Datasets to verify SQLite persistence
  console.log("\n5. Querying Persisted Datasets from SQLite (/api/datasets)...");
  const recentDatasets = await fetchJson("http://localhost:3000/api/datasets");
  console.log(`   [OK] Total Recent Datasets in SQLite: ${recentDatasets.length}`);
  const found = recentDatasets.find(d => d.id === sampleLoad.id);
  if (!found) throw new Error("Dataset was not found in SQLite query!");
  console.log(`   [OK] Verified '${found.name}' exists in SQLite database with ${found.rowCount} rows.`);

  // 6. Test Preview endpoint on FastAPI
  console.log("\n6. Testing Paginated Spreadsheet Preview (/api/dataset/{id}/preview)...");
  const preview = await fetchJson(`http://localhost:8000/api/dataset/${sampleLoad.id}/preview?page=1&page_size=5`);
  console.log(`   [OK] Preview returned ${preview.rows.length} rows (Total: ${preview.total_rows} rows, ${preview.total_pages} pages)`);
  console.log("   [OK] Row 1 Index:", preview.rows[0]._row_index);
  console.log("   [OK] Row 1 Data:", {
    Invoice: preview.rows[0]["Invoice ID"],
    Branch: preview.rows[0]["Branch"],
    Product: preview.rows[0]["Product line"],
    Total: preview.rows[0]["Total"]
  });

  // 7. Test Search filtering on FastAPI
  console.log("\n7. Testing Search Filter in Spreadsheet ('Yangon')...");
  const searchResult = await fetchJson(`http://localhost:8000/api/dataset/${sampleLoad.id}/preview?search=Yangon&page=1&page_size=5`);
  console.log(`   [OK] Filtered rows matching 'Yangon': ${searchResult.total_rows} rows`);

  // 8. Phase 2: Test /api/clean/filter
  console.log("\n8. Testing Phase 2 Filter API (/api/clean/{id}/filter)...");
  const filterClean = await fetchJson(`http://localhost:8000/api/clean/${sampleLoad.id}/filter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conditions: [
        { column: "Branch", operator: "equals", value: "A" }
      ],
      match_type: "all"
    })
  });
  console.log(`   [OK] Filter result: ${filterClean.message} (New row count: ${filterClean.summary.row_count})`);

  // 9. Phase 2: Test /api/clean/reset
  console.log("\n9. Testing Phase 2 Reset API (/api/clean/{id}/reset)...");
  const resetClean = await fetchJson(`http://localhost:8000/api/clean/${sampleLoad.id}/reset`, {
    method: "POST"
  });
  console.log(`   [OK] Reset result: ${resetClean.message} (Reverted row count: ${resetClean.summary.row_count})`);

  console.log("\n>>> ALL END-TO-END INTEGRATION TESTS PASSED PERFECTLY! <<<\n");
}

runIntegrationTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
