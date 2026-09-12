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

type Props = {
  series: Series[];
};

function compactNumber(value: number) {
  const abs = Math.abs(value);

  if (abs >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(1)}T`;
  }

  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toFixed(2);
}

function formatValue(value: number, format: string) {
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

export default function FundamentalsChart({ series }: Props) {
  if (!series.length) {
    return null;
  }

  const metricKeys = Array.from(
    new Set(series.map((s) => s.metric))
  );

  const metric1 = metricKeys[0];
  const metric2 = metricKeys[1];

  const metric1Series = series.find((s) => s.metric === metric1);
  const metric2Series = series.find((s) => s.metric === metric2);

  const allDates = Array.from(
    new Set(
      series.flatMap((s) => s.data.map((point) => point.date))
    )
  ).sort();

  const echartsSeries = series.map((s) => {
    const dataMap = new Map(
      s.data.map((point) => [point.date, point.value])
    );

    return {
      name: `${s.ticker} — ${s.label}`,
      type: "line",
      smooth: true,
      showSymbol: true,
      symbol: "circle",
      symbolSize: 6,

      yAxisIndex: s.metric === metric2 ? 1 : 0,

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
  });

  const option = {
    backgroundColor: "transparent",

    legend: {
      top: 0,
      textStyle: {
        color: "#cbd5e1",
      },
    },

    tooltip: {
      trigger: "axis",

      formatter: (params: any[]) => {
        if (!params.length) return "";

        const date = params[0].axisValue;

        const rows = params
          .map((p) => {
            const sourceSeries = series.find(
              (s) => `${s.ticker} — ${s.label}` === p.seriesName
            );

            if (!sourceSeries || p.value == null) {
              return "";
            }

            return `
              <div style="margin-top:4px">
                ${p.marker}
                ${p.seriesName}:
                <strong>
                  ${formatValue(
                    Number(p.value),
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
      left: 85,
      right: metric2 ? 85 : 30,
      top: 70,
      bottom: 90,
    },

    xAxis: {
      type: "category",
      data: allDates,
      boundaryGap: false,

      axisLabel: {
        color: "#94a3b8",
        formatter: (value: string) => {
          return value.substring(0, 4);
        },
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
        name: metric1Series?.label ?? "",

        nameTextStyle: {
          color: "#94a3b8",
        },

        axisLabel: {
          color: "#94a3b8",

          formatter: (value: number) =>
            metric1Series
              ? formatValue(value, metric1Series.format)
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
        name: metric2Series?.label ?? "",

        nameTextStyle: {
          color: "#94a3b8",
        },

        axisLabel: {
          color: "#94a3b8",

          formatter: (value: number) =>
            metric2Series
              ? formatValue(value, metric2Series.format)
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <ReactECharts
        option={option}
        style={{
          width: "100%",
          height: "500px",
        }}
      />
    </div>
  );
}
