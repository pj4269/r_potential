"use client";

import ReactECharts from "echarts-for-react";

type Point = {
  date: string;
  value: number;
};

type Series = {
  ticker: string;
  metric: string;
  label: string;
  format: string;
  data: Point[];
};

type ChartLayout =
  | "combined"
  | "separate-company"
  | "separate-metric";

type Props = {
  series: Series[];
  layout?: ChartLayout;
};

function compactNumber(value: number) {
  const abs = Math.abs(value);

  if (abs >= 1_000_000_000_000) {
    return `${(
      value / 1_000_000_000_000
    ).toFixed(1)}T`;
  }

  if (abs >= 1_000_000_000) {
    return `${(
      value / 1_000_000_000
    ).toFixed(1)}B`;
  }

  if (abs >= 1_000_000) {
    return `${(
      value / 1_000_000
    ).toFixed(1)}M`;
  }

  if (abs >= 1_000) {
    return `${(
      value / 1_000
    ).toFixed(1)}K`;
  }

  return value.toFixed(2);
}

function formatValue(
  value: number,
  format: string
) {
  switch (format) {
    case "currency":
      return `$${compactNumber(value)}`;

    case "currencyPerShare":
      return `$${value.toFixed(2)}`;

    case "percent":
      return `${(value * 100).toFixed(1)}%`;

    case "ratio":
      return `${value.toFixed(2)}x`;

    case "shares":
      return compactNumber(value);

    default:
      return compactNumber(value);
  }
}

function getAxisGroup(format: string) {
  switch (format) {
    case "currency":
    case "currencyPerShare":
      return "currency";

    case "percent":
      return "percent";

    case "ratio":
      return "ratio";

    case "shares":
      return "shares";

    default:
      return "number";
  }
}

function buildOption(series: Series[]) {
  const allDates = Array.from(
    new Set(
      series.flatMap((item) =>
        item.data.map((point) => point.date)
      )
    )
  ).sort();

  /*
   * ECharts is easiest to read with a maximum
   * of two Y axes.
   *
   * We therefore group metrics by format/unit and
   * map the first group to the left axis and the
   * second group to the right axis.
   *
   * Additional unit groups fall back to the left
   * axis rather than creating 3-5 axes.
   */
  const axisGroups = Array.from(
    new Set(
      series.map((item) =>
        getAxisGroup(item.format)
      )
    )
  );

  const leftAxisGroup = axisGroups[0];
  const rightAxisGroup = axisGroups[1];

  const useSecondAxis =
    Boolean(rightAxisGroup);

  const leftAxisSeries = series.find(
    (item) =>
      getAxisGroup(item.format) ===
      leftAxisGroup
  );

  const rightAxisSeries = series.find(
    (item) =>
      getAxisGroup(item.format) ===
      rightAxisGroup
  );

  const echartsSeries = series.map(
    (item) => {
      const dataMap = new Map(
        item.data.map((point) => [
          point.date,
          point.value,
        ])
      );

      const axisGroup = getAxisGroup(
        item.format
      );

      return {
        name: `${item.ticker} — ${item.label}`,
        type: "line",
        smooth: false,
        showSymbol: true,
        symbol: "circle",
        symbolSize: 6,

        yAxisIndex:
          useSecondAxis &&
          axisGroup === rightAxisGroup
            ? 1
            : 0,

        data: allDates.map((date) => {
          const value = dataMap.get(date);
          return value ?? null;
        }),

        lineStyle: {
          width: 3,
        },

        connectNulls: false,

        emphasis: {
          focus: "series",
        },
      };
    }
  );

  return {
    backgroundColor: "transparent",

    legend: {
      top: 0,

      type: "scroll",

      textStyle: {
        color: "#cbd5e1",
      },
    },

    tooltip: {
      trigger: "axis",

      formatter: (params: any[]) => {
        if (!params.length) {
          return "";
        }

        const date =
          params[0].axisValue;

        const rows = params
          .map((param) => {
            const sourceSeries =
              series.find(
                (item) =>
                  `${item.ticker} — ${item.label}` ===
                  param.seriesName
              );

            if (
              !sourceSeries ||
              param.value == null
            ) {
              return "";
            }

            return `
              <div style="margin-top:4px">
                ${param.marker}
                ${param.seriesName}:
                <strong>
                  ${formatValue(
                    Number(param.value),
                    sourceSeries.format
                  )}
                </strong>
              </div>
            `;
          })
          .join("");

        return `
          <strong>${date}</strong>
          ${rows}
        `;
      },
    },

    grid: {
      left: 90,
      right: useSecondAxis ? 90 : 30,
      top: 80,
      bottom: 90,
    },

    xAxis: {
      type: "category",
      data: allDates,
      boundaryGap: false,

      axisLabel: {
        color: "#94a3b8",

        formatter: (
          value: string
        ) => value.substring(0, 4),
      },

      axisLine: {
        lineStyle: {
          color: "#334155",
        },
      },
    },

    yAxis: [
      {
        type: "value",

        name:
          leftAxisSeries?.label ?? "",

        nameTextStyle: {
          color: "#94a3b8",
        },

        axisLabel: {
          color: "#94a3b8",

          formatter: (
            value: number
          ) =>
            leftAxisSeries
              ? formatValue(
                  value,
                  leftAxisSeries.format
                )
              : value,
        },

        splitLine: {
          lineStyle: {
            color: "#1e293b",
          },
        },
      },

      {
        type: "value",

        show: useSecondAxis,

        name: useSecondAxis
          ? rightAxisSeries?.label ?? ""
          : "",

        nameTextStyle: {
          color: "#94a3b8",
        },

        axisLabel: {
          color: "#94a3b8",

          formatter: (
            value: number
          ) =>
            rightAxisSeries
              ? formatValue(
                  value,
                  rightAxisSeries.format
                )
              : value,
        },

        splitLine: {
          show: false,
        },
      },
    ],

    dataZoom: [
      {
        type: "inside",
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      },

      {
        type: "slider",
        bottom: 20,
      },
    ],

    series: echartsSeries,
  };
}

function ChartCard({
  title,
  series,
  height = 450,
}: {
  title?: string;
  series: Series[];
  height?: number;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">

      {title && (
        <h2 className="text-lg font-semibold mb-4">
          {title}
        </h2>
      )}

      <ReactECharts
        option={buildOption(series)}
        style={{
          width: "100%",
          height: `${height}px`,
        }}
      />
    </div>
  );
}

export default function FundamentalsChart({
  series,
  layout = "combined",
}: Props) {
  if (!series.length) {
    return null;
  }

  if (
    layout === "separate-company"
  ) {
    const tickers = Array.from(
      new Set(
        series.map(
          (item) => item.ticker
        )
      )
    );

    return (
      <div className="space-y-6">
        {tickers.map((ticker) => {
          const tickerSeries =
            series.filter(
              (item) =>
                item.ticker === ticker
            );

          return (
            <ChartCard
              key={ticker}
              title={ticker}
              series={tickerSeries}
            />
          );
        })}
      </div>
    );
  }

  if (
    layout === "separate-metric"
  ) {
    const metrics = Array.from(
      new Set(
        series.map(
          (item) => item.metric
        )
      )
    );

    return (
      <div className="space-y-6">
        {metrics.map((metric) => {
          const metricSeries =
            series.filter(
              (item) =>
                item.metric === metric
            );

          const title =
            metricSeries[0]?.label ??
            metric;

          return (
            <ChartCard
              key={metric}
              title={title}
              series={metricSeries}
            />
          );
        })}
      </div>
    );
  }

  return (
    <ChartCard
      series={series}
      height={500}
    />
  );
}
