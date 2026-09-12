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

export default function Home() {
  const [ticker1, setTicker1] = useState("AAPL");
  const [ticker2, setTicker2] = useState("MSFT");

  const [tickerSearch1, setTickerSearch1] = useState("AAPL");
  const [tickerSearch2, setTickerSearch2] = useState("MSFT");

  const [metric1, setMetric1] = useState("revenueusd");
  const [metric2, setMetric2] = useState("netinc");

  const [period, setPeriod] = useState("Annual");
  const [basis, setBasis] = useState("Restated");
  const [range, setRange] = useState("10Y");

  const [chartLayout, setChartLayout] = useState<
    "combined" | "separate"
  >("combined");

  const [tickers, setTickers] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<MetricOption[]>([]);

  const [series, setSeries] = useState<Series[]>([]);
  const [dimension, setDimension] = useState("MRY");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadOptions() {
      const response = await fetch("/api/options");
      const result = await response.json();

      setTickers(result.tickers ?? []);
      setMetrics(result.metrics ?? []);
    }

    loadOptions();
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const params = new URLSearchParams({
        tickers: `${ticker1},${ticker2}`,
        metrics: `${metric1},${metric2}`,
        period,
        basis,
        range,
      });

      const response = await fetch(
        `/api/fundamentals?${params.toString()}`
      );

      const result = await response.json();

      setSeries(result.series ?? []);
      setDimension(result.dimension ?? "");

      setLoading(false);
    }

    loadData();
  }, [
    ticker1,
    ticker2,
    metric1,
    metric2,
    period,
    basis,
    range,
  ]);

  const filteredTickers1 = useMemo(() => {
    const search = tickerSearch1.toUpperCase();

    return tickers
      .filter((t) => t.includes(search))
      .slice(0, 20);
  }, [tickers, tickerSearch1]);

  const filteredTickers2 = useMemo(() => {
    const search = tickerSearch2.toUpperCase();

    return tickers
      .filter((t) => t.includes(search))
      .slice(0, 20);
  }, [tickers, tickerSearch2]);

  const selectedMetric1 = useMemo(() => {
    return metrics.find((m) => m.value === metric1);
  }, [metrics, metric1]);

  const selectedMetric2 = useMemo(() => {
    return metrics.find((m) => m.value === metric2);
  }, [metrics, metric2]);

  function chooseTicker1(value: string) {
    setTicker1(value);
    setTickerSearch1(value);
  }

  function chooseTicker2(value: string) {
    setTicker2(value);
    setTickerSearch2(value);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-semibold">
            Financial Fundamentals
          </h1>

          <p className="text-slate-400 mt-2">
            Compare companies and financial metrics over time
          </p>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">

          {/* Company 1 */}
          <div className="relative">
            <label className="block text-xs text-slate-400 mb-2">
              Company 1
            </label>

            <input
              value={tickerSearch1}
              onChange={(e) =>
                setTickerSearch1(e.target.value.toUpperCase())
              }
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 w-40"
              placeholder="Search ticker"
            />

            {tickerSearch1 !== ticker1 &&
              filteredTickers1.length > 0 && (
                <div className="absolute z-20 mt-1 w-40 max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
                  {filteredTickers1.map((t) => (
                    <button
                      key={t}
                      onClick={() => chooseTicker1(t)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-800"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
          </div>

          {/* Company 2 */}
          <div className="relative">
            <label className="block text-xs text-slate-400 mb-2">
              Compare With
            </label>

            <input
              value={tickerSearch2}
              onChange={(e) =>
                setTickerSearch2(e.target.value.toUpperCase())
              }
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 w-40"
              placeholder="Search ticker"
            />

            {tickerSearch2 !== ticker2 &&
              filteredTickers2.length > 0 && (
                <div className="absolute z-20 mt-1 w-40 max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
                  {filteredTickers2.map((t) => (
                    <button
                      key={t}
                      onClick={() => chooseTicker2(t)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-800"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
          </div>

          {/* Metric 1 */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">
              Metric 1
            </label>

            <select
              value={metric1}
              onChange={(e) => setMetric1(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 min-w-56"
            >
              {metrics.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Metric 2 */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">
              Metric 2
            </label>

            <select
              value={metric2}
              onChange={(e) => setMetric2(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 min-w-56"
            >
              {metrics.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">
              Period
            </label>

            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2"
            >
              <option value="Annual">Annual</option>
              <option value="Quarterly">Quarterly</option>
              <option value="TTM">TTM</option>
            </select>
          </div>

          {/* Data Basis */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">
              Data Basis
            </label>

            <select
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
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

        {/* Range */}
        <div className="flex gap-2 mb-6">
          {["1Y", "3Y", "5Y", "10Y", "MAX"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg border ${
                range === r
                  ? "bg-white text-black border-white"
                  : "bg-slate-900 border-slate-700 text-slate-300"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Chart layout */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setChartLayout("combined")}
            className={`px-4 py-2 rounded-lg border ${
              chartLayout === "combined"
                ? "bg-white text-black border-white"
                : "bg-slate-900 border-slate-700 text-slate-300"
            }`}
          >
            Combined
          </button>

          <button
            onClick={() => setChartLayout("separate")}
            className={`px-4 py-2 rounded-lg border ${
              chartLayout === "separate"
                ? "bg-white text-black border-white"
                : "bg-slate-900 border-slate-700 text-slate-300"
            }`}
          >
            Separate by Company
          </button>
        </div>

        <div className="mb-4 text-sm text-slate-500">
          {ticker1} vs {ticker2} · {dimension}
          {selectedMetric1 && ` · ${selectedMetric1.label}`}
          {selectedMetric2 && ` + ${selectedMetric2.label}`}
        </div>

        {loading ? (
          <div className="text-slate-400">
            Loading data...
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
