export type MarketMetricFormat =
  | "currencyPerShare"
  | "percent";

export type MarketMetric = {
  label: string;
  value: string;
  column: string;
  format: MarketMetricFormat;
};

export const marketMetrics: MarketMetric[] = [
  {
    label: "Adjusted Price",
    value: "closeadj",
    column: "closeadj",
    format: "currencyPerShare",
  },
  {
    label: "Daily Return",
    value: "daily_return",
    column: "daily_return",
    format: "percent",
  },
  {
    label: "1M Return",
    value: "1m_return",
    column: "1m_return",
    format: "percent",
  },
  {
    label: "3M Return",
    value: "3m_return",
    column: "3m_return",
    format: "percent",
  },
  {
    label: "6M Return",
    value: "6m_return",
    column: "6m_return",
    format: "percent",
  },
  {
    label: "YTD Return",
    value: "ytd_return",
    column: "ytd_return",
    format: "percent",
  },
  {
    label: "1Y Return",
    value: "1y_return",
    column: "1y_return",
    format: "percent",
  },
];

export const marketMetricMap = Object.fromEntries(
  marketMetrics.map((metric) => [
    metric.value,
    metric,
  ])
) as Record<string, MarketMetric>;
