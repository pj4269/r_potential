import { NextRequest, NextResponse } from "next/server";
import { metricMap } from "../../../lib/metrics";

const dimensionMap: Record<string, string> = {
  "Annual-Restated": "MRY",
  "Quarterly-Restated": "MRQ",
  "TTM-Restated": "MRT",
  "Annual-As Reported": "ARY",
  "Quarterly-As Reported": "ARQ",
  "TTM-As Reported": "ART",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const ticker = (searchParams.get("ticker") ?? "AAPL").toUpperCase();
  const metric = searchParams.get("metric") ?? "revenueusd";
  const period = searchParams.get("period") ?? "Annual";
  const basis = searchParams.get("basis") ?? "Restated";
  const range = searchParams.get("range") ?? "10Y";

  const metricConfig = metricMap[metric];
  const dimension = dimensionMap[`${period}-${basis}`];

  if (
    !metricConfig ||
    !dimension ||
    !/^[A-Z0-9.-]+$/.test(ticker)
  ) {
    return NextResponse.json(
      { error: "Invalid parameters" },
      { status: 400 }
    );
  }

  const column = metricConfig.value;

  const rangeMap: Record<string, number | null> = {
    "1Y": 1,
    "3Y": 3,
    "5Y": 5,
    "10Y": 10,
    MAX: null,
  };

  const years = rangeMap[range];

  const dateFilter =
    years != null
      ? `AND calendardate >= add_months(current_date(), -${years * 12})`
      : "";

  const sql = `
    SELECT
      calendardate,
      ${column} AS value
    FROM r_potential_project.silver.sharadar_fundamentals_clean
    WHERE ticker = '${ticker}'
      AND dimension = '${dimension}'
      AND ${column} IS NOT NULL
      ${dateFilter}
    ORDER BY calendardate
  `;

  const host = process.env.DATABRICKS_HOST;
  const token = process.env.DATABRICKS_TOKEN;

  if (!host || !token) {
    return NextResponse.json(
      { error: "Missing Databricks environment variables" },
      { status: 500 }
    );
  }

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
      console.error("Databricks HTTP error:", result);

      return NextResponse.json(
        {
          error: "Databricks request failed",
          details: result,
        },
        { status: response.status }
      );
    }

    if (result.status?.state !== "SUCCEEDED") {
      return NextResponse.json(
        {
          error: "Databricks statement did not succeed",
          status: result.status,
        },
        { status: 500 }
      );
    }

    const rows = result.result?.data_array ?? [];

    const data = rows.map((row: string[]) => ({
      date: row[0],
      value: Number(row[1]),
    }));

    return NextResponse.json({
      ticker,

      metric: {
        label: metricConfig.label,
        value: metricConfig.value,
        format: metricConfig.format,
      },

      period,
      basis,
      range,
      dimension,
      data,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: "Databricks query failed",
        details: message,
      },
      { status: 500 }
    );
  }
}
