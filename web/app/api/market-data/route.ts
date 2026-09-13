import { NextRequest, NextResponse } from "next/server";
import { marketMetricMap } from "../../../lib/marketMetrics";

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
    searchParams.get("metrics") ?? "closeadj";

  const range =
    searchParams.get("range") ?? "1Y";

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
      (metric) => !marketMetricMap[metric]
    )
  ) {
    return NextResponse.json(
      {
        error: "Invalid market metrics",
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
        `date >= '${startDate}'`
      );
    }

    if (endDate) {
      filters.push(
        `date <= '${endDate}'`
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
        ? `AND date >= add_months(current_date(), -${
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
        marketMetricMap[metric].column;

      return `\`${column}\` AS \`${column}\``;
    })
    .join(",\n      ");

  const sql = `
    SELECT
      ticker,
      date,
      ${metricColumns}
    FROM r_potential_project.gold.sharadar_equity_returns_timeseries
    WHERE ticker IN (${tickerList})
      ${dateFilter}
    ORDER BY ticker, date
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

    const rows: (string | null)[][] =
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
        marketMetricMap[metricKey];

      for (const ticker of tickers) {
        const data = rows
          .filter(
            (row) =>
              row[0] === ticker
          )
          .map((row) => {
            const rawValue =
              row[2 + metricIndex];

            if (rawValue == null) {
              return null;
            }

            const value =
              Number(rawValue);

            if (!Number.isFinite(value)) {
              return null;
            }

            return {
              date: row[1] as string,
              value,
            };
          })
          .filter(
            (
              point
            ): point is {
              date: string;
              value: number;
            } =>
              point !== null
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
      range,
      startDate,
      endDate,
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
          "Market data query failed",

        details:
          message,
      },
      {
        status: 500,
      }
    );
  }
}
