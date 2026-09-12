"use client";

import ReactECharts from "echarts-for-react";

type Point = {
  date: string;
  value: number;
};

type Props = {
  ticker: string;
  metric: string;
  data: Point[];
};

function formatMoney(value: number) {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(1)}T`;
  }

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  return `$${value.toLocaleString()}`;
}

export default function FundamentalsChart({
  ticker,
  metric,
  data,
}: Props) {
  const option = {
    backgroundColor: "transparent",

    tooltip: {
      trigger: "axis",
      formatter: (params: any[]) => {
        const point = params[0];

        return `
          <strong>${point.axisValue}</strong><br/>
          ${metric}: ${formatMoney(point.value)}
        `;
      },
    },

    grid: {
      left: 80,
      right: 30,
      top: 30,
      bottom: 90,
    },

    xAxis: {
      type: "category",
      data: data.map((d) => d.date),
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

    yAxis: {
      type: "value",

      axisLabel: {
        color: "#94a3b8",
        formatter: (value: number) => formatMoney(value),
      },

      splitLine: {
        lineStyle: {
          color: "#1e293b",
        },
      },
    },

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

    series: [
      {
        name: metric,
        type: "line",
        data: data.map((d) => d.value),

        smooth: true,
        symbol: "circle",
        symbolSize: 7,

        lineStyle: {
          width: 3,
        },

        emphasis: {
          focus: "series",
        },
      },
    ],
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="mb-4">
        <h2 className="text-xl font-medium">
          {ticker} — {metric}
        </h2>

        <p className="text-slate-400 text-sm">
          Historical fundamentals
        </p>
      </div>

      <ReactECharts
        option={option}
        style={{
          height: "450px",
          width: "100%",
        }}
      />
    </div>
  );
}
