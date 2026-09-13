"use client";

import ReactECharts from "echarts-for-react";

export type CombinedSeries = {
  ticker: string;
  metric: string;
  label: string;
  format: string;
  data: {
    date: string;
    value: number;
  }[];
};

export type CombinedChartLayout =
  | "combined"
  | "separate-company"
  | "separate-metric";

type Props = {
  series: CombinedSeries[];
  layout?: CombinedChartLayout;
};

type ChartGroup = {
  title: string;
  series: CombinedSeries[];
};

function formatValue(
  value: number,
  format: string
) {
  if (!Number.isFinite(value)) {
    return "-";
  }

  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation:
          Math.abs(value) >= 1_000_000
            ? "compact"
            : "standard",
        maximumFractionDigits: 2,
      }).format(value);

    case "currencyPerShare":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(value);

    case "percent":
      return `${(value * 100).toFixed(2)}%`;

    case "ratio":
      return value.toFixed(2);

    case "shares":
      return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(value);

    default:
      return new Intl.NumberFormat("en-US", {
        notation:
          Math.abs(value) >= 1_000_000
            ? "compact"
            : "standard",
        maximumFractionDigits: 2,
      }).format(value);
  }
}

function getAxisGroup(format: string) {
  switch (format) {
    case "currency":
      return "currency";

    case "currencyPerShare":
      return "price";

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

function getAxisLabel(group: string) {
  switch (group) {
    case "currency":
      return "Currency";

    case "price":
      return "Price";

    case "percent":
      return "Percent";

    case "ratio":
      return "Ratio";

    case "shares":
      return "Shares";

    default:
      return "Value";
  }
}

function buildChartGroups(
  series: CombinedSeries[],
  layout: CombinedChartLayout
): ChartGroup[] {
  if (layout === "separate-company") {
    const tickers = Array.from(
      new Set(series.map((item) => item.ticker))
    );

    return tickers.map((ticker) => ({
      title: ticker,
      series: series.filter(
        (item) => item.ticker === ticker
      ),
    }));
  }

  if (layout === "separate-metric") {
    const metrics = Array.from(
      new Map(
        series.map((item) => [
          item.metric,
          item.label,
        ])
      ).entries()
    );

    return metrics.map(([metric, label]) => ({
      title: label,
      series: series.filter(
        (item) => item.metric === metric
      ),
    }));
  }

  return [
    {
      title: "",
      series,
    },
  ];
}

function FinancialChart({
  series,
  title,
}: {
  series: CombinedSeries[];
  title?: string;
}) {
  const axisGroups = Array.from(
    new Set(
      series.map((item) =>
        getAxisGroup(item.format)
      )
    )
  );

  const primaryAxisGroup =
    axisGroups[0] ?? "number";

  const secondaryAxisGroup =
    axisGroups[1];

  const yAxis = axisGroups.map(
    (group, index) => ({
      type: "value",
      name: getAxisLabel(group),
      position:
        index === 1 ? "right" : "left",

      offset:
        index > 1
          ? (index - 1) * 55
          : 0,

      axisLabel: {
        color: "#94a3b8",

        formatter: (value: number) => {
          if (group === "percent") {
            return `${(value * 100).toFixed(
              0
            )}%`;
          }

          if (
            group === "currency" ||
            group === "shares"
          ) {
            return new Intl.NumberFormat(
              "en-US",
              {
                notation: "compact",
                maximumFractionDigits: 1,
              }
            ).format(value);
          }

          if (group === "price") {
            return `$${value.toFixed(0)}`;
          }

          return new Intl.NumberFormat(
            "en-US",
            {
              notation: "compact",
              maximumFractionDigits: 2,
            }
          ).format(value);
        },
      },

      splitLine: {
        show: index === 0,
        lineStyle: {
          color: "#1e293b",
        },
      },

      axisLine: {
        show: true,
        lineStyle: {
          color: "#475569",
        },
      },

      nameTextStyle: {
        color: "#64748b",
      },
    })
  );

  if (yAxis.length === 0) {
    yAxis.push({
      type: "value",
      name: "Value",
      position: "left",
      offset: 0,

      axisLabel: {
        color: "#94a3b8",
        formatter: (value: number) =>
          new Intl.NumberFormat("en-US", {
            notation: "compact",
            maximumFractionDigits: 2,
          }).format(value),
      },

      splitLine: {
        show: true,
        lineStyle: {
          color: "#1e293b",
        },
      },

      axisLine: {
        show: true,
        lineStyle: {
          color: "#475569",
        },
      },

      nameTextStyle: {
        color: "#64748b",
      },
    });
  }

  const chartSeries = series.map(
    (item) => {
      const axisGroup = getAxisGroup(
        item.format
      );

      const axisIndex =
        axisGroups.indexOf(axisGroup);

      const isSparse =
        item.data.length < 80;

      return {
        name: `${item.ticker} · ${item.label}`,

        type: "line",

        yAxisIndex:
          axisIndex >= 0
            ? axisIndex
            : axisGroup ===
              primaryAxisGroup
            ? 0
            : secondaryAxisGroup
            ? 1
            : 0,

        data: item.data.map((point) => [
          point.date,
          point.value,
        ]),

        showSymbol: isSparse,

        symbolSize: isSparse ? 7 : 4,

        smooth: false,

        connectNulls: false,

        lineStyle: {
          width: 2,
        },

        emphasis: {
          focus: "series",
        },
      };
    }
  );

  const option = {
    backgroundColor: "transparent",

    animation: false,

    tooltip: {
      trigger: "axis",

      backgroundColor: "#0f172a",
      borderColor: "#334155",
      textStyle: {
        color: "#f8fafc",
      },

      axisPointer: {
        type: "cross",
      },

      formatter: (
        params: Array<{
          seriesName: string;
          value: [string, number];
          seriesIndex: number;
          marker: string;
        }>
      ) => {
        if (!params?.length) {
          return "";
        }

        const date =
          params[0]?.value?.[0] ?? "";

        const lines = [
          `<strong>${date}</strong>`,
        ];

        params.forEach((param) => {
          const item =
            series[param.seriesIndex];

          if (!item) {
            return;
          }

          const value =
            param.value?.[1];

          if (
            value == null ||
            !Number.isFinite(value)
          ) {
            return;
          }

          lines.push(
            `${param.marker}${param.seriesName}: ${formatValue(
              value,
              item.format
            )}`
          );
        });

        return lines.join("<br/>");
      },
    },

    legend: {
      type: "scroll",
      top: 0,
      textStyle: {
        color: "#cbd5e1",
      },
    },

    grid: {
      left: 70,
      right:
        axisGroups.length > 1
          ? 85
          : 35,
      top: 60,
      bottom: 80,
      containLabel: true,
    },

    xAxis: {
      type: "time",

      axisLabel: {
        color: "#94a3b8",
      },

      axisLine: {
        lineStyle: {
          color: "#475569",
        },
      },

      splitLine: {
        show: false,
      },
    },

    yAxis,

    dataZoom: [
      {
        type: "inside",
      },
      {
        type: "slider",
        bottom: 20,
        height: 22,
        borderColor: "#334155",
        textStyle: {
          color: "#94a3b8",
        },
      },
    ],

    series: chartSeries,
  };

  return (
    <div>
      {title && (
        <div className="mb-3">
          <h3 className="text-lg font-medium text-slate-200">
            {title}
          </h3>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950/40">
        <ReactECharts
          option={option}
          style={{
            height: "560px",
            width: "100%",
          }}
          notMerge
          lazyUpdate
        />
      </div>
    </div>
  );
}

export default function CombinedFinancialChart({
  series,
  layout = "combined",
}: Props) {
  if (series.length === 0) {
    return (
      <div className="h-[560px] flex items-center justify-center text-slate-400">
        No chart data available.
      </div>
    );
  }

  const groups = buildChartGroups(
    series,
    layout
  );

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <FinancialChart
          key={
            group.title ||
            "combined-chart"
          }
          title={
            layout === "combined"
              ? undefined
              : group.title
          }
          series={group.series}
        />
      ))}
    </div>
  );
}
