export type MetricFormat =
  | "currency"
  | "currencyPerShare"
  | "number"
  | "percent"
  | "ratio"
  | "shares";

export type Metric = {
  label: string;
  value: string;
  format: MetricFormat;
};

export const metrics: Metric[] = [
  { label: "Accumulated OCI", value: "accoci", format: "currency" },

  { label: "Assets", value: "assets", format: "currency" },
  { label: "Average Assets", value: "assetsavg", format: "currency" },
  { label: "Current Assets", value: "assetsc", format: "currency" },
  { label: "Non-Current Assets", value: "assetsnc", format: "currency" },
  { label: "Asset Turnover", value: "assetturnover", format: "ratio" },

  { label: "Book Value Per Share", value: "bvps", format: "currencyPerShare" },

  { label: "Capital Expenditures", value: "capex", format: "currency" },

  { label: "Cash & Equivalents", value: "cashneq", format: "currency" },
  { label: "Cash & Equivalents USD", value: "cashnequsd", format: "currency" },

  { label: "Cost of Revenue", value: "cor", format: "currency" },
  { label: "Consolidated Income", value: "consolinc", format: "currency" },

  { label: "Current Ratio", value: "currentratio", format: "ratio" },

  { label: "Debt / Equity", value: "de", format: "ratio" },
  { label: "Debt", value: "debt", format: "currency" },
  { label: "Current Debt", value: "debtc", format: "currency" },
  { label: "Non-Current Debt", value: "debtnc", format: "currency" },
  { label: "Debt USD", value: "debtusd", format: "currency" },

  { label: "Deferred Revenue", value: "deferredrev", format: "currency" },
  { label: "Depreciation & Amortization", value: "depamor", format: "currency" },
  { label: "Deposits", value: "deposits", format: "currency" },

  { label: "Dividend Yield", value: "divyield", format: "percent" },
  { label: "Dividend Per Share", value: "dps", format: "currencyPerShare" },

  { label: "EBIT", value: "ebit", format: "currency" },
  { label: "EBITDA", value: "ebitda", format: "currency" },
  { label: "EBITDA Margin", value: "ebitdamargin", format: "percent" },
  { label: "EBITDA USD", value: "ebitdausd", format: "currency" },
  { label: "EBIT USD", value: "ebitusd", format: "currency" },

  { label: "Earnings Before Tax", value: "ebt", format: "currency" },

  { label: "EPS", value: "eps", format: "currencyPerShare" },
  { label: "Diluted EPS", value: "epsdil", format: "currencyPerShare" },
  { label: "EPS USD", value: "epsusd", format: "currencyPerShare" },

  { label: "Equity", value: "equity", format: "currency" },
  { label: "Average Equity", value: "equityavg", format: "currency" },
  { label: "Equity USD", value: "equityusd", format: "currency" },

  { label: "Enterprise Value", value: "ev", format: "currency" },
  { label: "EV / EBIT", value: "evebit", format: "ratio" },
  { label: "EV / EBITDA", value: "evebitda", format: "ratio" },

  { label: "Free Cash Flow", value: "fcf", format: "currency" },
  { label: "Free Cash Flow Per Share", value: "fcfps", format: "currencyPerShare" },

  { label: "FX Rate to USD", value: "fxusd", format: "ratio" },

  { label: "Gross Profit", value: "gp", format: "currency" },
  { label: "Gross Margin", value: "grossmargin", format: "percent" },

  { label: "Intangible Assets", value: "intangibles", format: "currency" },
  { label: "Interest Expense", value: "intexp", format: "currency" },

  { label: "Invested Capital", value: "invcap", format: "currency" },
  { label: "Average Invested Capital", value: "invcapavg", format: "currency" },

  { label: "Inventory", value: "inventory", format: "currency" },

  { label: "Investments", value: "investments", format: "currency" },
  { label: "Current Investments", value: "investmentsc", format: "currency" },
  { label: "Non-Current Investments", value: "investmentsnc", format: "currency" },

  { label: "Liabilities", value: "liabilities", format: "currency" },
  { label: "Current Liabilities", value: "liabilitiesc", format: "currency" },
  { label: "Non-Current Liabilities", value: "liabilitiesnc", format: "currency" },

  { label: "Market Cap", value: "marketcap", format: "currency" },

  { label: "Net Change in Cash", value: "ncf", format: "currency" },
  { label: "Cash Flow from Business Acquisitions", value: "ncfbus", format: "currency" },
  { label: "Cash Flow from Common Stock", value: "ncfcommon", format: "currency" },
  { label: "Cash Flow from Debt", value: "ncfdebt", format: "currency" },
  { label: "Dividends Paid", value: "ncfdiv", format: "currency" },

  { label: "Financing Cash Flow", value: "ncff", format: "currency" },
  { label: "Investing Cash Flow", value: "ncfi", format: "currency" },
  { label: "Investment Purchases / Sales", value: "ncfinv", format: "currency" },
  { label: "Operating Cash Flow", value: "ncfo", format: "currency" },
  { label: "FX Effect on Cash", value: "ncfx", format: "currency" },

  { label: "Net Income", value: "netinc", format: "currency" },
  { label: "Net Income - Common", value: "netinccmn", format: "currency" },
  { label: "Net Income - Common USD", value: "netinccmnusd", format: "currency" },
  { label: "Net Income - Discontinued Operations", value: "netincdis", format: "currency" },
  { label: "Net Income - Noncontrolling Interest", value: "netincnci", format: "currency" },

  { label: "Net Margin", value: "netmargin", format: "percent" },

  { label: "Operating Expenses", value: "opex", format: "currency" },
  { label: "Operating Income", value: "opinc", format: "currency" },

  { label: "Accounts Payable", value: "payables", format: "currency" },

  { label: "Payout Ratio", value: "payoutratio", format: "percent" },

  { label: "Price / Book", value: "pb", format: "ratio" },
  { label: "P/E", value: "pe", format: "ratio" },
  { label: "P/E (Alternate)", value: "pe1", format: "ratio" },

  { label: "Net PP&E", value: "ppnenet", format: "currency" },

  { label: "Preferred Dividends", value: "prefdivis", format: "currency" },

  { label: "Price", value: "price", format: "currencyPerShare" },

  { label: "Price / Sales", value: "ps", format: "ratio" },
  { label: "Price / Sales (Alternate)", value: "ps1", format: "ratio" },

  { label: "Accounts Receivable", value: "receivables", format: "currency" },
  { label: "Retained Earnings", value: "retearn", format: "currency" },

  { label: "Revenue", value: "revenue", format: "currency" },
  { label: "Revenue USD", value: "revenueusd", format: "currency" },

  { label: "R&D Expense", value: "rnd", format: "currency" },

  { label: "Return on Assets", value: "roa", format: "percent" },
  { label: "Return on Equity", value: "roe", format: "percent" },
  { label: "Return on Invested Capital", value: "roic", format: "percent" },
  { label: "Return on Sales", value: "ros", format: "percent" },

  { label: "Stock-Based Compensation", value: "sbcomp", format: "currency" },
  { label: "SG&A Expense", value: "sgna", format: "currency" },

  { label: "Share Factor", value: "sharefactor", format: "ratio" },

  { label: "Basic Shares Outstanding", value: "sharesbas", format: "shares" },
  { label: "Weighted Average Shares", value: "shareswa", format: "shares" },
  { label: "Diluted Weighted Average Shares", value: "shareswadil", format: "shares" },

  { label: "Sales Per Share", value: "sps", format: "currencyPerShare" },

  { label: "Tangible Assets", value: "tangibles", format: "currency" },

  { label: "Tax Assets", value: "taxassets", format: "currency" },
  { label: "Tax Expense", value: "taxexp", format: "currency" },
  { label: "Tax Liabilities", value: "taxliabilities", format: "currency" },

  { label: "Tangible Book Value Per Share", value: "tbvps", format: "currencyPerShare" },

  { label: "Working Capital", value: "workingcapital", format: "currency" },
];

export const metricMap = Object.fromEntries(
  metrics.map((metric) => [metric.value, metric])
);
