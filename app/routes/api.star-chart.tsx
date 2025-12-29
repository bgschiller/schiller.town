import type { LoaderFunctionArgs, ActionFunctionArgs } from "partymix";
import { json } from "@remix-run/react";
import type { StarChart, StarChartExchange } from "~/../../party/star-chart";

// Hardcoded chart ID for now - can support multiple charts in the future
const CHART_ID = "everett-potty";

function getStorageUrl(request: Request, path: string = "") {
  const url = new URL(request.url);
  // In production, use the actual request host
  // In development (localhost or 127.0.0.1), use the local dev server
  const isProduction = url.hostname === "schiller.town";
  const host = isProduction
    ? `${url.protocol}//${url.host}`
    : "http://127.0.0.1:8787";
  return `${host}/parties/star-chart-server/default${path}`;
}

// GET /api/star-chart - fetch the chart state
export async function loader({ request }: LoaderFunctionArgs) {
  const storageUrl = getStorageUrl(request, `/storage-get/${CHART_ID}`);
  const response = await fetch(storageUrl);

  if (response.status === 404) {
    // Chart doesn't exist, create it
    const newChart: StarChart = {
      id: CHART_ID,
      type: "potty-training",
      title: "Everett's Potty Chart",
      totalSquares: 0,
      exchanges: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const putUrl = getStorageUrl(request, "/storage-put");
    await fetch(putUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newChart }),
    });

    return json(newChart);
  }

  if (!response.ok) {
    throw new Response("Failed to fetch star chart", { status: 500 });
  }

  const chart = await response.json();

  // Ensure chart has all required properties with defaults
  const validatedChart: StarChart = {
    id: chart.id || CHART_ID,
    type: chart.type || "potty-training",
    title: chart.title || "Everett's Potty Chart",
    totalSquares: chart.totalSquares || 0,
    exchanges: Array.isArray(chart.exchanges) ? chart.exchanges : [],
    createdAt: chart.createdAt || Date.now(),
    updatedAt: chart.updatedAt || Date.now(),
  };

  return json(validatedChart);
}

// POST /api/star-chart - handle actions (add, subtract, exchange)
export async function action({ request }: ActionFunctionArgs) {
  const body = (await request.json()) as { action: string; amount?: number };
  const { action, amount } = body;

  // Fetch current chart state
  const storageUrl = getStorageUrl(request, `/storage-get/${CHART_ID}`);
  const response = await fetch(storageUrl);

  let rawChart;

  if (response.status === 404) {
    // Chart doesn't exist, create it
    rawChart = {
      id: CHART_ID,
      type: "potty-training",
      title: "Everett's Potty Chart",
      totalSquares: 0,
      exchanges: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } else if (!response.ok) {
    return json({ error: "Failed to fetch star chart" }, { status: 500 });
  } else {
    rawChart = await response.json();
  }

  // Ensure chart has all required properties with defaults
  const chart: StarChart = {
    id: rawChart.id || CHART_ID,
    type: rawChart.type || "potty-training",
    title: rawChart.title || "Everett's Potty Chart",
    totalSquares: rawChart.totalSquares || 0,
    exchanges: Array.isArray(rawChart.exchanges) ? rawChart.exchanges : [],
    createdAt: rawChart.createdAt || Date.now(),
    updatedAt: rawChart.updatedAt || Date.now(),
  };

  // Calculate current active squares (total - exchanged)
  const totalExchanged = chart.exchanges.reduce(
    (sum, ex) => sum + ex.squaresExchanged,
    0
  );

  const activeSquares = chart.totalSquares - totalExchanged;

  // Handle different actions
  if (action === "add") {
    if (typeof amount !== "number" || amount <= 0) {
      return json({ error: "Invalid amount" }, { status: 400 });
    }

    chart.totalSquares += amount;
    chart.updatedAt = Date.now();
  } else if (action === "subtract") {
    // Only subtract from active squares
    if (activeSquares <= 0) {
      return json({ error: "No active squares to subtract" }, { status: 400 });
    }

    chart.totalSquares = Math.max(totalExchanged, chart.totalSquares - 1);
    chart.updatedAt = Date.now();
  } else if (action === "exchange") {
    // Validate we have at least 20 active squares
    if (activeSquares < 20) {
      return json(
        { error: "Need at least 20 active squares to exchange" },
        { status: 400 }
      );
    }

    // Calculate the square range for this exchange
    const startSquare = totalExchanged + 1;
    const endSquare = totalExchanged + 20;

    // Get current date in Pacific time (YYYY-MM-DD format)
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const usedDate = formatter.format(new Date()); // Returns YYYY-MM-DD

    const newExchange: StarChartExchange = {
      timestamp: Date.now(),
      squaresExchanged: 20,
      squareRange: [startSquare, endSquare],
      usedDate,
    };

    chart.exchanges.push(newExchange);
    chart.updatedAt = Date.now();
  } else {
    return json({ error: "Invalid action" }, { status: 400 });
  }

  // Save updated chart
  const putUrl = getStorageUrl(request, "/storage-put");
  const saveResponse = await fetch(putUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: chart }),
  });

  if (!saveResponse.ok) {
    return json({ error: "Failed to save chart" }, { status: 500 });
  }

  return json(chart);
}
