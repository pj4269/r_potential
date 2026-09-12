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

function validDate(value: string | null) {
  if (!value) {
    return true;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const tickersParam =
    searchParams.get("tickers") ?? "AAPL";

  const metricsParam =
    searchParams.get("metrics") ?? "revenueusd";

  const period =
    searchParams.get("period") ?? "Annual";

  const basis =
    searchParams.get("basis") ?? "Restated";

  const range =
    searchParams.get("range") ?? "10Y";

  const startDate =
    searchParams.get("startDate");

  const endDate =
    searchParams.get("endDate");

  const tickers = tickersParam
    .split(",")
    .map((ticker) =>
      ticker.trim().toUpperCase()
    )
    .filter(Boolean);

  const metrics = metricsParam
    .split(",")
    .map((metric) =>
      metric.trim()
    )
    .filter(Boolean);

  const dimension =
    dimensionMap[`${period}-${basis}`];

  if (!dimension) {
    return NextResponse.json(
      {
        error: "Invalid period/basis",
      },
      {
        status: 400,
      }
    );
  }

  if (
    tickers.length === 0 ||
    tickers.length > 5 ||
    tickers.some(
      (ticker) =>
        !/^[A-Z0-9.-]+$/.test(ticker)
    )
  ) {
    return NextResponse.json(
      {
        error: "Invalid tickers",
      },
      {
        status: 400,
      }
    );
  }

  if (
    metrics.length === 0 ||
    metrics.length > 5 ||
    metrics.some(
      (metric) => !metricMap[metric]
    )
  ) {
    return NextResponse.json(
      {
        error: "Invalid metrics",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !validDate(startDate) ||
    !validDate(endDate)
  ) {
    return NextResponse.json(
      {
        error:
          "Dates must use YYYY-MM-DD format",
      },
      {
        status: 400,
      }
    );
  }

  if (
    startDate &&
    endDate &&
    startDate > endDate
  ) {
    return NextResponse.json(
      {
        error:
          "Start date must be before end date",
      },
      {
        status: 400,
      }
    );
  }

  let dateFilter = "";

  if (startDate || endDate) {
    const filters: string[] = [];

    if (startDate) {
      filters.push(
        `calendardate >= '${startDate}'`
      );
    }

    if (endDate) {
      filters.push(
        `calendardate <= '${endDate}'`
      );
    }

    dateFilter =
      `AND ${filters.join(" AND ")}`;
  } else {
    const rangeMap: Record<
      string,
      number | null
    > = {
      "1Y": 1,
      "3Y": 3,
      "5Y": 5,
      "10Y": 10,
      MAX: null,
    };

    if (!(range in rangeMap)) {
      return NextResponse.json(
        {
          error: "Invalid range",
        },
        {
          status: 400,
        }
      );
    }

    const years = rangeMap[range];

    dateFilter =
      years != null
        ? `AND calendardate >= add_months(current_date(), -${
            years * 12
          })`
        : "";
  }

  const tickerList = tickers
    .map((ticker) => `'${ticker}'`)
    .join(", ");

  const metricColumns = metrics
    .map((metric) => {
      const column =
        metricMap[metric].value;

      return `${column} AS ${column}`;
    })
    .join(",\n      ");

  const sql = `
    SELECT
      ticker,
      calendardate,
      ${metricColumns}
    FROM r_potential_project.silver.sharadar_fundamentals_clean
    WHERE ticker IN (${tickerList})
      AND dimension = '${dimension}'
      ${dateFilter}
    ORDER BY ticker, calendardate
  `;

  const host =
    process.env.DATABRICKS_HOST;

  const token =
    process.env.DATABRICKS_TOKEN;

  if (!host || !token) {
    return NextResponse.json(
      {
        error:
          "Missing Databricks environment variables",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const response = await fetch(
      `https://${host}/api/2.0/sql/statements`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${token}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          warehouse_id:
            "9eec877078684177",

          statement: sql,

          wait_timeout:
            "30s",
        }),
      }
    );

    const result =
      await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "Databricks request failed",

          details: result,
        },
        {
          status: response.status,
        }
      );
    }

    if (
      result.status?.state !==
      "SUCCEEDED"
    ) {
      return NextResponse.json(
        {
          error:
            "Databricks statement did not succeed",

          status:
            result.status,
        },
        {
          status: 500,
        }
      );
    }

    const rows =
      result.result?.data_array ?? [];

    const series = [];

    for (
      let metricIndex = 0;
      metricIndex <
      metrics.length;
      metricIndex++
    ) {
      const metricKey =
        metrics[metricIndex];

      const metricConfig =
        metricMap[metricKey];

      for (
        const ticker of tickers
      ) {
        const data = rows
          .filter(
            (row: string[]) =>
              row[0] === ticker
          )
          .map(
            (row: string[]) => ({
              date: row[1],

              value: Number(
                row[
                  2 +
                    metricIndex
                ]
              ),
            })
          )
          .filter(
            (point: {
              value: number;
            }) =>
              Number.isFinite(
                point.value
              )
          );

        series.push({
          ticker,

          metric:
            metricKey,

          label:
            metricConfig.label,

          format:
            metricConfig.format,

          data,
        });
      }
    }

    return NextResponse.json({
      tickers,
      metrics,
      period,
      basis,
      range,
      startDate,
      endDate,
      dimension,
      series,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        error:
          "Databricks query failed",

        details:
          message,
      },
      {
        status: 500,
      }
    );
  }
}
