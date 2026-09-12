import { NextResponse } from "next/server";
import { metrics } from "../../../lib/metrics";

export async function GET() {
  const host = process.env.DATABRICKS_HOST;
  const token = process.env.DATABRICKS_TOKEN;

  if (!host || !token) {
    return NextResponse.json(
      { error: "Missing Databricks configuration" },
      { status: 500 }
    );
  }

  const sql = `
    SELECT DISTINCT ticker
    FROM r_potential_project.silver.sharadar_fundamentals_clean
    WHERE ticker IS NOT NULL
    ORDER BY ticker
  `;

  try {
    const response = await fetch(
      `https://${host}/api/2.0/sql/statements`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          warehouse_id: "9eec877078684177",
          statement: sql,
          wait_timeout: "30s",
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Databricks request failed",
          details: result,
        },
        { status: response.status }
      );
    }

    const rows = result.result?.data_array ?? [];

    const tickers = rows.map((row: string[]) => row[0]);

    return NextResponse.json({
      tickers,
      metrics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Options query failed",
        details:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
