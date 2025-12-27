import type {
  LoaderFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "partymix";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { requireAuth } from "~/utils/session.server";
import { useEffect, useState } from "react";
import type { StarChart } from "~/../../party/star-chart";
import { getProvider } from "~/utils/collaboration.client";

export const meta: MetaFunction = () => {
  return [
    { title: "Everett's Star Chart" },
    { name: "description", content: "Potty training reward chart" },
  ];
};

export const loader: LoaderFunction = async function ({
  context,
  request,
}: LoaderFunctionArgs) {
  const userName = await requireAuth(
    request,
    context.env.SESSION_SECRET,
    "/star-chart"
  );
  return Response.json({ userName });
};

export default function StarChartPage() {
  useLoaderData<typeof loader>(); // Ensure auth is checked
  const fetcher = useFetcher();
  const [chart, setChart] = useState<StarChart | null>(null);
  const [totalSquares, setTotalSquares] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch initial chart state
  useEffect(() => {
    const fetchChart = async () => {
      try {
        let host = window.location.origin;
        if (host.includes("0.0.0.0")) {
          host = host.replace("0.0.0.0", "localhost");
        }
        const response = await fetch(`${host}/api/star-chart`);

        if (response.ok) {
          const chartData: StarChart = await response.json();
          setChart(chartData);
          setTotalSquares(chartData.totalSquares);
        }
      } catch (error) {
        console.error("Failed to fetch star chart:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, []);

  // Set up Yjs real-time sync for totalSquares
  useEffect(() => {
    if (!isClient || !chart) return;

    const provider = getProvider("everett-potty");
    if (!provider) return;

    const ydoc = provider.doc;
    const yTotalSquares = ydoc.getMap("everett-potty-total");

    // Initialize Yjs with current value if not set
    if (!yTotalSquares.has("value")) {
      yTotalSquares.set("value", chart.totalSquares);
    }

    // Subscribe to changes
    const observer = () => {
      const value = yTotalSquares.get("value") as number;
      if (typeof value === "number") {
        setTotalSquares(value);
      }
    };

    yTotalSquares.observe(observer);

    return () => {
      yTotalSquares.unobserve(observer);
    };
  }, [isClient, chart]);

  // Update Yjs when totalSquares changes from API
  useEffect(() => {
    if (!isClient || !chart) return;

    const provider = getProvider("everett-potty");
    if (!provider) return;

    const ydoc = provider.doc;
    const yTotalSquares = ydoc.getMap("everett-potty-total");

    // Only update if different to avoid loops
    const currentValue = yTotalSquares.get("value") as number;
    if (currentValue !== totalSquares) {
      yTotalSquares.set("value", totalSquares);
    }
  }, [totalSquares, isClient, chart]);

  // Refresh chart data after actions
  useEffect(() => {
    if (fetcher.data && fetcher.state === "idle") {
      const updatedChart = fetcher.data as StarChart;
      setChart(updatedChart);
      setTotalSquares(updatedChart.totalSquares);
    }
  }, [fetcher.data, fetcher.state]);

  const handleAdd = (amount: number) => {
    fetcher.submit(JSON.stringify({ action: "add", amount }), {
      method: "post",
      action: "/api/star-chart",
      encType: "application/json",
    });
  };

  const handleSubtract = () => {
    fetcher.submit(JSON.stringify({ action: "subtract" }), {
      method: "post",
      action: "/api/star-chart",
      encType: "application/json",
    });
  };

  const handleExchange = () => {
    if (!chart || !Array.isArray(chart.exchanges)) return;

    console.log("Chart line 151:", chart);
    const totalExchanged = chart.exchanges.reduce(
      (sum, ex) => sum + ex.squaresExchanged,
      0
    );
    const activeSquares = totalSquares - totalExchanged;

    if (activeSquares < 20) {
      alert("Need at least 20 squares to exchange for TV time!");
      return;
    }

    if (
      confirm(
        `Exchange 20 squares for 20 minutes of TV time?\n\nYou have ${activeSquares} active squares.`
      )
    ) {
      fetcher.submit(JSON.stringify({ action: "exchange" }), {
        method: "post",
        action: "/api/star-chart",
        encType: "application/json",
      });
    }
  };

  // Calculate which squares are exchanged
  const isSquareExchanged = (squareNum: number): boolean => {
    if (!chart || !Array.isArray(chart.exchanges)) return false;
    return chart.exchanges.some(
      (ex) => squareNum >= ex.squareRange[0] && squareNum <= ex.squareRange[1]
    );
  };

  // Calculate active squares for button states
  const totalExchanged =
    chart && Array.isArray(chart.exchanges)
      ? chart.exchanges.reduce((sum, ex) => sum + ex.squaresExchanged, 0)
      : 0;
  const activeSquares = totalSquares - totalExchanged;

  // Calculate number of rows to display (at least show 1 row)
  const numRows = Math.max(1, Math.ceil(totalSquares / 20));

  if (loading) {
    return (
      <div className="chart-container">
        <div className="loading">Loading star chart...</div>
      </div>
    );
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .chart-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem 1rem;
        }

        .chart-wrapper {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }

        .chart-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .chart-title {
          font-size: 2.5rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .chart-subtitle {
          font-size: 1.125rem;
          color: #666;
        }

        .stats-row {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 2rem;
          font-size: 1.125rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .stat-label {
          color: #666;
          font-size: 0.875rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #667eea;
        }

        .stat-value.active {
          color: #10b981;
        }

        .grid-container {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 0.5rem;
        }

        .grid-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .grid-row:last-child {
          margin-bottom: 0;
        }

        .squares-row {
          display: flex;
          gap: 0.25rem;
          flex: 1;
          flex-wrap: wrap;
          min-width: 0;
        }

        .square {
          /* Use flex-basis to make squares responsive */
          flex: 0 0 calc((100% - (19 * 0.25rem)) / 20);
          aspect-ratio: 1;
          min-width: 1.5rem;
          max-width: 2.5rem;
          border: 2px solid #d1d5db;
          border-radius: 0.375rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(0.75rem, 2vw, 1.25rem);
          transition: all 0.2s;
        }

        @media (max-width: 768px) {
          .square {
            flex: 0 0 calc((100% - (19 * 0.2rem)) / 20);
            min-width: 1rem;
          }

          .squares-row {
            gap: 0.2rem;
          }

          .grid-row {
            gap: 0.3rem;
          }
        }

        .square.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: #059669;
          color: white;
          font-weight: 700;
        }

        .square.exchanged {
          background: #e5e7eb;
          border-color: #9ca3af;
          color: #9ca3af;
          position: relative;
        }

        .square.exchanged::after {
          content: '✓';
          position: absolute;
          font-size: clamp(0.875rem, 2.5vw, 1.5rem);
        }

        .square.empty {
          background: white;
          border-color: #e5e7eb;
        }

        .row-star {
          font-size: clamp(1.25rem, 3vw, 1.75rem);
          flex-shrink: 0;
        }

        .buttons-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        @media (min-width: 640px) {
          .buttons-container {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .action-button {
          padding: 1.5rem 1rem;
          font-size: 1.25rem;
          font-weight: 700;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-button:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
        }

        .action-button:not(:disabled):active {
          transform: translateY(0);
        }

        .btn-add-one {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }

        .btn-add-ten {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
        }

        .btn-subtract {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        .btn-exchange {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #78350f;
          font-size: 1.5rem;
        }

        .loading {
          text-align: center;
          padding: 4rem;
          color: white;
          font-size: 1.5rem;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          text-decoration: none;
          font-weight: 600;
          margin-bottom: 1rem;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          transition: background 0.2s;
        }

        .back-link:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `,
        }}
      />

      <div className="chart-container">
        <a href="/" className="back-link">
          ← Back to Home
        </a>

        <div className="chart-wrapper">
          <div className="chart-header">
            <h1 className="chart-title">🎉 {chart?.title}</h1>
            <p className="chart-subtitle">
              Earn squares for potty success, trade for TV time!
            </p>
          </div>

          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-label">Total Squares</span>
              <span className="stat-value">{totalSquares}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Squares</span>
              <span className="stat-value active">{activeSquares}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">TV Time Earned</span>
              <span className="stat-value">
                {chart && Array.isArray(chart.exchanges)
                  ? chart.exchanges.length * 20
                  : 0}{" "}
                min
              </span>
            </div>
          </div>

          <div className="grid-container">
            {Array.from({ length: numRows }, (_, rowIndex) => {
              // Check if entire row is exchanged (all 20 squares in this row)
              const rowStartSquare = rowIndex * 20 + 1;
              const allSquaresExchanged = Array.from(
                { length: 20 },
                (_, i) => rowStartSquare + i
              ).every((squareNum) => isSquareExchanged(squareNum));

              return (
                <div key={rowIndex} className="grid-row">
                  <div className="squares-row">
                    {Array.from({ length: 20 }, (_, colIndex) => {
                      const squareNum = rowIndex * 20 + colIndex + 1;
                      const isExchanged = isSquareExchanged(squareNum);
                      const isActive =
                        squareNum <= totalSquares && !isExchanged;

                      return (
                        <div
                          key={colIndex}
                          className={`square ${
                            isExchanged
                              ? "exchanged"
                              : isActive
                              ? "active"
                              : "empty"
                          }`}
                        >
                          {isActive && "■"}
                        </div>
                      );
                    })}
                  </div>
                  <span className="row-star">
                    {allSquaresExchanged ? "⭐" : "☆"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="buttons-container">
            <button
              className="action-button btn-add-one"
              onClick={() => handleAdd(1)}
              disabled={fetcher.state !== "idle"}
            >
              +1
            </button>
            <button
              className="action-button btn-add-ten"
              onClick={() => handleAdd(10)}
              disabled={fetcher.state !== "idle"}
            >
              +10
            </button>
            <button
              className="action-button btn-subtract"
              onClick={handleSubtract}
              disabled={fetcher.state !== "idle" || activeSquares <= 0}
            >
              -1
            </button>
            <button
              className="action-button btn-exchange"
              onClick={handleExchange}
              disabled={fetcher.state !== "idle" || activeSquares < 20}
            >
              ⭐ TV Time
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
