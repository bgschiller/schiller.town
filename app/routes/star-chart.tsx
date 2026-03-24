import type { LoaderFunction, MetaFunction, LinksFunction } from "partymix";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { authenticateLoader } from "~/utils/session.server";
import { getApiUrl } from "~/utils/api.client";
import { useEffect, useState } from "react";
import type { StarChart } from "~/../../party/star-chart";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: "/styles/star-chart.css" },
];

export const meta: MetaFunction = () => {
  return [
    { title: "Everett's Star Chart" },
    { name: "description", content: "Potty training reward chart" },
  ];
};

export const loader: LoaderFunction = async function (args) {
  const userName = await authenticateLoader(args);
  return Response.json({ userName });
};

export default function StarChartPage() {
  useLoaderData<typeof loader>(); // Ensure auth is checked
  const fetcher = useFetcher();
  const [chart, setChart] = useState<StarChart | null>(null);
  const [totalSquares, setTotalSquares] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch initial chart state
  useEffect(() => {
    const fetchChart = async () => {
      try {
        const response = await fetch(getApiUrl("/api/star-chart"));

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
              <span className="stat-label">Available Squares</span>
              <span className="stat-value active">{activeSquares}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Available TV</span>
              <span className="stat-value">
                {Math.floor(activeSquares / 20) * 20} min
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">TV Used Today</span>
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
              const rowStartSquare = rowIndex * 20 + 1;
              const rowEndSquare = rowIndex * 20 + 20;
              const rowSquares = Array.from(
                { length: 20 },
                (_, i) => rowStartSquare + i
              );
              const allExchanged = rowSquares.every((sq) =>
                isSquareExchanged(sq)
              );
              const allActiveAndFull =
                rowEndSquare <= totalSquares &&
                rowSquares.every((sq) => !isSquareExchanged(sq));

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
                    {allExchanged ? "" : allActiveAndFull ? "⭐" : "☆"}
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
