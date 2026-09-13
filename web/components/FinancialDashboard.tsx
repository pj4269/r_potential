"use client";

import { useEffect, useMemo, useState } from "react";

import FundamentalsPanel from "./FundamentalsPanel";
import MarketDataPanel from "./MarketDataPanel";
import CombinedFinancialChart, {
  CombinedChartLayout,
  CombinedSeries,
} from "./CombinedFinancialChart";

import { marketMetrics } from "../lib/marketMetrics";

type View = "fundamentals" | "market" | "combined";

type MetricOption = {
  label: string;
  value: string;
  format: string;
};

type CombinedMetricOption = MetricOption & {
  source: "fundamentals" | "market";
};

const MAX_TICKERS = 5;
const MAX_METRICS = 5;

export default function FinancialDashboard() {
  const [view, setView] = useState<View>("combined");

  const [chartLayout, setChartLayout] =
    useState<CombinedChartLayout>("combined");

  const [tickers, setTickers] = useState<string[]>([]);

  const [fundamentalMetrics, setFundamentalMetrics] = useState<
    MetricOption[]
  >([]);

  const [selectedTickers, setSelectedTickers] = useState<string[]>([
    "AAPL",
  ]);

  const [selectedMetrics, setSelectedMetrics] = useState<
    CombinedMetricOption[]
  >([
    {
      label: "Adjusted Price",
      value: "closeadj",
      format: "currencyPerShare",
      source: "market",
    },
    {
      label: "Revenue USD",
      value: "revenueusd",
      format: "currency",
      source: "fundamentals",
    },
    {
      label: "1Y Return",
      value: "1y_return",
      format: "percent",
      source: "market",
    },
  ]);

  const [tickerSearch, setTickerSearch] = useState("");
  const [metricToAdd, setMetricToAdd] = useState("");

  const [period, setPeriod] = useState("Annual");
  const [basis, setBasis] = useState("Restated");

  const [range, setRange] = useState("3Y");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [series, setSeries] = useState<CombinedSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOptions() {
      try {
        const response = await fetch("/api/options");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ?? "Failed to load options"
          );
        }

        setTickers(result.tickers ?? []);
        setFundamentalMetrics(result.metrics ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load options"
        );
      }
    }

    loadOptions();
  }, []);

  const allMetricOptions = useMemo<CombinedMetricOption[]>(() => {
    const fundamentals = fundamentalMetrics.map((metric) => ({
      ...metric,
      source: "fundamentals" as const,
    }));

    const market = marketMetrics.map((metric) => ({
      label: metric.label,
      value: metric.value,
      format: metric.format,
      source: "market" as const,
    }));

    return [...market, ...fundamentals];
  }, [fundamentalMetrics]);

  const filteredTickers = useMemo(() => {
    const search = tickerSearch.trim().toUpperCase();

    if (!search) {
      return [];
    }

    return tickers
      .filter(
        (ticker) =>
          ticker.includes(search) &&
          !selectedTickers.includes(ticker)
      )
      .slice(0, 20);
  }, [tickers, tickerSearch, selectedTickers]);

  const availableMetrics = useMemo(() => {
    return allMetricOptions.filter(
      (metric) =>
        !selectedMetrics.some(
          (selected) =>
            selected.source === metric.source &&
            selected.value === metric.value
        )
    );
  }, [allMetricOptions, selectedMetrics]);

  useEffect(() => {
    if (view !== "combined") {
      return;
    }

    async function loadCombinedData() {
      if (
        selectedTickers.length === 0 ||
        selectedMetrics.length === 0
      ) {
        setSeries([]);
        return;
      }

      const fundamentals = selectedMetrics.filter(
        (metric) => metric.source === "fundamentals"
      );

      const market = selectedMetrics.filter(
        (metric) => metric.source === "market"
      );

      setLoading(true);
      setError("");

      try {
        const requests: Promise<Response>[] = [];

        if (fundamentals.length > 0) {
          const params = new URLSearchParams({
            tickers: selectedTickers.join(","),
            metrics: fundamentals
              .map((metric) => metric.value)
              .join(","),
            period,
            basis,
            range,
          });

          if (startDate) {
            params.set("startDate", startDate);
          }

          if (endDate) {
            params.set("endDate", endDate);
          }

          requests.push(
            fetch(`/api/fundamentals?${params.toString()}`)
          );
        }

        if (market.length > 0) {
          const params = new URLSearchParams({
            tickers: selectedTickers.join(","),
            metrics: market
              .map((metric) => metric.value)
              .join(","),
            range,
          });

          if (startDate) {
            params.set("startDate", startDate);
          }

          if (endDate) {
            params.set("endDate", endDate);
          }

          requests.push(
            fetch(`/api/market-data?${params.toString()}`)
          );
        }

        const responses = await Promise.all(requests);

        const results = await Promise.all(
          responses.map((response) => response.json())
        );

        for (let i = 0; i < responses.length; i++) {
          if (!responses[i].ok) {
            throw new Error(
              results[i].error ??
                "Failed to load combined data"
            );
          }
        }

        const combinedSeries: CombinedSeries[] =
          results.flatMap((result) => result.series ?? []);

        setSeries(combinedSeries);
      } catch (err) {
        setSeries([]);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load combined data"
        );
      } finally {
        setLoading(false);
      }
    }

    loadCombinedData();
  }, [
    view,
    selectedTickers,
    selectedMetrics,
    period,
    basis,
    range,
    startDate,
    endDate,
  ]);

  function addTicker(ticker: string) {
    if (selectedTickers.length >= MAX_TICKERS) {
      return;
    }

    if (selectedTickers.includes(ticker)) {
      return;
    }

    setSelectedTickers((current) => [...current, ticker]);
    setTickerSearch("");
  }

  function removeTicker(ticker: string) {
    setSelectedTickers((current) =>
      current.filter((item) => item !== ticker)
    );
  }

  function addMetric() {
    if (!metricToAdd) {
      return;
    }

    if (selectedMetrics.length >= MAX_METRICS) {
      return;
    }

    const [source, value] = metricToAdd.split(":");

    const option = allMetricOptions.find(
      (metric) =>
        metric.source === source &&
        metric.value === value
    );

    if (!option) {
      return;
    }

    setSelectedMetrics((current) => [...current, option]);
    setMetricToAdd("");
  }

  function removeMetric(
    source: "fundamentals" | "market",
    value: string
  ) {
    setSelectedMetrics((current) =>
      current.filter(
        (metric) =>
          !(
            metric.source === source &&
            metric.value === value
          )
      )
    );
  }

  function chooseQuickRange(rangeOption: string) {
    setRange(rangeOption);
    setStartDate("");
    setEndDate("");
  }

  function clearCustomRange() {
    setStartDate("");
    setEndDate("");
    setRange("3Y");
  }

  const usingCustomRange = Boolean(startDate || endDate);

  if (view === "fundamentals") {
    return (
      <>
        <div className="px-6 pt-6">
          <ViewTabs view={view} setView={setView} />
        </div>

        <FundamentalsPanel />
      </>
    );
  }

  if (view === "market") {
    return (
      <>
        <div className="px-6 pt-6">
          <ViewTabs view={view} setView={setView} />
        </div>

        <MarketDataPanel />
      </>
    );
  }

  return (
    <section className="w-full">
      <div className="px-6 pt-6">
        <ViewTabs view={view} setView={setView} />
      </div>

      <div className="flex flex-col xl:flex-row min-h-[calc(100vh-112px)]">
        {/* Left Sidebar */}
        <aside className="w-full xl:w-[340px] shrink-0 border-r border-slate-800 px-6 py-6">
          <div className="mb-8">
            <h2 className="text-xl font-semibold">
              Combined View
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Select companies, metrics, and time range
            </p>
          </div>

          {/* Companies */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Companies
              </label>

              <span className="text-xs text-slate-500">
                {selectedTickers.length}/{MAX_TICKERS}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {selectedTickers.map((ticker) => (
                <div
                  key={ticker}
                  className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                >
                  <span>{ticker}</span>

                  <button
                    onClick={() => removeTicker(ticker)}
                    className="text-slate-500 hover:text-white"
                    aria-label={`Remove ${ticker}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {selectedTickers.length < MAX_TICKERS && (
              <div className="relative">
                <input
                  value={tickerSearch}
                  onChange={(e) =>
                    setTickerSearch(
                      e.target.value.toUpperCase()
                    )
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                  placeholder="+ Add company"
                />

                {filteredTickers.length > 0 && (
                  <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
                    {filteredTickers.map((ticker) => (
                      <button
                        key={ticker}
                        onClick={() => addTicker(ticker)}
                        className="block w-full text-left px-4 py-2 hover:bg-slate-800"
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Metrics */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Metrics
              </label>

              <span className="text-xs text-slate-500">
                {selectedMetrics.length}/{MAX_METRICS}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              {selectedMetrics.map((metric) => (
                <div
                  key={`${metric.source}:${metric.value}`}
                  className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate">
                      {metric.label}
                    </div>

                    <div className="text-xs text-slate-500">
                      {metric.source === "market"
                        ? "Market"
                        : "Fundamental"}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      removeMetric(
                        metric.source,
                        metric.value
                      )
                    }
                    className="text-slate-500 hover:text-white"
                    aria-label={`Remove ${metric.label}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {selectedMetrics.length < MAX_METRICS && (
              <div className="space-y-2">
                <select
                  value={metricToAdd}
                  onChange={(e) =>
                    setMetricToAdd(e.target.value)
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                >
                  <option value="">+ Add metric</option>

                  <optgroup label="Market Data">
                    {availableMetrics
                      .filter(
                        (metric) =>
                          metric.source === "market"
                      )
                      .map((metric) => (
                        <option
                          key={`market:${metric.value}`}
                          value={`market:${metric.value}`}
                        >
                          {metric.label}
                        </option>
                      ))}
                  </optgroup>

                  <optgroup label="Fundamentals">
                    {availableMetrics
                      .filter(
                        (metric) =>
                          metric.source ===
                          "fundamentals"
                      )
                      .map((metric) => (
                        <option
                          key={`fundamentals:${metric.value}`}
                          value={`fundamentals:${metric.value}`}
                        >
                          {metric.label}
                        </option>
                      ))}
                  </optgroup>
                </select>

                <button
                  onClick={addMetric}
                  disabled={!metricToAdd}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 disabled:opacity-40"
                >
                  Add Metric
                </button>
              </div>
            )}
          </section>

          {/* Fundamentals Controls */}
          <section className="mb-8">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-3">
              Fundamentals
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Period
                </label>

                <select
                  value={period}
                  onChange={(e) =>
                    setPeriod(e.target.value)
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                >
                  <option value="Annual">Annual</option>
                  <option value="Quarterly">
                    Quarterly
                  </option>
                  <option value="TTM">TTM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Data Basis
                </label>

                <select
                  value={basis}
                  onChange={(e) =>
                    setBasis(e.target.value)
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                >
                  <option value="Restated">
                    Latest / Restated
                  </option>

                  <option value="As Reported">
                    As Reported
                  </option>
                </select>
              </div>
            </div>
          </section>

          {/* Date Range */}
          <section>
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-3">
              Date Range
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {["1Y", "3Y", "5Y", "10Y", "MAX"].map(
                (rangeOption) => (
                  <button
                    key={rangeOption}
                    onClick={() =>
                      chooseQuickRange(rangeOption)
                    }
                    className={`px-3 py-1.5 rounded-lg border text-sm ${
                      !usingCustomRange &&
                      range === rangeOption
                        ? "bg-white text-black border-white"
                        : "bg-slate-900 border-slate-700 text-slate-300"
                    }`}
                  >
                    {rangeOption}
                  </button>
                )
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  From
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setRange("CUSTOM");
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  To
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setRange("CUSTOM");
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                />
              </div>

              {usingCustomRange && (
                <button
                  onClick={clearCustomRange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300"
                >
                  Clear Custom Range
                </button>
              )}
            </div>
          </section>
        </aside>

        {/* Right Workspace */}
        <main className="flex-1 min-w-0 px-6 py-6">
          <div className="mb-5">
            <h1 className="text-2xl font-semibold">
              Financial Chart
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Fundamentals, adjusted price, and returns on one
              timeline
            </p>
          </div>

          {/* Chart Layout */}
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-3">
              Chart Layout
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  setChartLayout("combined")
                }
                className={`px-4 py-2 rounded-lg border ${
                  chartLayout === "combined"
                    ? "bg-white text-black border-white"
                    : "bg-slate-900 border-slate-700 text-slate-300"
                }`}
              >
                Combined
              </button>

              <button
                onClick={() =>
                  setChartLayout("separate-company")
                }
                className={`px-4 py-2 rounded-lg border ${
                  chartLayout === "separate-company"
                    ? "bg-white text-black border-white"
                    : "bg-slate-900 border-slate-700 text-slate-300"
                }`}
              >
                Separate by Company
              </button>

              <button
                onClick={() =>
                  setChartLayout("separate-metric")
                }
                className={`px-4 py-2 rounded-lg border ${
                  chartLayout === "separate-metric"
                    ? "bg-white text-black border-white"
                    : "bg-slate-900 border-slate-700 text-slate-300"
                }`}
              >
                Separate by Metric
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-red-300">
              {error}
            </div>
          )}

          <div className="min-h-[650px]">
            {loading ? (
              <div className="h-[600px] rounded-xl border border-slate-800 bg-slate-900/30 flex items-center justify-center text-slate-400">
                Loading combined data...
              </div>
            ) : series.length === 0 ? (
              <div className="h-[600px] rounded-xl border border-slate-800 bg-slate-900/30 flex items-center justify-center text-slate-400">
                No combined data available.
              </div>
            ) : (
              <CombinedFinancialChart
                series={series}
                layout={chartLayout}
              />
            )}
          </div>
        </main>
      </div>
    </section>
  );
}

function ViewTabs({
  view,
  setView,
}: {
  view: View;
  setView: (value: View) => void;
}) {
  const options: {
    value: View;
    label: string;
  }[] = [
    {
      value: "fundamentals",
      label: "Fundamentals",
    },
    {
      value: "market",
      label: "Market Data",
    },
    {
      value: "combined",
      label: "Combined",
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {options.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setView(value)}
          className={`px-4 py-2 rounded-lg border ${
            view === value
              ? "bg-white text-black border-white"
              : "bg-slate-900 border-slate-700 text-slate-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
