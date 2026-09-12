"use client";

import { useEffect, useMemo, useState } from "react";
import FundamentalsChart from "../components/FundamentalsChart";

type MetricOption = {
  label: string;
  value: string;
  format: string;
};

type Series = {
  ticker: string;
  metric: string;
  label: string;
  format: string;
  data: {
    date: string;
    value: number;
  }[];
};

type ChartLayout =
  | "combined"
  | "separate-company"
  | "separate-metric";

const MAX_TICKERS = 5;
const MAX_METRICS = 5;

export default function Home() {
  const [selectedTickers, setSelectedTickers] = useState<string[]>([
    "AAPL",
    "MSFT",
  ]);

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    "revenueusd",
    "netinc",
  ]);

  const [tickerSearch, setTickerSearch] = useState("");
  const [metricToAdd, setMetricToAdd] = useState("");

  const [period, setPeriod] = useState("Annual");
  const [basis, setBasis] = useState("Restated");
  const [range, setRange] = useState("10Y");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [chartLayout, setChartLayout] =
    useState<ChartLayout>("combined");

  const [tickers, setTickers] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<MetricOption[]>([]);

  const [series, setSeries] = useState<Series[]>([]);
  const [dimension, setDimension] = useState("MRY");

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
        setMetrics(result.metrics ?? []);
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

  useEffect(() => {
    async function loadData() {
      if (
        selectedTickers.length === 0 ||
        selectedMetrics.length === 0
      ) {
        setSeries([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          tickers: selectedTickers.join(","),
          metrics: selectedMetrics.join(","),
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

        const response = await fetch(
          `/api/fundamentals?${params.toString()}`
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ?? "Failed to load fundamentals"
          );
        }

        setSeries(result.series ?? []);
        setDimension(result.dimension ?? "");
      } catch (err) {
        setSeries([]);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load fundamentals"
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [
    selectedTickers,
    selectedMetrics,
    period,
    basis,
    range,
    startDate,
    endDate,
  ]);

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
    return metrics.filter(
      (metric) => !selectedMetrics.includes(metric.value)
    );
  }, [metrics, selectedMetrics]);

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

    if (selectedMetrics.includes(metricToAdd)) {
      return;
    }

    setSelectedMetrics((current) => [
      ...current,
      metricToAdd,
    ]);

    setMetricToAdd("");
  }

  function removeMetric(metric: string) {
    setSelectedMetrics((current) =>
      current.filter((item) => item !== metric)
    );
  }

  function metricLabel(metricValue: string) {
    return (
      metrics.find((metric) => metric.value === metricValue)
        ?.label ?? metricValue
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
    setRange("10Y");
  }

  const usingCustomRange = Boolean(startDate || endDate);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-semibold">
            Financial Fundamentals
          </h1>

          <p className="text-slate-400 mt-2">
            Compare companies and financial metrics over time
          </p>
        </div>

        {/* Companies */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">
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
            <div className="relative w-64">
              <input
                value={tickerSearch}
                onChange={(e) =>
                  setTickerSearch(
                    e.target.value.toUpperCase()
                  )
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2"
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
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">
              Metrics
            </label>

            <span className="text-xs text-slate-500">
              {selectedMetrics.length}/{MAX_METRICS}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {selectedMetrics.map((metric) => (
              <div
                key={metric}
                className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
              >
                <span>{metricLabel(metric)}</span>

                <button
                  onClick={() => removeMetric(metric)}
                  className="text-slate-500 hover:text-white"
                  aria-label={`Remove ${metricLabel(metric)}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {selectedMetrics.length < MAX_METRICS && (
            <div className="flex gap-2">
              <select
                value={metricToAdd}
                onChange={(e) =>
                  setMetricToAdd(e.target.value)
                }
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 min-w-64"
              >
                <option value="">+ Add metric</option>

                {availableMetrics.map((metric) => (
                  <option
                    key={metric.value}
                    value={metric.value}
                  >
                    {metric.label}
                  </option>
                ))}
              </select>

              <button
                onClick={addMetric}
                disabled={!metricToAdd}
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          )}
        </section>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6">

          <div>
            <label className="block text-xs text-slate-400 mb-2">
              Period
            </label>

            <select
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value)
              }
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2"
            >
              <option value="Annual">Annual</option>
              <option value="Quarterly">
                Quarterly
              </option>
              <option value="TTM">TTM</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">
              Data Basis
            </label>

            <select
              value={basis}
              onChange={(e) =>
                setBasis(e.target.value)
              }
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2"
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

        {/* Quick Range */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["1Y", "3Y", "5Y", "10Y", "MAX"].map(
            (rangeOption) => (
              <button
                key={rangeOption}
                onClick={() =>
                  chooseQuickRange(rangeOption)
                }
                className={`px-3 py-1.5 rounded-lg border ${
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

        {/* Custom Date Range */}
        <div className="flex flex-wrap items-end gap-3 mb-6">
          <div>
            <label className="block text-xs text-slate-400 mb-2">
              From
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setRange("CUSTOM");
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">
              To
            </label>

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setRange("CUSTOM");
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2"
            />
          </div>

          {usingCustomRange && (
            <button
              onClick={clearCustomRange}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Layout */}
        <div className="mb-6">
          <div className="text-xs text-slate-400 mb-2">
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

        <div className="mb-4 text-sm text-slate-500">
          {selectedTickers.join(" vs ")} · {dimension}

          {usingCustomRange && (
            <>
              {" · "}
              {startDate || "Beginning"}
              {" → "}
              {endDate || "Latest"}
            </>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-400">
            Loading data...
          </div>
        ) : selectedTickers.length === 0 ? (
          <div className="text-slate-400">
            Add at least one company.
          </div>
        ) : selectedMetrics.length === 0 ? (
          <div className="text-slate-400">
            Add at least one metric.
          </div>
        ) : series.length === 0 ? (
          <div className="text-slate-400">
            No data available for this selection.
          </div>
        ) : (
          <FundamentalsChart
            series={series}
            layout={chartLayout}
          />
        )}

      </div>
    </main>
  );
}
