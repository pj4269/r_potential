import FinancialDashboard from "../components/FinancialDashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="h-16 border-b border-slate-800 flex items-center px-6">
        <div>
          <h1 className="text-xl font-semibold">
            Financial Chart Creator
          </h1>

          <p className="text-xs text-slate-500">
            Fundamentals · Market Data · Returns
          </p>
        </div>
      </header>

      <div className="w-full">
        <FinancialDashboard />
      </div>
    </main>
  );
}
